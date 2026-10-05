-- Lengua de Señas Panameña (LSP) — simplified schema and migration
--
-- Run this file once in Supabase > SQL Editor. It is safe to run again.
-- The application keeps only:
--   1. auth.users            (managed by Supabase Auth)
--   2. public.practices      (teacher reference videos and landmark sequences)
--   3. public.practice_attempts (student DTW results)
--

begin;

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- 1. Preserve the useful data from the tables that are being retired.
-- ---------------------------------------------------------------------------

-- Move profile values into Supabase Auth user metadata. These values are for
-- display only; never use user_metadata to authorize a user.
do $$
begin
  if to_regclass('public.profiles') is not null then
    update auth.users as users
    set raw_user_meta_data = coalesce(users.raw_user_meta_data, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
        'display_name', profiles.display_name,
        'avatar_url', profiles.avatar_url,
        'bio', profiles.bio
      ))
    from public.profiles as profiles
    where profiles.user_id = users.id;
  end if;
end
$$;

-- Move authorization roles into protected app_metadata. If an old account has
-- more than one role, keep the most privileged one.
do $$
begin
  if to_regclass('public.user_roles') is not null then
    update auth.users as users
    set raw_app_meta_data = jsonb_set(
      coalesce(users.raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(roles.role),
      true
    )
    from (
      select user_id,
        case
          when bool_or(role = 'admin') then 'admin'
          when bool_or(role = 'teacher') then 'teacher'
          else 'student'
        end as role
      from public.user_roles
      group by user_id
    ) as roles
    where roles.user_id = users.id
      and nullif(users.raw_app_meta_data ->> 'role', '') is null;
  end if;
end
$$;

-- Existing accounts without an assigned role are students by default.
update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"student"'::jsonb,
  true
)
where nullif(raw_app_meta_data ->> 'role', '') is null;

-- ---------------------------------------------------------------------------
-- 2. Remove obsolete automation, policies, and stored tables.
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop trigger if exists profiles_set_updated_at on public.profiles';
  end if;
  if to_regclass('public.practice_attempts') is not null then
    execute 'drop trigger if exists practice_attempts_refresh_progress on public.practice_attempts';
  end if;
end
$$;

-- Policies on retained tables may depend on an old role helper, so remove them
-- before replacing that function.
do $$
declare policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('practices', 'practice_attempts')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

drop table if exists public.favorite_practices cascade;
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'practice_progress'
      and c.relkind in ('v', 'm')
  ) then
    execute 'drop view public.practice_progress cascade';
  elsif to_regclass('public.practice_progress') is not null then
    execute 'drop table public.practice_progress cascade';
  end if;
end
$$;
drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade;

drop function if exists private.handle_new_user() cascade;
drop function if exists private.refresh_practice_progress() cascade;
drop function if exists private.has_role(uuid, text) cascade;
drop function if exists private.builder_has_any_role(text[]) cascade;

-- ---------------------------------------------------------------------------
-- 3. Create or update the two application tables.
-- ---------------------------------------------------------------------------

-- @builder-access public_read
create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  media_url text,
  mediapipe_reference jsonb,
  published boolean not null default false,
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  source text not null default 'teacher' check (source in ('system', 'teacher')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practices_source_owner_check check (
    source = 'system' or created_by is not null
  )
);

-- Compatibility additions let this migration upgrade an older generated table.
alter table public.practices add column if not exists created_by uuid;
alter table public.practices add column if not exists title text;
alter table public.practices add column if not exists description text;
alter table public.practices add column if not exists media_url text;
alter table public.practices add column if not exists mediapipe_reference jsonb;
alter table public.practices add column if not exists published boolean not null default false;
alter table public.practices add column if not exists difficulty integer not null default 1;
alter table public.practices add column if not exists estimated_minutes integer;
alter table public.practices add column if not exists source text not null default 'teacher';
alter table public.practices add column if not exists sort_order integer not null default 0;
alter table public.practices add column if not exists created_at timestamptz not null default now();
alter table public.practices add column if not exists updated_at timestamptz not null default now();

-- @builder-access user_owned
create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_id uuid not null references public.practices(id) on delete cascade,
  score numeric check (score is null or score between 0 and 100),
  feedback text,
  mediapipe_result jsonb,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now()
);

alter table public.practice_attempts add column if not exists user_id uuid;
alter table public.practice_attempts add column if not exists practice_id uuid;
alter table public.practice_attempts add column if not exists score numeric;
alter table public.practice_attempts add column if not exists feedback text;
alter table public.practice_attempts add column if not exists mediapipe_result jsonb;
alter table public.practice_attempts add column if not exists duration_seconds integer;
alter table public.practice_attempts add column if not exists created_at timestamptz not null default now();

-- The UI may hide feedback for now, but the builder's generic motion saver still
-- supports this optional summary field.

-- Add foreign keys missing from older generated versions without duplicating
-- constraints that already exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.practices'::regclass
      and contype = 'f'
      and conname = 'practices_created_by_fkey'
  ) then
    alter table public.practices
      add constraint practices_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.practice_attempts'::regclass
      and contype = 'f'
      and conname = 'practice_attempts_user_id_fkey'
  ) then
    alter table public.practice_attempts
      add constraint practice_attempts_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.practice_attempts'::regclass
      and contype = 'f'
      and conname = 'practice_attempts_practice_id_fkey'
  ) then
    alter table public.practice_attempts
      add constraint practice_attempts_practice_id_fkey
      foreign key (practice_id) references public.practices(id) on delete cascade;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Role helper, timestamps, RLS, and least-privilege grants.
-- ---------------------------------------------------------------------------

create or replace function private.current_user_has_any_role(required_roles text[])
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', 'student')
    = any(required_roles)
    or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', 'student') = 'admin';
$$;

revoke all on function private.current_user_has_any_role(text[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_user_has_any_role(text[]) to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

drop trigger if exists practices_set_updated_at on public.practices;
create trigger practices_set_updated_at
before update on public.practices
for each row execute function private.set_updated_at();

alter table public.practices enable row level security;
alter table public.practice_attempts enable row level security;

create policy practices_public_read on public.practices
for select to anon, authenticated
using (published = true);

create policy practices_teacher_read_own on public.practices
for select to authenticated
using (
  created_by = (select auth.uid())
  and private.current_user_has_any_role(array['teacher'])
);

create policy practices_teacher_insert on public.practices
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and source = 'teacher'
  and private.current_user_has_any_role(array['teacher'])
);

create policy practices_teacher_update on public.practices
for update to authenticated
using (
  created_by = (select auth.uid())
  and private.current_user_has_any_role(array['teacher'])
)
with check (
  created_by = (select auth.uid())
  and source = 'teacher'
  and private.current_user_has_any_role(array['teacher'])
);

create policy practices_teacher_delete on public.practices
for delete to authenticated
using (
  created_by = (select auth.uid())
  and private.current_user_has_any_role(array['teacher'])
);

create policy practice_attempts_read_own on public.practice_attempts
for select to authenticated
using ((select auth.uid()) = user_id);

create policy practice_attempts_insert_own on public.practice_attempts
for insert to authenticated
with check ((select auth.uid()) = user_id);

-- Reference videos stay private; guests may sign only objects that belong to a
-- published practice, while teachers retain access to their own drafts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'practice-reference-videos',
  'practice-reference-videos',
  false,
  104857600,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists practice_reference_videos_read on storage.objects;
drop policy if exists practice_reference_videos_read_own on storage.objects;
drop policy if exists practice_reference_videos_insert on storage.objects;
drop policy if exists practice_reference_videos_update on storage.objects;
drop policy if exists practice_reference_videos_delete on storage.objects;

create policy practice_reference_videos_read
on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'practice-reference-videos'
  and exists (
    select 1
    from public.practices as practice
    where practice.id::text = (storage.foldername(name))[2]
      and practice.published = true
  )
);

create policy practice_reference_videos_read_own
on storage.objects
for select to authenticated
using (
  bucket_id = 'practice-reference-videos'
  and exists (
    select 1
    from public.practices as practice
    where practice.id::text = (storage.foldername(name))[2]
      and practice.created_by = (select auth.uid())
      and private.current_user_has_any_role(array['teacher'])
  )
);

create policy practice_reference_videos_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'practice-reference-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists (
    select 1
    from public.practices as practice
    where practice.id::text = (storage.foldername(name))[2]
      and practice.created_by = (select auth.uid())
      and private.current_user_has_any_role(array['teacher'])
  )
);

create policy practice_reference_videos_update
on storage.objects
for update to authenticated
using (
  bucket_id = 'practice-reference-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists (
    select 1
    from public.practices as practice
    where practice.id::text = (storage.foldername(name))[2]
      and practice.created_by = (select auth.uid())
      and private.current_user_has_any_role(array['teacher'])
  )
)
with check (
  bucket_id = 'practice-reference-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists (
    select 1
    from public.practices as practice
    where practice.id::text = (storage.foldername(name))[2]
      and practice.created_by = (select auth.uid())
      and private.current_user_has_any_role(array['teacher'])
  )
);

create policy practice_reference_videos_delete
on storage.objects
for delete to authenticated
using (
  bucket_id = 'practice-reference-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists (
    select 1
    from public.practices as practice
    where practice.id::text = (storage.foldername(name))[2]
      and practice.created_by = (select auth.uid())
      and private.current_user_has_any_role(array['teacher'])
  )
);
-- End reference video policies.

revoke all on table public.practices from anon, authenticated;
grant select on table public.practices to anon, authenticated;
grant insert, update, delete on table public.practices to authenticated;

revoke all on table public.practice_attempts from anon, authenticated;
grant select, insert on table public.practice_attempts to authenticated;

-- Attempts are immutable history. Any progress summary can be calculated from
-- practice_attempts in application code when it is actually needed.

create index if not exists practices_published_sort_idx
on public.practices (published, sort_order);
create index if not exists practices_created_by_idx
on public.practices (created_by);
create index if not exists practice_attempts_user_recent_idx
on public.practice_attempts (user_id, created_at desc);
create index if not exists practice_attempts_practice_idx
on public.practice_attempts (practice_id);
create index if not exists practice_attempts_user_practice_score_idx
on public.practice_attempts (user_id, practice_id, score desc);

commit;

-- Assign teachers/admins from a trusted server or the Supabase SQL Editor:
-- update auth.users
-- set raw_app_meta_data = jsonb_set(
--   coalesce(raw_app_meta_data, '{}'::jsonb),
--   '{role}', '"teacher"'::jsonb, true
-- )
-- where email = 'teacher@example.com';
