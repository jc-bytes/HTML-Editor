import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  appliedSupabaseSchema,
  createSupabaseMigrationSql,
  createSupabaseSetupSql,
  describeSupabaseSchemaChanges,
  isSafePublishableKey,
  importSupabaseSchemaSql,
  normalizedSupabaseConfig,
  relatedDataFields,
  relationAlias,
  relationDisplayField,
  verifySupabaseTable,
} from './supabase-data'
import type { SupabaseEditorConfig } from './supabase-data'

const config: SupabaseEditorConfig = {
  projectUrl: 'https://school.supabase.co/',
  publishableKey: 'sb_publishable_test_key_123456789',
  tables: [{
    id: 'practices',
    name: 'Practice Items',
    access: 'public_read',
    fields: [
      { id: 'one', name: 'Title', type: 'text' },
      { id: 'two', name: 'Media URL', type: 'media' },
    ],
    relations: [],
  }, {
    id: 'progress',
    name: 'progress',
    access: 'user_owned',
    fields: [
      { id: 'practice-id', name: 'practice_id', type: 'uuid' },
      { id: 'score', name: 'score', type: 'number' },
    ],
    relations: [{
      id: 'progress-practice',
      column: 'practice_id',
      targetTableId: 'practices',
      targetColumn: 'id',
      onDelete: 'cascade',
    }],
  }],
}

describe('Supabase editor data helpers', () => {
  it('generates multiple tables, relationships, indexes, and access-specific RLS', () => {
    const sql = createSupabaseSetupSql(config)

    expect(sql).toContain('create table if not exists public."practice_items"')
    expect(sql).toContain('create table if not exists public."progress"')
    expect(sql).toContain('add column if not exists "title" text')
    expect(sql).toContain('using (published = true)')
    expect(sql).toContain('user_id uuid not null references auth.users(id)')
    expect(sql).toContain('auth.uid()) = user_id')
    expect(sql).toContain('foreign key ("practice_id")')
    expect(sql).toContain('references public."practice_items" ("id")')
  })

  it('describes safe related fields using the connected collection', () => {
    const progress = config.tables[1]
    const relation = progress.relations[0]

    expect(relationAlias(relation)).toBe('related_practice_id')
    expect(relationDisplayField(config, relation)).toBe('title')
    expect(relatedDataFields(config, progress)).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'related_practice_id.title', type: 'text' }),
      expect.objectContaining({ name: 'related_practice_id.media_url', type: 'media' }),
    ]))
  })

  it('does not generate a database migration when only the visible relation label changes', () => {
    const table = normalizedSupabaseConfig(config).tables[1]
    const withVerified = {
      ...config,
      tables: config.tables.map((candidate) => candidate.id === table.id ? {
        ...table,
        verifiedSchema: appliedSupabaseSchema(table),
        relations: table.relations.map((relation) => ({ ...relation, displayField: 'title' })),
      } : candidate),
    }

    expect(describeSupabaseSchemaChanges(withVerified, table.id)).toEqual([])
  })

  it('creates a unique owner rule for one-record-per-person collections', () => {
    const singleton = {
      ...config,
      tables: [{
        ...config.tables[1],
        name: 'profiles',
        recordMode: 'single_per_user' as const,
      }],
    }
    const sql = createSupabaseSetupSql(singleton)

    expect(sql).toContain('-- @builder-record-mode single_per_user')
    expect(sql).toContain('create unique index if not exists "profiles_user_id_unique"')
    expect(normalizedSupabaseConfig(singleton).tables[0].recordMode).toBe('single_per_user')
  })

  it('creates a protected Storage bucket for upload fields', () => {
    const uploads: SupabaseEditorConfig = {
      ...config,
      tables: [{
        ...config.tables[1],
        name: 'profiles',
        fields: [{
          id: 'avatar', name: 'avatar', type: 'media',
          upload: { bucket: 'profile_images', kind: 'image', maxSizeMb: 4, visibility: 'private' },
        }],
      }],
    }
    const sql = createSupabaseSetupSql(uploads)

    expect(sql).toContain('insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)')
    expect(sql).toContain("values ('profile_images', 'profile_images', false, 4194304, array['image/*']::text[])")
    expect(sql).toContain('create policy "builder_profile_images_insert" on storage.objects')
    expect(sql).toContain('(storage.foldername(name))[1] = (select auth.uid()::text)')
    expect(sql).toContain('create policy "builder_profile_images_delete" on storage.objects')
  })

  it('generates secure role-based management policies without self-assigned roles', () => {
    const managed: SupabaseEditorConfig = {
      ...config,
      tables: [{
        id: 'roles', name: 'user_roles', access: 'user_owned', recordMode: 'multiple',
        fields: [{ id: 'role', name: 'role', type: 'text' }], relations: [],
        management: { roles: ['admin'], actions: ['select', 'insert', 'update', 'delete'] },
      }, {
        ...config.tables[0],
        name: 'articles',
        management: { roles: ['admin', 'editor'], actions: ['select', 'update', 'delete'] },
      }],
    }
    const sql = createSupabaseSetupSql(managed)
    const rolePolicies = sql.slice(sql.indexOf('-- Table: user_roles'), sql.indexOf('-- Table: articles'))

    expect(sql).toContain('function private.builder_has_any_role(required_roles text[])')
    expect(sql).toContain("security definer\nset search_path = ''")
    expect(sql).toContain("array['admin', 'editor']::text[]")
    expect(sql).toContain('articles_manager_update')
    expect(rolePolicies).toContain('user_roles_own_select')
    expect(rolePolicies).not.toContain('create policy "user_roles_own_insert"')
    expect(rolePolicies).toContain('user_roles_manager_insert')
  })

  it('normalizes duplicate table and field identifiers', () => {
    const normalized = normalizedSupabaseConfig({
      ...config,
      tables: [config.tables[0], { ...config.tables[0], id: 'duplicate' }],
    })
    expect(normalized.tables).toHaveLength(1)
    expect(normalized.tables[0].name).toBe('practice_items')
  })

  it('repairs incomplete saved collection data instead of crashing the editor', () => {
    const normalized = normalizedSupabaseConfig({
      projectUrl: undefined,
      publishableKey: undefined,
      tables: [{ id: 'existing', name: 'Existing Items', access: 'public_read' }],
    } as unknown as SupabaseEditorConfig)

    expect(normalized).toEqual(expect.objectContaining({
      projectUrl: '',
      publishableKey: '',
      tables: [expect.objectContaining({
        id: 'existing',
        name: 'existing_items',
        fields: [],
        relations: [],
      })],
    }))
  })

  it('rejects secret keys and accepts current publishable keys', () => {
    expect(isSafePublishableKey('sb_publishable_1234567890')).toBe(true)
    expect(isSafePublishableKey('sb_secret_1234567890')).toBe(false)
    const jwtKey = (role: string) => `header.${btoa(JSON.stringify({ role }))}.signature-padding-1234567890`
    expect(isSafePublishableKey(jwtKey('anon'))).toBe(true)
    expect(isSafePublishableKey(jwtKey('service_role'))).toBe(false)
  })

  it('verifies one public table and all declared columns through the Data API', async () => {
    const request = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }))
    await expect(verifySupabaseTable(config, 'practices', request)).resolves.toEqual({ hasRows: false })

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/practice_items?'),
      { headers: { apikey: config.publishableKey } },
    )
    expect(request.mock.calls[0][0]).toContain('select=id%2Cpublished%2Csort_order%2Ccreated_at%2Ctitle%2Cmedia_url')
  })

  it('does not pretend user-owned tables can be verified without authentication', async () => {
    await expect(verifySupabaseTable(config, 'progress', vi.fn()))
      .rejects.toThrow('Inicia sesión')
  })

  it('verifies user-owned collections with the signed-in access token', async () => {
    const request = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }))
    await expect(verifySupabaseTable(config, 'progress', request, 'student-token')).resolves.toEqual({ hasRows: false })

    expect(request).toHaveBeenCalledWith(expect.stringContaining('/rest/v1/progress?'), {
      headers: { apikey: config.publishableKey, Authorization: 'Bearer student-token' },
    })
  })

  it('generates ALTER TABLE changes from the last verified schema', () => {
    const original = normalizedSupabaseConfig(config).tables[0]
    const verified = appliedSupabaseSchema(original)
    const changed: SupabaseEditorConfig = {
      ...config,
      tables: [{
        ...original,
        name: 'practice_library',
        setupStatus: 'needs_installation',
        verifiedSchema: verified,
        fields: [
          { ...original.fields[0], name: 'practice_title' },
          original.fields[1],
          { id: 'difficulty', name: 'difficulty', type: 'number' },
        ],
      }],
    }

    const sql = createSupabaseMigrationSql(changed, original.id)

    expect(sql).toContain('rename to "practice_library"')
    expect(sql).toContain('rename column "title" to "practice_title"')
    expect(sql).toContain('add column "difficulty" numeric')
    expect(sql).not.toContain('create table if not exists')
  })

  it('labels drops and type conversions as destructive changes', () => {
    const original = normalizedSupabaseConfig(config).tables[0]
    const changed: SupabaseEditorConfig = {
      ...config,
      tables: [{
        ...original,
        verifiedSchema: appliedSupabaseSchema(original),
        fields: [{ ...original.fields[0], type: 'date' }],
      }],
    }

    const changes = describeSupabaseSchemaChanges(changed, original.id)

    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'type-field:one', destructive: true }),
      expect.objectContaining({ id: 'drop-field:two', destructive: true }),
    ]))
    expect(createSupabaseMigrationSql(changed, original.id)).toContain('-- WARNING:')
  })

  it('uses the full table creation for a table without an applied baseline', () => {
    const changes = describeSupabaseSchemaChanges(config, 'practices')
    expect(changes).toHaveLength(1)
    expect(changes[0]).toEqual(expect.objectContaining({ id: 'create:practices', destructive: false }))
    expect(createSupabaseMigrationSql(config, 'practices')).toContain('create table if not exists public."practice_items"')
  })

  it('imports the real Visual Builder SQL schema into visual collections', () => {
    const sql = readFileSync('examples/supabase/builder-schema.sql', 'utf8')
    const imported = importSupabaseSchemaSql(sql, { ...config, tables: [] })

    expect(imported.tables.map((table) => table.name)).toEqual([
      'practices',
      'practice_attempts',
    ])
    expect(imported.tables.find((table) => table.name === 'practices')).toEqual(expect.objectContaining({
      access: 'public_read',
      fields: expect.arrayContaining([
        expect.objectContaining({ name: 'mediapipe_reference', type: 'json' }),
        expect.objectContaining({ name: 'updated_at', type: 'datetime' }),
      ]),
    }))
    expect(imported.tables.find((table) => table.name === 'practice_attempts')?.relations)
      .toEqual(expect.arrayContaining([expect.objectContaining({
        column: 'practice_id',
        targetTableId: 'sql-table-practices',
      })]))
  })
})
