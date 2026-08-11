export const DATA_BIND_FIELD_ATTRIBUTE = 'data-builder-bind-field'
export const DATA_BIND_TARGET_ATTRIBUTE = 'data-builder-bind-target'
export const DATA_SOURCE_ATTRIBUTE = 'data-builder-data-source'
export const DATA_REPEATER_ATTRIBUTE = 'data-builder-repeater'
export const DATA_SCOPE_ATTRIBUTE = 'data-builder-data-scope'
export const SUPABASE_STORAGE_KEY = 'visual-editor-supabase'

export type SupabaseFieldType = 'text' | 'long_text' | 'number' | 'boolean' | 'date' | 'datetime' | 'media' | 'media_list' | 'url' | 'uuid' | 'json'
export type SupabaseUploadKind = 'image' | 'video' | 'audio' | 'document' | 'any'
export type SupabaseAccessMode = 'public_read' | 'authenticated_read' | 'user_owned' | 'private'
export type SupabaseRecordMode = 'multiple' | 'single_per_user'
export type SupabaseManagementAction = 'select' | 'insert' | 'update' | 'delete'
export type SupabaseSetupStatus = 'draft' | 'needs_installation' | 'verified'

export interface SupabaseField {
  id: string
  name: string
  type: SupabaseFieldType
  upload?: {
    bucket: string
    kind: SupabaseUploadKind
    maxSizeMb: number
    visibility: 'public' | 'private'
  }
}

export interface SupabaseRelation {
  displayField?: string
  id: string
  column: string
  targetTableId: string
  targetColumn: string
  onDelete: 'cascade' | 'restrict' | 'set null'
}

export function relationAlias(relation: SupabaseRelation) {
  return `related_${safeDatabaseIdentifier(relation.column) || 'record'}`
}

export function relationDisplayField(config: SupabaseEditorConfig, relation: SupabaseRelation) {
  const target = config.tables.find((table) => table.id === relation.targetTableId)
  if (!target) return relation.targetColumn
  const available = [
    ...target.fields,
    ...(target.verifiedSchema?.fields ?? []),
  ]
  const requested = safeDatabaseIdentifier(relation.displayField ?? '')
  if (requested && available.some((field) => safeDatabaseIdentifier(field.name) === requested)) return requested
  return safeDatabaseIdentifier(available.find((field) => field.type === 'text' || field.type === 'long_text')?.name ?? '')
    || safeDatabaseIdentifier(available[0]?.name ?? '')
    || relation.targetColumn
}

export function relatedDataFields(config: SupabaseEditorConfig, table: SupabaseTableConfig): SupabaseField[] {
  return table.relations.flatMap((relation) => {
    const target = config.tables.find((candidate) => candidate.id === relation.targetTableId)
    if (!target || target.access === 'private') return []
    const configuredByName = new Map(target.fields.map((field) => [field.name, field]))
    const source = target.verifiedSchema?.fields.length
      ? target.verifiedSchema.fields.map((field, index) => ({
        ...field,
        id: field.id ?? configuredByName.get(field.name)?.id ?? `verified-${index}-${field.name}`,
      }))
      : target.fields
    return source.map((field) => ({
      ...field,
      id: `${relation.id}:${field.id}`,
      name: `${relationAlias(relation)}.${safeDatabaseIdentifier(field.name)}`,
      upload: undefined,
    }))
  })
}

export function dataFieldLabel(config: SupabaseEditorConfig, table: SupabaseTableConfig, fieldName: string) {
  const [alias, nestedField] = fieldName.split('.')
  if (!nestedField) return fieldName
  const relation = table.relations.find((candidate) => relationAlias(candidate) === alias)
  const target = relation && config.tables.find((candidate) => candidate.id === relation.targetTableId)
  return target ? `${collectionDisplayName(target)} → ${nestedField}` : fieldName
}

export interface SupabaseTableConfig {
  access: SupabaseAccessMode
  displayName?: string
  fields: SupabaseField[]
  id: string
  name: string
  management?: {
    actions: SupabaseManagementAction[]
    roles: string[]
  }
  recordMode?: SupabaseRecordMode
  relations: SupabaseRelation[]
  setupStatus?: SupabaseSetupStatus
  verifiedSchema?: {
    access?: SupabaseAccessMode
    fields: Array<{ id?: string; name: string; type: SupabaseFieldType; upload?: SupabaseField['upload'] }>
    name?: string
    management?: {
      actions: SupabaseManagementAction[]
      roles: string[]
    }
    recordMode?: SupabaseRecordMode
    relations?: SupabaseRelation[]
    verifiedAt: string
  }
}

export interface SupabaseSchemaChange {
  destructive: boolean
  id: string
  label: string
  sql: string
}

type SupabaseVerifiedField = { id?: string; name: string; type: SupabaseFieldType; upload?: SupabaseField['upload'] }

export interface SupabaseEditorConfig {
  projectUrl: string
  publishableKey: string
  tables: SupabaseTableConfig[]
}

const defaultPracticeTable: SupabaseTableConfig = {
  id: 'table-practices',
  name: 'practices',
  displayName: 'Prácticas',
  access: 'public_read',
  setupStatus: 'draft',
  fields: [
    { id: 'field-title', name: 'title', type: 'text' },
    { id: 'field-instructions', name: 'instructions', type: 'long_text' },
    { id: 'field-media', name: 'media_url', type: 'media' },
    { id: 'field-difficulty', name: 'difficulty', type: 'number' },
  ],
  relations: [],
}

export const defaultSupabaseConfig: SupabaseEditorConfig = {
  projectUrl: '',
  publishableKey: '',
  tables: [defaultPracticeTable],
}

export const accessModeLabels: Record<SupabaseAccessMode, string> = {
  public_read: 'Todos pueden verla',
  authenticated_read: 'Usuarios con sesión iniciada',
  user_owned: 'Cada usuario ve la suya',
  private: 'Solo para uso interno',
}

export const fieldTypeLabels: Record<SupabaseFieldType, string> = {
  text: 'Texto corto',
  long_text: 'Texto largo',
  number: 'Número',
  boolean: 'Sí / No',
  date: 'Fecha',
  datetime: 'Fecha y hora',
  media: 'Imagen o video',
  media_list: 'Varios archivos',
  url: 'Enlace web',
  uuid: 'Identificador',
  json: 'Datos JSON',
}

export function collectionDisplayName(table: SupabaseTableConfig) {
  return table.displayName?.trim() || table.name
}

export function safeDatabaseIdentifier(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^[^a-z]+/, '')
    .slice(0, 63)
}

export function supabaseDataSourceId(tableId: string) {
  return `supabase-${safeDatabaseIdentifier(tableId) || 'table'}`
}

export function builtInFields(access: SupabaseAccessMode) {
  return [
    'id',
    ...(access === 'public_read' ? ['published', 'sort_order'] : []),
    ...(access === 'user_owned' ? ['user_id'] : []),
    'created_at',
  ]
}

export function builtInDataFields(access: SupabaseAccessMode): SupabaseField[] {
  const types: Record<string, SupabaseFieldType> = {
    id: 'uuid',
    published: 'boolean',
    sort_order: 'number',
    user_id: 'uuid',
    created_at: 'datetime',
  }
  return builtInFields(access).map((name) => ({
    id: `automatic-${name}`,
    name,
    type: types[name],
  }))
}

function quotedIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function sqlType(type: SupabaseFieldType) {
  if (type === 'number') return 'numeric'
  if (type === 'boolean') return 'boolean default false'
  if (type === 'date') return 'date'
  if (type === 'datetime') return 'timestamptz'
  if (type === 'uuid') return 'uuid'
  if (type === 'json' || type === 'media_list') return 'jsonb'
  return 'text'
}

function sqlBaseType(type: SupabaseFieldType) {
  return type === 'boolean' ? 'boolean' : sqlType(type)
}

export function uploadAccept(kind: SupabaseUploadKind) {
  if (kind === 'image') return 'image/*'
  if (kind === 'video') return 'video/*'
  if (kind === 'audio') return 'audio/*'
  if (kind === 'document') return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
  return '*/*'
}

function generatedConstraintName(tableName: string, column: string) {
  return `${tableName}_${column}_fkey`
}

function normalizeTable(table: SupabaseTableConfig, fallbackIndex: number): SupabaseTableConfig {
  const access = accessModeLabels[table.access] ? table.access : 'public_read'
  const rawName = typeof table.name === 'string' ? table.name : ''
  const name = safeDatabaseIdentifier(rawName) || `table_${fallbackIndex + 1}`
  const seen = new Set(builtInFields(access))
  const fields = (Array.isArray(table.fields) ? table.fields : []).flatMap((field) => {
    if (!field || typeof field.name !== 'string') return []
    const fieldName = safeDatabaseIdentifier(field.name)
    if (!fieldName || seen.has(fieldName)) return []
    seen.add(fieldName)
    const supportsUpload = field.type === 'media' || field.type === 'media_list'
    const upload = supportsUpload && field.upload ? {
      bucket: safeDatabaseIdentifier(field.upload.bucket) || `${name}_${fieldName}`,
      kind: ['image', 'video', 'audio', 'document', 'any'].includes(field.upload.kind)
        ? field.upload.kind : 'any' as SupabaseUploadKind,
      maxSizeMb: Math.min(100, Math.max(1, Number(field.upload.maxSizeMb) || 10)),
      visibility: field.upload.visibility === 'public' ? 'public' as const : 'private' as const,
    } : undefined
    return [{ ...field, name: fieldName, ...(upload ? { upload } : {}), ...(!supportsUpload ? { upload: undefined } : {}) }]
  })
  const validColumns = new Set([...builtInFields(access), ...fields.map((field) => field.name)])
  const managementRoles = [...new Set((table.management?.roles ?? [])
    .map((role) => safeDatabaseIdentifier(role)).filter(Boolean))].slice(0, 20)
  const managementActions = [...new Set((table.management?.actions ?? []).filter((action): action is SupabaseManagementAction =>
    ['select', 'insert', 'update', 'delete'].includes(action)))]
  return {
    ...table,
    access,
    id: table.id || `table-${name}`,
    name,
    management: managementRoles.length && managementActions.length
      ? { roles: managementRoles, actions: managementActions }
      : undefined,
    recordMode: access === 'user_owned' && table.recordMode === 'single_per_user'
      ? 'single_per_user'
      : 'multiple',
    displayName: table.displayName?.trim() || rawName.trim() || name,
    fields,
    relations: (table.relations ?? []).filter((relation) => validColumns.has(relation.column)).map((relation) => ({
      ...relation,
      ...(relation.displayField ? { displayField: safeDatabaseIdentifier(relation.displayField) } : {}),
    })),
    setupStatus: table.setupStatus ?? 'draft',
    verifiedSchema: table.verifiedSchema ? {
      ...table.verifiedSchema,
      access: table.verifiedSchema.access ?? access,
      fields: (Array.isArray(table.verifiedSchema.fields) ? table.verifiedSchema.fields : []).map((verified) => ({
        ...verified,
        id: verified.id ?? fields.find((field) => field.name === safeDatabaseIdentifier(verified.name))?.id,
        name: safeDatabaseIdentifier(verified.name) || verified.name,
      })),
      name: safeDatabaseIdentifier(table.verifiedSchema.name ?? name) || name,
      management: table.verifiedSchema.management,
      recordMode: table.verifiedSchema.recordMode === 'single_per_user'
        ? 'single_per_user'
        : 'multiple',
    } : undefined,
  }
}

export function normalizedSupabaseConfig(config: SupabaseEditorConfig): SupabaseEditorConfig {
  const usedNames = new Set<string>()
  const sourceTables = Array.isArray(config?.tables) ? config.tables : defaultSupabaseConfig.tables
  const tables = sourceTables.flatMap((table, index) => {
    if (!table || typeof table !== 'object') return []
    const normalized = normalizeTable(table, index)
    if (usedNames.has(normalized.name)) return []
    usedNames.add(normalized.name)
    return [normalized]
  })
  const tableIds = new Set(tables.map((table) => table.id))
  return {
    projectUrl: typeof config?.projectUrl === 'string' ? config.projectUrl.trim().replace(/\/$/, '') : '',
    publishableKey: typeof config?.publishableKey === 'string' ? config.publishableKey.trim() : '',
    tables: tables.map((table) => ({
      ...table,
      relations: table.relations.filter((relation) =>
        relation.targetTableId === 'auth.users' || tableIds.has(relation.targetTableId)),
    })),
  }
}

function splitSqlColumns(body: string) {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let quote = ''
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index]
    if (quote) {
      current += character
      if (character === quote && body[index - 1] !== '\\') quote = ''
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      current += character
    } else if (character === '(') {
      depth += 1
      current += character
    } else if (character === ')') {
      depth = Math.max(0, depth - 1)
      current += character
    } else if (character === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function fieldTypeFromSql(name: string, definition: string, previous?: SupabaseFieldType): SupabaseFieldType {
  const lowered = definition.toLowerCase()
  if (previous === 'media_list' && /^(json|jsonb)\b/.test(lowered)) return 'media_list'
  if (/^uuid\b/.test(lowered)) return 'uuid'
  if (/^(json|jsonb)\b/.test(lowered)) return 'json'
  if (/^(timestamp|timestamptz)\b/.test(lowered)) return 'datetime'
  if (/^date\b/.test(lowered)) return 'date'
  if (/^boolean\b/.test(lowered)) return 'boolean'
  if (/^(smallint|integer|bigint|numeric|decimal|real|double precision)\b/.test(lowered)) return 'number'
  if (previous) return previous
  if (/(media|image|video|avatar).*_url$/.test(name)) return 'media'
  if (/_url$/.test(name)) return 'url'
  if (/(description|instructions|feedback|bio|notes|points|data)$/.test(name)) return 'long_text'
  return 'text'
}

function unquoteSqlIdentifier(value: string) {
  const trimmed = value.trim()
  return trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1).replaceAll('""', '"')
    : trimmed
}

/** Imports the table/column subset the visual editor understands. SQL is parsed locally and never executed. */
export function importSupabaseSchemaSql(sql: string, current: SupabaseEditorConfig): SupabaseEditorConfig {
  const tablePattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(?:"?public"?)\.)?("(?:""|[^"])+"|[a-z_][a-z0-9_]*)\s*\(([\s\S]*?)\)\s*;/gi
  const parsed: Array<{
    access: SupabaseAccessMode
    columns: Array<{ definition: string; name: string }>
    id: string
    name: string
    recordMode: SupabaseRecordMode
  }> = []
  let match: RegExpExecArray | null
  while ((match = tablePattern.exec(sql))) {
    const name = safeDatabaseIdentifier(unquoteSqlIdentifier(match[1]))
    if (!name) continue
    const previous = current.tables.find((table) => table.name === name)
    const prefix = sql.slice(Math.max(0, match.index - 180), match.index)
    const marker = prefix.match(/--\s*@builder-access\s+(public_read|authenticated_read|user_owned|private)\s*$/im)?.[1] as SupabaseAccessMode | undefined
    const recordModeMarker = prefix.match(/--\s*@builder-record-mode\s+(multiple|single_per_user)\s*$/im)?.[1] as SupabaseRecordMode | undefined
    const columns = splitSqlColumns(match[2]).flatMap((part) => {
      if (/^(constraint|primary\s+key|foreign\s+key|unique\s*\(|check\s*\()/i.test(part)) return []
      const columnMatch = part.match(/^("(?:""|[^"])+"|[a-z_][a-z0-9_]*)\s+([\s\S]+)$/i)
      if (!columnMatch) return []
      return [{ name: safeDatabaseIdentifier(unquoteSqlIdentifier(columnMatch[1])), definition: columnMatch[2] }]
    }).filter((column) => Boolean(column.name))
    const names = new Set(columns.map((column) => column.name))
    const access = marker ?? (names.has('user_id')
      ? 'user_owned'
      : names.has('published')
        ? 'public_read'
        : previous?.access ?? 'authenticated_read')
    parsed.push({
      access,
      columns,
      id: previous?.id ?? `sql-table-${name}`,
      name,
      recordMode: recordModeMarker ?? previous?.recordMode ?? 'multiple',
    })
  }
  if (!parsed.length) throw new Error('No encontramos instrucciones CREATE TABLE compatibles.')

  const tableIdByName = new Map(parsed.map((table) => [table.name, table.id]))
  const tables = parsed.map((parsedTable) => {
    const previous = current.tables.find((table) => table.id === parsedTable.id)
    const automatic = new Set(builtInFields(parsedTable.access))
    const fields = parsedTable.columns.flatMap((column, index) => {
      if (automatic.has(column.name)) return []
      const previousField = previous?.fields.find((field) => field.name === column.name)
      return [{
        id: previousField?.id ?? `sql-field-${parsedTable.name}-${column.name}-${index}`,
        name: column.name,
        type: fieldTypeFromSql(column.name, column.definition, previousField?.type),
      }]
    })
    const relations = parsedTable.columns.flatMap((column, index) => {
      const reference = column.definition.match(/references\s+(?:("?auth"?|"?public"?)\.)?("(?:""|[^"])+"|[a-z_][a-z0-9_]*)\s*\(\s*("(?:""|[^"])+"|[a-z_][a-z0-9_]*)\s*\)/i)
      if (!reference) return []
      const schema = unquoteSqlIdentifier(reference[1] ?? 'public')
      const targetName = safeDatabaseIdentifier(unquoteSqlIdentifier(reference[2]))
      const targetTableId = schema === 'auth' && targetName === 'users'
        ? 'auth.users'
        : tableIdByName.get(targetName)
      if (!targetTableId) return []
      const onDelete = /on\s+delete\s+cascade/i.test(column.definition)
        ? 'cascade' as const
        : /on\s+delete\s+set\s+null/i.test(column.definition)
          ? 'set null' as const
          : 'restrict' as const
      return [{
        id: previous?.relations.find((relation) => relation.column === column.name)?.id
          ?? `sql-relation-${parsedTable.name}-${column.name}-${index}`,
        column: column.name,
        targetTableId,
        targetColumn: safeDatabaseIdentifier(unquoteSqlIdentifier(reference[3])) || 'id',
        onDelete,
      }]
    })
    return {
      access: parsedTable.access,
      displayName: previous?.displayName ?? parsedTable.name.split('_').map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`).join(' '),
      fields,
      id: parsedTable.id,
      management: previous?.management,
      name: parsedTable.name,
      recordMode: parsedTable.access === 'user_owned' ? parsedTable.recordMode : 'multiple',
      relations,
      setupStatus: previous?.verifiedSchema ? 'needs_installation' as const : 'draft' as const,
      verifiedSchema: previous?.verifiedSchema,
    }
  })
  return normalizedSupabaseConfig({ ...current, tables })
}

export function isSafePublishableKey(value: string) {
  const key = value.trim()
  if (key.startsWith('sb_publishable_')) return true
  if (key.split('.').length !== 3 || key.length < 40) return false
  try {
    const payload = key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')
    const parsed = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))) as {
      role?: unknown
    }
    return parsed.role === 'anon'
  } catch {
    return false
  }
}

function roleTableName(config: SupabaseEditorConfig) {
  return config.tables.find((table) => table.access === 'user_owned'
    && /(^|_)roles?($|_)/i.test(table.name)
    && table.fields.some((field) => field.name === 'role'))?.name
}

function quotedSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

function roleHelperSql(name: string) {
  return `create schema if not exists private;
create or replace function private.builder_has_any_role(required_roles text[])
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.${quotedIdentifier(name)}
    where user_id = (select auth.uid()) and role = any(required_roles)
  );
end;
$$;
revoke all on function private.builder_has_any_role(text[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.builder_has_any_role(text[]) to authenticated;`
}

function createPolicySql(table: SupabaseTableConfig, configuredRoleTable?: string) {
  const target = `public.${quotedIdentifier(table.name)}`
  const prefix = table.name
  const dropPolicies = ['public_read', 'authenticated_read', 'own_select', 'own_insert', 'own_update', 'own_delete',
    'manager_select', 'manager_insert', 'manager_update', 'manager_delete']
    .map((suffix) => `drop policy if exists ${quotedIdentifier(`${prefix}_${suffix}`)} on ${target};`)
    .join('\n')
  const managerRoles = table.management?.roles ?? []
  const managerActions = table.management?.actions ?? []
  const managerCheck = configuredRoleTable && managerRoles.length
    ? `(select private.builder_has_any_role(array[${managerRoles.map(quotedSqlString).join(', ')}]::text[]))`
    : ''
  const managerGrants = managerCheck
    ? `grant ${managerActions.join(', ')} on table ${target} to authenticated;`
    : ''
  const managerPolicies = managerCheck ? managerActions.map((action) => {
    if (action === 'insert') return `create policy ${quotedIdentifier(`${prefix}_manager_insert`)} on ${target}\nfor insert to authenticated with check (${managerCheck});`
    if (action === 'update') return `create policy ${quotedIdentifier(`${prefix}_manager_update`)} on ${target}\nfor update to authenticated using (${managerCheck}) with check (${managerCheck});`
    return `create policy ${quotedIdentifier(`${prefix}_manager_${action}`)} on ${target}\nfor ${action} to authenticated using (${managerCheck});`
  }).join('\n') : ''
  if (table.access === 'public_read') {
    return `${dropPolicies}
grant select on table ${target} to anon, authenticated;
${managerGrants}
create policy ${quotedIdentifier(`${prefix}_public_read`)} on ${target}
for select to anon, authenticated using (published = true);
${managerPolicies}`
  }
  if (table.access === 'authenticated_read') {
    return `${dropPolicies}
revoke all on table ${target} from anon;
grant select on table ${target} to authenticated;
${managerGrants}
create policy ${quotedIdentifier(`${prefix}_authenticated_read`)} on ${target}
for select to authenticated using (true);
${managerPolicies}`
  }
  if (table.access === 'user_owned') {
    const isRoleTable = configuredRoleTable === table.name
    if (isRoleTable) {
      return `${dropPolicies}
revoke all on table ${target} from anon, authenticated;
grant select on table ${target} to authenticated;
${managerGrants}
create policy ${quotedIdentifier(`${prefix}_own_select`)} on ${target}
for select to authenticated using ((select auth.uid()) = user_id);
${managerPolicies}`
    }
    return `${dropPolicies}
revoke all on table ${target} from anon;
grant select, insert, update, delete on table ${target} to authenticated;
${managerGrants}
create policy ${quotedIdentifier(`${prefix}_own_select`)} on ${target}
for select to authenticated using ((select auth.uid()) = user_id);
create policy ${quotedIdentifier(`${prefix}_own_insert`)} on ${target}
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ${quotedIdentifier(`${prefix}_own_update`)} on ${target}
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy ${quotedIdentifier(`${prefix}_own_delete`)} on ${target}
for delete to authenticated using ((select auth.uid()) = user_id);
${managerPolicies}`
  }
  return `${dropPolicies}
revoke all on table ${target} from anon, authenticated;`
}

function createRelationSql(
  config: SupabaseEditorConfig,
  table: SupabaseTableConfig,
  relation: SupabaseRelation,
) {
  const targetTable = relation.targetTableId === 'auth.users'
    ? { schema: 'auth', name: 'users' }
    : { schema: 'public', name: config.tables.find((candidate) => candidate.id === relation.targetTableId)?.name }
  if (!targetTable.name) return ''
  const constraintName = `${table.name}_${relation.column}_fkey`
  const onDelete = relation.onDelete === 'set null' ? 'set null' : relation.onDelete
  return `do $$
begin
  if not exists (select 1 from pg_constraint where conname = '${constraintName.replaceAll("'", "''")}') then
    alter table public.${quotedIdentifier(table.name)}
      add constraint ${quotedIdentifier(constraintName)}
      foreign key (${quotedIdentifier(relation.column)})
      references ${targetTable.schema}.${quotedIdentifier(targetTable.name)} (${quotedIdentifier(relation.targetColumn)})
      on delete ${onDelete};
  end if;
end $$;
create index if not exists ${quotedIdentifier(`${table.name}_${relation.column}_idx`)}
on public.${quotedIdentifier(table.name)} (${quotedIdentifier(relation.column)});`
}

function storageMimeTypes(kind: SupabaseUploadKind) {
  if (kind === 'image') return ['image/*']
  if (kind === 'video') return ['video/*']
  if (kind === 'audio') return ['audio/*']
  if (kind === 'document') return [
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]
  return []
}

function createStorageBucketSql(field: SupabaseField) {
  if (!field.upload) return ''
  const bucket = field.upload.bucket
  const policyPrefix = `builder_${bucket}`
  const maxBytes = Math.round(field.upload.maxSizeMb * 1024 * 1024)
  const mimeTypes = storageMimeTypes(field.upload.kind)
  const mimeSql = mimeTypes.length
    ? `array[${mimeTypes.map(quotedSqlString).join(', ')}]::text[]`
    : 'null'
  const ownerCheck = `bucket_id = ${quotedSqlString(bucket)} and (storage.foldername(name))[1] = (select auth.uid()::text)`
  return `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (${quotedSqlString(bucket)}, ${quotedSqlString(bucket)}, ${field.upload.visibility === 'public'}, ${maxBytes}, ${mimeSql})
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ${quotedIdentifier(`${policyPrefix}_select`)} on storage.objects;
drop policy if exists ${quotedIdentifier(`${policyPrefix}_insert`)} on storage.objects;
drop policy if exists ${quotedIdentifier(`${policyPrefix}_update`)} on storage.objects;
drop policy if exists ${quotedIdentifier(`${policyPrefix}_delete`)} on storage.objects;
create policy ${quotedIdentifier(`${policyPrefix}_select`)} on storage.objects
for select to authenticated using (${ownerCheck});
create policy ${quotedIdentifier(`${policyPrefix}_insert`)} on storage.objects
for insert to authenticated with check (${ownerCheck});
create policy ${quotedIdentifier(`${policyPrefix}_update`)} on storage.objects
for update to authenticated using (${ownerCheck}) with check (${ownerCheck});
create policy ${quotedIdentifier(`${policyPrefix}_delete`)} on storage.objects
for delete to authenticated using (${ownerCheck});`
}

function createTableSql(config: SupabaseEditorConfig, table: SupabaseTableConfig) {
  const target = `public.${quotedIdentifier(table.name)}`
  const builtIns = [
    'id uuid primary key default gen_random_uuid()',
    ...(table.access === 'public_read' ? [
      'published boolean not null default false',
      'sort_order integer not null default 0',
    ] : []),
    ...(table.access === 'user_owned' ? [
      'user_id uuid not null references auth.users(id) on delete cascade',
    ] : []),
    'created_at timestamptz not null default now()',
    ...table.fields.map((field) => `${quotedIdentifier(field.name)} ${sqlType(field.type)}`),
  ]
  const fields = table.fields.map((field) =>
    `alter table ${target} add column if not exists ${quotedIdentifier(field.name)} ${sqlType(field.type)};
alter table ${target} alter column ${quotedIdentifier(field.name)} type ${sqlBaseType(field.type)} using ${quotedIdentifier(field.name)}::${sqlBaseType(field.type)};`)
  const builtInUpdates = [
    `alter table ${target} add column if not exists created_at timestamptz not null default now();`,
    ...(table.access === 'public_read' ? [
      `alter table ${target} add column if not exists published boolean not null default false;`,
      `alter table ${target} add column if not exists sort_order integer not null default 0;`,
    ] : []),
    ...(table.access === 'user_owned' ? [
      `alter table ${target} add column if not exists user_id uuid references auth.users(id) on delete cascade;`,
    ] : []),
  ]
  const relations = table.relations.map((relation) => createRelationSql(config, table, relation)).filter(Boolean)
  const storageBuckets = [...new Map(table.fields.flatMap((field) => field.upload
    ? [[field.upload.bucket, createStorageBucketSql(field)] as const]
    : [])).values()]
  const publicIndex = table.access === 'public_read'
    ? `create index if not exists ${quotedIdentifier(`${table.name}_published_sort_idx`)}
on ${target} (published, sort_order);`
    : ''
  const ownerIndex = table.access === 'user_owned'
    ? table.recordMode === 'single_per_user'
      ? `create unique index if not exists ${quotedIdentifier(`${table.name}_user_id_unique`)} on ${target} (user_id);`
      : `create index if not exists ${quotedIdentifier(`${table.name}_user_id_idx`)} on ${target} (user_id);`
    : ''
  return `-- @builder-access ${table.access}
-- @builder-record-mode ${table.recordMode ?? 'multiple'}
-- Table: ${table.name}
create table if not exists ${target} (
  ${builtIns.join(',\n  ')}
);

${fields.join('\n')}
${builtInUpdates.join('\n')}

alter table ${target} enable row level security;
${createPolicySql(table, roleTableName(config))}

${publicIndex}
${ownerIndex}
${relations.join('\n')}
${storageBuckets.join('\n')}`.trim()
}

export function createSupabaseSetupSql(input: SupabaseEditorConfig, tableId?: string) {
  const config = normalizedSupabaseConfig(input)
  const tables = tableId ? config.tables.filter((table) => table.id === tableId) : config.tables
  return `-- Generated by Visual Builder
-- Run this in Supabase > SQL Editor.

${roleTableName(config) ? `${roleHelperSql(roleTableName(config)!)}\n\n` : ''}${tables.map((table) => createTableSql(config, table)).join('\n\n')}`
}

function snapshotFieldFor(
  table: SupabaseTableConfig,
  field: SupabaseVerifiedField,
) {
  return field.id
    ? table.fields.find((candidate) => candidate.id === field.id)
    : table.fields.find((candidate) => candidate.name === field.name)
}

function databaseRelation(relation: SupabaseRelation) {
  const { displayField: _displayField, ...databaseFields } = relation
  return databaseFields
}

export function describeSupabaseSchemaChanges(
  input: SupabaseEditorConfig,
  tableId: string,
): SupabaseSchemaChange[] {
  const config = normalizedSupabaseConfig(input)
  const table = config.tables.find((candidate) => candidate.id === tableId)
  if (!table) return []
  const baseline = table.verifiedSchema
  if (!baseline) return [{
    destructive: false,
    id: `create:${table.id}`,
    label: `Crear la tabla ${table.name}`,
    sql: createTableSql(config, table),
  }]

  const changes: SupabaseSchemaChange[] = []
  const oldTableName = safeDatabaseIdentifier(baseline.name ?? table.name) || table.name
  const target = `public.${quotedIdentifier(table.name)}`
  if (oldTableName !== table.name) {
    changes.push({
      destructive: false,
      id: `rename-table:${table.id}`,
      label: `Renombrar la tabla ${oldTableName} a ${table.name}`,
      sql: `alter table public.${quotedIdentifier(oldTableName)} rename to ${quotedIdentifier(table.name)};`,
    })
    if (roleTableName(config) === table.name) changes.push({
      destructive: false,
      id: `role-helper:${table.id}`,
      label: 'Actualizar la comprobación segura de roles',
      sql: roleHelperSql(table.name),
    })
  }

  const matchedCurrentIds = new Set<string>()
  for (const oldField of baseline.fields) {
    const current = snapshotFieldFor(table, oldField)
    if (!current) {
      changes.push({
        destructive: true,
        id: `drop-field:${oldField.id ?? oldField.name}`,
        label: `Eliminar el campo ${oldField.name} y sus datos`,
        sql: `alter table ${target} drop column ${quotedIdentifier(oldField.name)};`,
      })
      continue
    }
    matchedCurrentIds.add(current.id)
    if (oldField.name !== current.name) {
      changes.push({
        destructive: false,
        id: `rename-field:${current.id}`,
        label: `Renombrar ${oldField.name} a ${current.name}`,
        sql: `alter table ${target} rename column ${quotedIdentifier(oldField.name)} to ${quotedIdentifier(current.name)};`,
      })
    }
    if (oldField.type !== current.type) {
      const type = sqlBaseType(current.type)
      changes.push({
        destructive: true,
        id: `type-field:${current.id}`,
        label: `Cambiar ${current.name} de ${fieldTypeLabels[oldField.type]} a ${fieldTypeLabels[current.type]}`,
        sql: `alter table ${target} alter column ${quotedIdentifier(current.name)} type ${type} using ${quotedIdentifier(current.name)}::${type};`,
      })
    }
    if (current.upload && JSON.stringify(oldField.upload ?? null) !== JSON.stringify(current.upload)) {
      changes.push({
        destructive: false,
        id: `storage:${current.id}`,
        label: `Configurar archivos para ${current.name}`,
        sql: createStorageBucketSql(current),
      })
    }
  }
  for (const field of table.fields) {
    if (matchedCurrentIds.has(field.id)) continue
    changes.push({
      destructive: false,
      id: `add-field:${field.id}`,
      label: `Añadir el campo ${field.name}`,
      sql: `alter table ${target} add column ${quotedIdentifier(field.name)} ${sqlType(field.type)};`,
    })
    if (field.upload) changes.push({
      destructive: false,
      id: `storage:${field.id}`,
      label: `Configurar archivos para ${field.name}`,
      sql: createStorageBucketSql(field),
    })
  }

  const oldAccess = baseline.access ?? table.access
  const oldBuiltIns = new Set(builtInFields(oldAccess))
  const newBuiltIns = new Set(builtInFields(table.access))
  const removedBuiltIns: SupabaseSchemaChange[] = []
  for (const column of newBuiltIns) {
    if (oldBuiltIns.has(column)) continue
    const definition = column === 'published'
      ? 'boolean not null default false'
      : column === 'sort_order'
        ? 'integer not null default 0'
        : 'uuid references auth.users(id) on delete cascade'
    changes.push({
      destructive: false,
      id: `add-system-field:${column}`,
      label: `Añadir el campo automático ${column}`,
      sql: `alter table ${target} add column ${quotedIdentifier(column)} ${definition};`,
    })
  }
  for (const column of oldBuiltIns) {
    if (newBuiltIns.has(column) || column === 'id' || column === 'created_at') continue
    removedBuiltIns.push({
      destructive: true,
      id: `drop-system-field:${column}`,
      label: `Eliminar el campo automático ${column} y sus datos`,
      sql: `alter table ${target} drop column ${quotedIdentifier(column)};`,
    })
  }
  if (oldAccess !== table.access) {
    const accessIndex = table.access === 'public_read'
      ? `\ncreate index if not exists ${quotedIdentifier(`${table.name}_published_sort_idx`)} on ${target} (published, sort_order);`
      : table.access === 'user_owned'
        ? `\ncreate index if not exists ${quotedIdentifier(`${table.name}_user_id_idx`)} on ${target} (user_id);`
        : ''
    changes.push({
      destructive: false,
      id: `access:${table.id}`,
      label: `Actualizar la visibilidad: ${accessModeLabels[table.access]}`,
      sql: `alter table ${target} enable row level security;\n${createPolicySql(table, roleTableName(config))}${accessIndex}`,
    })
  }
  const oldManagement = baseline.management
  const newManagement = table.management
  if (JSON.stringify(oldManagement ?? null) !== JSON.stringify(newManagement ?? null)) {
    const configuredRoleTable = roleTableName(config)
    changes.push({
      destructive: false,
      id: `management:${table.id}`,
      label: newManagement ? 'Actualizar permisos de gestión' : 'Quitar permisos de gestión',
      sql: `${configuredRoleTable ? `${roleHelperSql(configuredRoleTable)}\n` : ''}${createPolicySql(table, configuredRoleTable)}`,
    })
  }
  const oldRecordMode = baseline.recordMode ?? 'multiple'
  const newRecordMode = table.access === 'user_owned' ? table.recordMode ?? 'multiple' : 'multiple'
  if (oldRecordMode !== newRecordMode && table.access === 'user_owned') {
    changes.push({
      destructive: newRecordMode === 'single_per_user',
      id: `record-mode:${table.id}`,
      label: newRecordMode === 'single_per_user'
        ? 'Permitir un solo registro por persona'
        : 'Permitir varios registros por persona',
      sql: newRecordMode === 'single_per_user'
        ? `drop index if exists public.${quotedIdentifier(`${table.name}_user_id_idx`)};\ncreate unique index if not exists ${quotedIdentifier(`${table.name}_user_id_unique`)} on ${target} (user_id);`
        : `drop index if exists public.${quotedIdentifier(`${table.name}_user_id_unique`)};\ncreate index if not exists ${quotedIdentifier(`${table.name}_user_id_idx`)} on ${target} (user_id);`,
    })
  }
  changes.push(...removedBuiltIns)

  const oldRelations = baseline.relations ?? []
  const newRelationsById = new Map(table.relations.map((relation) => [relation.id, relation]))
  for (const oldRelation of oldRelations) {
    const current = newRelationsById.get(oldRelation.id)
    if (current && JSON.stringify(databaseRelation(current)) === JSON.stringify(databaseRelation(oldRelation))) continue
    changes.push({
      destructive: false,
      id: `remove-relation:${oldRelation.id}`,
      label: `Quitar la relación de ${oldRelation.column}`,
      sql: `alter table ${target} drop constraint if exists ${quotedIdentifier(generatedConstraintName(oldTableName, oldRelation.column))};`,
    })
  }
  const oldRelationsById = new Map(oldRelations.map((relation) => [relation.id, relation]))
  for (const relation of table.relations) {
    const oldRelation = oldRelationsById.get(relation.id)
    if (oldRelation && JSON.stringify(databaseRelation(oldRelation)) === JSON.stringify(databaseRelation(relation))) continue
    const relationSql = createRelationSql(config, table, relation)
    if (relationSql) changes.push({
      destructive: false,
      id: `add-relation:${relation.id}`,
      label: `Conectar ${relation.column} con otra tabla`,
      sql: relationSql,
    })
  }
  return changes
}

export function createSupabaseMigrationSql(input: SupabaseEditorConfig, tableId: string) {
  const changes = describeSupabaseSchemaChanges(input, tableId)
  if (!changes.length) return '-- No hay cambios pendientes para esta tabla.'
  return `-- Generated by Visual Builder\n-- Review this migration, then run it once in Supabase > SQL Editor.\n\nbegin;\n\n${changes.map((change) => `-- ${change.destructive ? 'WARNING: ' : ''}${change.label}\n${change.sql}`).join('\n\n')}\n\ncommit;`
}

export function appliedSupabaseSchema(table: SupabaseTableConfig): NonNullable<SupabaseTableConfig['verifiedSchema']> {
  return {
    access: table.access,
    fields: table.fields.map((field) => ({
      id: field.id, name: field.name, type: field.type,
      ...(field.upload ? { upload: { ...field.upload } } : {}),
    })),
    management: table.management ? {
      actions: [...table.management.actions],
      roles: [...table.management.roles],
    } : undefined,
    name: table.name,
    recordMode: table.recordMode ?? 'multiple',
    relations: table.relations.map((relation) => ({ ...relation })),
    verifiedAt: new Date().toISOString(),
  }
}

export async function verifySupabaseTable(
  input: SupabaseEditorConfig,
  tableId: string,
  request: typeof fetch = fetch,
  accessToken?: string,
) {
  const config = normalizedSupabaseConfig(input)
  if (!/^https:\/\//i.test(config.projectUrl)) {
    throw new Error('La URL del proyecto debe comenzar con https://.')
  }
  if (!isSafePublishableKey(config.publishableKey)) {
    throw new Error('Usa una publishable key de Supabase, nunca una secret key.')
  }
  const table = config.tables.find((candidate) => candidate.id === tableId)
  if (!table) throw new Error('La tabla seleccionada ya no existe.')
  if ((table.access === 'authenticated_read' || table.access === 'user_owned') && !accessToken) {
    throw new Error('Inicia sesión en la vista previa para comprobar esta colección.')
  }
  if (table.access === 'private') {
    throw new Error('Esta colección es interna y no está disponible en el sitio.')
  }
  const columns = [...builtInFields(table.access), ...table.fields.map((field) => field.name)]
  const url = new URL(`${config.projectUrl}/rest/v1/${encodeURIComponent(table.name)}`)
  url.searchParams.set('select', columns.join(','))
  url.searchParams.set('limit', '1')
  const response = await request(url.href, { headers: {
    apikey: config.publishableKey,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  } })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Supabase respondió ${response.status}: ${detail || 'revisa la tabla y sus políticas.'}`)
  }
  const records = await response.json().catch(() => []) as unknown
  return { hasRows: Array.isArray(records) && records.length > 0 }
}

export function readSupabaseAccessToken(projectUrl: string) {
  if (typeof localStorage === 'undefined') return undefined
  try {
    const hostname = new URL(projectUrl).hostname
    const saved = JSON.parse(localStorage.getItem(`builder-auth:${hostname}`) ?? 'null') as {
      access_token?: unknown
    } | null
    return typeof saved?.access_token === 'string' ? saved.access_token : undefined
  } catch {
    return undefined
  }
}

export function loadSupabaseConfig(): SupabaseEditorConfig {
  if (typeof localStorage === 'undefined') return defaultSupabaseConfig
  try {
    const saved = JSON.parse(localStorage.getItem(SUPABASE_STORAGE_KEY) ?? 'null') as Partial<SupabaseEditorConfig> | null
    if (!saved) return defaultSupabaseConfig
    return normalizedSupabaseConfig({
      projectUrl: saved.projectUrl ?? '',
      publishableKey: saved.publishableKey ?? '',
      tables: Array.isArray(saved.tables) ? saved.tables : defaultSupabaseConfig.tables,
    })
  } catch {
    return defaultSupabaseConfig
  }
}

export function storeSupabaseConfig(config: SupabaseEditorConfig) {
  localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(normalizedSupabaseConfig(config)))
}
