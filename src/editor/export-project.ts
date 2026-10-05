import type { Editor } from 'grapesjs'
import type {
  DataBinding,
  DataAction,
  DataRepeater,
  ProjectBundle,
  ProjectConnection,
  ProjectFile,
  MotionActivity,
  RecordToggle,
} from '../core/project'
import { zipProjectExporter } from '../modules/exporter'
import { createStableElementId } from '../modules/preview'
import { validateStaticArchive } from '../modules/exporter/validation/validateStaticArchive'
import { externalFunctionRegistrations } from '../external-functions/catalog'
import {
  createFunctionBlockRuntimeSource,
  EXTERNAL_FUNCTION_ATTRIBUTE,
} from '../runtime/functions/function-block-runtime'
import type { ExternalFunctionRegistration } from '../runtime/functions/external-function-registry'
import type { RawJavaScriptRuntimeLibrary } from '../runtime/functions/js-lab-runtime'
import { JS_LAB_ATTRIBUTE, JS_LAB_PUBLIC_ATTRIBUTE } from './external-function-blocks'
import { PYTHON_LAB_ATTRIBUTE, PYTHON_LAB_PUBLIC_ATTRIBUTE } from './python-lab-blocks'
import { createPythonLabRuntimeSource } from '../runtime/python/python-lab-runtime'
import {
  FLOW_ACTION_ATTRIBUTE,
  FLOW_ACTIVE_LABEL_ATTRIBUTE,
  FLOW_CONTEXT_ATTRIBUTE,
  FLOW_DATA_SOURCE_ATTRIBUTE,
  FLOW_INACTIVE_LABEL_ATTRIBUTE,
  FLOW_OWNER_FIELD_ATTRIBUTE,
  FLOW_RECORD_FIELD_ATTRIBUTE,
  FLOW_TARGET_ATTRIBUTE,
  readDataActionConnection,
} from './flow-connections'
import {
  createSupabaseSetupSql,
  DATA_BIND_FIELD_ATTRIBUTE,
  DATA_BIND_TARGET_ATTRIBUTE,
  DATA_SOURCE_ATTRIBUTE,
  DATA_REPEATER_ATTRIBUTE,
  DATA_SCOPE_ATTRIBUTE,
  isSafePublishableKey,
  normalizedSupabaseConfig,
  relationAlias,
  relationDisplayField,
  supabaseDataSourceId,
} from './supabase-data'
import type { SupabaseEditorConfig } from './supabase-data'
import {
  DATA_COMPONENT_ATTRIBUTE,
  DATA_FILTER_CONTROL_ATTRIBUTE,
  DATA_FILTER_FIELD_ATTRIBUTE,
  DATA_FILTER_OPERATOR_ATTRIBUTE,
  DATA_FILTER_VALUE_ATTRIBUTE,
  DATA_FIXED_FILTER_ATTRIBUTE,
  DATA_PAGE_SIZE_ATTRIBUTE,
  DATA_PAGINATION_ATTRIBUTE,
  DATA_SEARCH_FIELD_ATTRIBUTE,
  DATA_SORT_CONTROL_ATTRIBUTE,
  DATA_SORT_DIRECTION_ATTRIBUTE,
  DATA_SORT_FIELD_ATTRIBUTE,
  dataComponentStyles,
} from './data-component-templates'
import { readMotionActivities } from './motion-analysis'

const encoder = new TextEncoder()

export interface EditorExportPage {
  access?: 'public' | 'authenticated' | 'guestOnly' | 'role'
  css?: string
  html: string
  id: string
  isStartPage?: boolean
  js?: string
  name: string
  roles?: string[]
}

function safePageSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'pagina'
}

function safeFilename(value: string) {
  return `${safePageSlug(value || 'sitio-web')}.zip`
}

function escapeStyleContent(value: string) {
  return value.replace(/<\/style/gi, '<\\/style')
}

function escapeScriptContent(value: string) {
  return value.replace(/<\/script/gi, '<\\/script')
}

function pageDocument(page: EditorExportPage) {
  const parsed = new DOMParser().parseFromString(page.html, 'text/html')
  parsed.querySelectorAll<HTMLElement>('[data-motion-design-preview]').forEach((element) => {
    element.removeAttribute('data-motion-design-preview')
    element.hidden = true
  })
  const bodyMarkup = parsed.body.innerHTML || page.html
  const bodyAttributes = Array.from(parsed.body.attributes)
    .map((attribute) => ` ${attribute.name}="${attribute.value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')}"`)
    .join('')
  const usesDataComponents = Boolean(parsed.querySelector([
    `[${DATA_COMPONENT_ATTRIBUTE}]`,
    '.builder-data-grid',
    '.builder-data-carousel',
    '.builder-data-list',
    '.builder-data-featured',
  ].join(',')))
  const usesJsLab = Boolean(parsed.querySelector(`[${JS_LAB_ATTRIBUTE}]`))
  const usesPythonLab = Boolean(parsed.querySelector(`[${PYTHON_LAB_ATTRIBUTE}]`))
  const jsLabVisibilityStyles = usesJsLab
    ? `[${JS_LAB_ATTRIBUTE}][${JS_LAB_PUBLIC_ATTRIBUTE}="false"] { display: none !important; }`
    : ''
  const pythonLabVisibilityStyles = usesPythonLab
    ? `[${PYTHON_LAB_ATTRIBUTE}][${PYTHON_LAB_PUBLIC_ATTRIBUTE}="false"] { display: none !important; }`
    : ''
  const pageStyles = [page.css ?? '', usesDataComponents ? dataComponentStyles : '', jsLabVisibilityStyles, pythonLabVisibilityStyles]
    .filter(Boolean)
    .join('\n')
  const title = document.createElement('div')
  title.textContent = page.name

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title.innerHTML}</title>
    <style>${escapeStyleContent(pageStyles)}</style>
  </head>
  <body${bodyAttributes}>
    ${bodyMarkup}
    ${page.js ? `<script>${escapeScriptContent(page.js)}</script>` : ''}
  </body>
</html>`
}

function uniquePageFiles(pages: EditorExportPage[]) {
  const used = new Set<string>()
  return new Map(pages.map((page) => {
    const base = safePageSlug(page.id || page.name)
    let candidate = base
    let suffix = 2
    while (used.has(candidate)) candidate = `${base}-${suffix++}`
    used.add(candidate)
    return [page.id, `pages/${candidate}.html`]
  }))
}

export function buildEditorProjectBundle(
  pages: EditorExportPage[],
  startPage: string,
  name = 'Sitio web',
  supabaseConfig?: SupabaseEditorConfig,
): ProjectBundle {
  if (!pages.length) throw new Error('Añade al menos una página antes de exportar.')
  if (!pages.some((page) => page.id === startPage)) {
    throw new Error('La página inicial ya no existe.')
  }

  const filesByPage = uniquePageFiles(pages)
  const pageIds = new Set(pages.map((page) => page.id))
  const files: ProjectFile[] = []
  const connections: ProjectConnection[] = []
  const bindings: DataBinding[] = []
  const repeaters: DataRepeater[] = []
  const recordToggles: RecordToggle[] = []
  const dataActions: DataAction[] = []
  const motionActivities: MotionActivity[] = []
  const normalizedData = supabaseConfig ? normalizedSupabaseConfig(supabaseConfig) : undefined
  const fallbackTableId = normalizedData?.tables[0]?.id
  const authPage = pages.find((page) => {
    const parsed = new DOMParser().parseFromString(page.html, 'text/html')
    return Boolean(parsed.querySelector('form[data-builder-auth-action="login"]'))
  })
  const hasSupabaseCredentials = Boolean(
    normalizedData?.projectUrl
    && normalizedData.publishableKey
    && isSafePublishableKey(normalizedData.publishableKey),
  )

  if (pages.some((page) => page.access === 'role') && !authPage) {
    throw new Error('Añade una página de acceso antes de restringir páginas por rol.')
  }

  if (pages.some((page) => page.access === 'authenticated') && !authPage) {
    throw new Error('Añade una página de acceso antes de marcar páginas como privadas.')
  }

  if (pages.some((page) => page.access === 'role')
    && !normalizedData?.tables.some((table) => /(^|_)roles?($|_)/i.test(table.name))) {
    throw new Error('Configura una tabla de roles antes de restringir páginas por rol.')
  }
  if (normalizedData?.tables.some((table) => table.management)
    && !normalizedData.tables.some((table) => table.access === 'user_owned'
      && /(^|_)roles?($|_)/i.test(table.name)
      && table.fields.some((field) => field.name === 'role'))) {
    throw new Error('Crea una colección segura de roles antes de exportar controles de gestión.')
  }

  if (authPage && !hasSupabaseCredentials) {
    throw new Error('Conecta Supabase con una URL y publishable key antes de probar la página de acceso.')
  }

  pages.forEach((page) => {
    const markup = pageDocument(page)
    const parsed = new DOMParser().parseFromString(markup, 'text/html')
    motionActivities.push(...readMotionActivities(parsed, page.id, normalizedData?.tables ?? []))
    parsed.querySelectorAll<HTMLElement>(
      `[${FLOW_ACTION_ATTRIBUTE}="navigate"][${FLOW_TARGET_ATTRIBUTE}]`,
    ).forEach((element, index) => {
      const targetPage = element.getAttribute(FLOW_TARGET_ATTRIBUTE)?.trim()
      if (!targetPage || !pageIds.has(targetPage)) return
      connections.push({
        id: `${page.id}-flow-${index + 1}`,
        sourcePage: page.id,
        elementId: createStableElementId(element, page.id),
        event: 'click',
        action: 'navigate',
        targetPage,
        ...(() => {
          const repeater = element.closest<HTMLElement>(`[${DATA_REPEATER_ATTRIBUTE}]`)
          if (!repeater) return {}
          const tableId = repeater?.getAttribute(DATA_REPEATER_ATTRIBUTE)
          const resolvedTableId = tableId && tableId !== 'true' ? tableId : fallbackTableId
          if (!resolvedTableId) return {}
          const requestedTargetTableId = element.getAttribute(FLOW_DATA_SOURCE_ATTRIBUTE)?.trim()
          const requestedRecordField = element.getAttribute(FLOW_RECORD_FIELD_ATTRIBUTE)?.trim()
          const sourceTable = normalizedData?.tables.find((table) => table.id === resolvedTableId)
          const relatedRecord = sourceTable?.relations.find((relation) =>
            relation.targetTableId === requestedTargetTableId
              && relation.column === requestedRecordField)
          return {
          context: {
              record: relatedRecord ? {
                dataSourceId: supabaseDataSourceId(relatedRecord.targetTableId),
                recordId: `$record.${relatedRecord.column}`,
              } : {
                dataSourceId: supabaseDataSourceId(resolvedTableId),
                recordId: '$record.id',
              },
          },
          }
        })(),
      })
    })
    parsed.querySelectorAll<HTMLElement>(
      `[${FLOW_ACTION_ATTRIBUTE}="toggle-record"][${FLOW_DATA_SOURCE_ATTRIBUTE}]`,
    ).forEach((element, index) => {
      const tableId = element.getAttribute(FLOW_DATA_SOURCE_ATTRIBUTE)?.trim()
      const ownerField = element.getAttribute(FLOW_OWNER_FIELD_ATTRIBUTE)?.trim()
      const recordField = element.getAttribute(FLOW_RECORD_FIELD_ATTRIBUTE)?.trim()
      if (!tableId || !ownerField || !recordField) return
      recordToggles.push({
        id: `${page.id}-record-toggle-${index + 1}`,
        pageId: page.id,
        elementId: createStableElementId(element, page.id),
        dataSourceId: supabaseDataSourceId(tableId),
        contextKey: element.getAttribute(FLOW_CONTEXT_ATTRIBUTE)?.trim() || 'record',
        ownerField,
        recordField,
        activeLabel: element.getAttribute(FLOW_ACTIVE_LABEL_ATTRIBUTE)?.trim() || '★ Guardado',
        inactiveLabel: element.getAttribute(FLOW_INACTIVE_LABEL_ATTRIBUTE)?.trim() || '☆ Guardar',
      })
    })
    parsed.querySelectorAll<HTMLElement>([
      `[${FLOW_ACTION_ATTRIBUTE}="create-record"]`,
      `[${FLOW_ACTION_ATTRIBUTE}="update-record"]`,
      `[${FLOW_ACTION_ATTRIBUTE}="delete-record"]`,
      `[${FLOW_ACTION_ATTRIBUTE}="save-current-user-record"]`,
      `[${FLOW_ACTION_ATTRIBUTE}="set-record-field"]`,
    ].join(',')).forEach((element, index) => {
      const connection = readDataActionConnection(Object.fromEntries(
        [...element.attributes].map((attribute) => [attribute.name, attribute.value]),
      ))
      if (!connection) return
      const safeField = (value: string) => /^[a-z][a-z0-9_]*$/.test(value)
      const fieldMappings = connection.fieldMappings.filter((mapping) => safeField(mapping.field) && (
        ('inputName' in mapping && typeof mapping.inputName === 'string'
          && /^[a-z][a-z0-9_-]*$/.test(mapping.inputName))
        || ('runtimeValue' in mapping && Boolean(mapping.runtimeValue?.key)
          && (mapping.runtimeValue?.path ?? []).every((part) => typeof part === 'string' && Boolean(part)))
      ))
      dataActions.push({
        id: `${page.id}-data-action-${index + 1}`,
        pageId: page.id,
        elementId: createStableElementId(element, page.id),
        dataSourceId: supabaseDataSourceId(connection.dataSourceTableId),
        action: connection.action === 'create-record' ? 'create'
          : connection.action === 'update-record' ? 'update'
            : connection.action === 'save-current-user-record' ? 'upsert'
              : connection.action === 'set-record-field' ? 'set' : 'delete',
        contextKey: connection.contextKey,
        recordMode: connection.recordMode ?? 'context',
        valueSource: connection.valueSource ?? (connection.fixedValue === '$now' ? 'now' : 'fixed'),
        fieldMappings,
        ...(connection.ownerField && safeField(connection.ownerField)
          ? { ownerField: connection.ownerField }
          : {}),
        ...(connection.fixedField && safeField(connection.fixedField)
          ? { fixedField: connection.fixedField, fixedValue: connection.fixedValue ?? '' }
          : {}),
        ...(connection.valueInputName && /^[a-z][a-z0-9_-]*$/.test(connection.valueInputName)
          ? { valueInputName: connection.valueInputName }
          : {}),
        ...(Number.isFinite(connection.valueAmount) ? { valueAmount: connection.valueAmount } : {}),
        successMessage: connection.successMessage.slice(0, 300),
        ...(connection.confirmMessage ? { confirmMessage: connection.confirmMessage.slice(0, 300) } : {}),
      })
    })
    parsed.querySelectorAll<HTMLElement>(`[${DATA_BIND_FIELD_ATTRIBUTE}]`)
      .forEach((element, index) => {
        const field = element.getAttribute(DATA_BIND_FIELD_ATTRIBUTE)?.trim()
        const requestedTarget = element.getAttribute(DATA_BIND_TARGET_ATTRIBUTE)?.trim()
        const tableId = element.getAttribute(DATA_SOURCE_ATTRIBUTE)?.trim() || fallbackTableId
        const insideRepeater = element.closest<HTMLElement>(`[${DATA_REPEATER_ATTRIBUTE}]`)
        const requestedScope = element.getAttribute(DATA_SCOPE_ATTRIBUTE)?.trim()
        const sourceMode = insideRepeater || requestedScope !== 'first' ? 'context' : 'first'
        const allowedTargets = ['text', 'src', 'alt', 'href', 'title', 'ariaLabel', 'value'] as const
        const target = allowedTargets.find((candidate) => candidate === requestedTarget) ?? 'text'
        if (!field || !tableId) return
        bindings.push({
          id: `${page.id}-binding-${index + 1}`,
          pageId: page.id,
          elementId: createStableElementId(element, page.id),
          target,
          contextKey: 'record',
          dataSourceId: supabaseDataSourceId(tableId),
          sourceMode,
          field,
        })
      })
    parsed.querySelectorAll<HTMLElement>(`[${DATA_REPEATER_ATTRIBUTE}]`)
      .forEach((element, index) => {
        const requestedTableId = element.getAttribute(DATA_REPEATER_ATTRIBUTE)?.trim()
        const tableId = requestedTableId && requestedTableId !== 'true'
          ? requestedTableId
          : fallbackTableId
        if (!tableId) return
        const requestedPageSize = Number.parseInt(element.getAttribute(DATA_PAGE_SIZE_ATTRIBUTE) ?? '', 10)
        const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0 && requestedPageSize <= 100
          ? requestedPageSize
          : undefined
        const componentRoot = element.closest<HTMLElement>(`[${DATA_COMPONENT_ATTRIBUTE}]`)
        const safeField = (value: string | null | undefined) => {
          const field = value?.trim()
          return field && /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)?$/.test(field) ? field : undefined
        }
        const orderColumn = safeField(element.getAttribute(DATA_SORT_FIELD_ATTRIBUTE))
        const fixedFilters = [...(componentRoot?.querySelectorAll<HTMLElement>(`[${DATA_FIXED_FILTER_ATTRIBUTE}]`) ?? [])]
          .flatMap((filter): NonNullable<DataRepeater['fixedFilters']> => {
            const field = safeField(filter.getAttribute(DATA_FILTER_FIELD_ATTRIBUTE))
            const operator = filter.getAttribute(DATA_FILTER_OPERATOR_ATTRIBUTE)?.trim()
            const value = filter.getAttribute(DATA_FILTER_VALUE_ATTRIBUTE)?.trim().slice(0, 500)
            if (!field || !value || !['eq', 'contains', 'gte', 'lte'].includes(operator ?? '')) return []
            return [{ field, operator: operator as 'eq' | 'contains' | 'gte' | 'lte', value }]
          })
        const searchField = safeField(componentRoot?.querySelector<HTMLElement>(`[${DATA_SEARCH_FIELD_ATTRIBUTE}]`)
          ?.getAttribute(DATA_SEARCH_FIELD_ATTRIBUTE))
        const filterControls = [...(componentRoot?.querySelectorAll<HTMLElement>(
          `[${DATA_FILTER_CONTROL_ATTRIBUTE}][${DATA_FILTER_FIELD_ATTRIBUTE}]`,
        ) ?? [])].flatMap((control): NonNullable<DataRepeater['filterControls']> => {
          const field = safeField(control.getAttribute(DATA_FILTER_FIELD_ATTRIBUTE))
          const kind = control.getAttribute(DATA_FILTER_CONTROL_ATTRIBUTE)?.trim()
          if (!field || !['text', 'number', 'boolean', 'date'].includes(kind ?? '')) return []
          return [{ field, kind: kind as 'text' | 'number' | 'boolean' | 'date' }]
        })
        const visitorSortFields = [...(componentRoot?.querySelectorAll<HTMLOptionElement>(
          `[${DATA_SORT_CONTROL_ATTRIBUTE}] option[data-field]`,
        ) ?? [])].flatMap((option) => safeField(option.dataset.field) ?? [])
        repeaters.push({
          id: `${page.id}-repeater-${index + 1}`,
          pageId: page.id,
          elementId: createStableElementId(element, page.id),
          dataSourceId: supabaseDataSourceId(tableId),
          itemContext: 'record',
          ...(pageSize ? { pageSize } : {}),
          ...(element.getAttribute(DATA_PAGINATION_ATTRIBUTE) === 'true' ? { pagination: true } : {}),
          ...(element.getAttribute('data-builder-empty-message')?.trim()
            ? { emptyMessage: element.getAttribute('data-builder-empty-message')!.trim().slice(0, 300) }
            : {}),
          ...(element.getAttribute('data-builder-error-message')?.trim()
            ? { errorMessage: element.getAttribute('data-builder-error-message')!.trim().slice(0, 300) }
            : {}),
          ...(element.getAttribute('data-builder-user-filter-column')?.trim()
            ? { userFilterColumn: element.getAttribute('data-builder-user-filter-column')!.trim() }
            : {}),
          ...(element.getAttribute('data-builder-include-unpublished') === 'true'
            ? { includeUnpublished: true }
            : {}),
          ...(orderColumn ? {
            orderColumn,
            orderDirection: element.getAttribute(DATA_SORT_DIRECTION_ATTRIBUTE) === 'desc' ? 'desc' : 'asc',
          } as const : {}),
          ...(fixedFilters.length ? { fixedFilters } : {}),
          ...(searchField ? { searchField } : {}),
          ...(filterControls.length ? { filterControls } : {}),
          ...(visitorSortFields.length ? { visitorSortFields: [...new Set(visitorSortFields)] } : {}),
        })
      })
    files.push({
      path: filesByPage.get(page.id)!,
      mediaType: 'text/html',
      bytes: encoder.encode(markup),
    })
  })

  if (normalizedData?.publishableKey && !isSafePublishableKey(normalizedData.publishableKey)) {
    throw new Error('La clave de Supabase no es publicable. Nunca exportes una secret key.')
  }

  if ((bindings.length || repeaters.length) && (!normalizedData
    || !normalizedData.projectUrl
    || !isSafePublishableKey(normalizedData.publishableKey))) {
    throw new Error('Conecta y verifica Supabase antes de exportar elementos con datos.')
  }

  if (recordToggles.length && (!normalizedData
    || !normalizedData.projectUrl
    || !isSafePublishableKey(normalizedData.publishableKey))) {
    throw new Error('Conecta y verifica Supabase antes de guardar registros desde un botón.')
  }

  if (dataActions.length && (!normalizedData
    || !normalizedData.projectUrl
    || !isSafePublishableKey(normalizedData.publishableKey))) {
    throw new Error('Conecta y verifica Supabase antes de modificar registros desde el sitio.')
  }

  if (motionActivities.some((activity) => activity.reference.type === 'data'
    || activity.referenceOutput.type === 'supabase'
    || activity.persistence)
    && (!normalizedData || !normalizedData.projectUrl || !isSafePublishableKey(normalizedData.publishableKey))) {
    throw new Error('Conecta y verifica Supabase antes de usar referencias o resultados de movimiento con datos.')
  }

  if (normalizedData?.projectUrl && normalizedData.publishableKey) {
    files.push({
      path: 'database/setup.sql',
      mediaType: 'application/sql',
      bytes: encoder.encode(createSupabaseSetupSql(normalizedData)),
    })
  }

  return {
    manifest: {
      version: 2,
      name,
      startPage,
      pages: pages.map((page) => ({
        id: page.id,
        name: page.name,
        ...(page.id === authPage?.id
          ? { access: 'guestOnly' as const }
          : page.access
            ? { access: page.access, ...(page.access === 'role' ? { roles: page.roles ?? [] } : {}) }
            : authPage ? { access: 'authenticated' as const } : {}),
        file: filesByPage.get(page.id)!,
      })),
      connections,
      elementOverrides: [],
      ...(authPage && normalizedData?.projectUrl && normalizedData.publishableKey ? {
        authentication: {
          provider: 'supabase' as const,
          projectUrl: normalizedData.projectUrl,
          publishableKey: normalizedData.publishableKey,
          loginPage: authPage.id,
          afterLoginPage: startPage === authPage.id
            ? pages.find((page) => page.id !== authPage.id)?.id ?? authPage.id
            : startPage,
          afterLogoutPage: authPage.id,
        },
      } : {}),
      ...(normalizedData?.projectUrl && normalizedData.publishableKey ? {
        dataSources: normalizedData.tables.map((table) => {
          const storageBuckets = [...new Map(normalizedData.tables.flatMap((candidate) =>
            candidate.fields.flatMap((field) => field.upload
              ? [[field.upload.bucket, { name: field.upload.bucket, public: field.upload.visibility === 'public' }] as const]
              : []))).values()]
          const relations = table.relations.flatMap((relation) => {
            const target = normalizedData.tables.find((candidate) => candidate.id === relation.targetTableId)
            if (!target || target.access === 'private') return []
            return [{
              alias: relationAlias(relation),
              column: relation.column,
              dataSourceId: supabaseDataSourceId(target.id),
              displayField: relationDisplayField(normalizedData, relation),
              table: target.name,
              targetColumn: relation.targetColumn,
            }]
          })
          const recentColumn = table.name === 'practice_attempts'
            ? 'created_at'
            : table.name === 'practice_progress'
              ? 'last_practiced_at'
              : table.name === 'favorite_practices' ? 'created_at' : undefined
          return {
            id: supabaseDataSourceId(table.id),
            name: table.name,
            type: 'supabase' as const,
            projectUrl: normalizedData.projectUrl,
            publishableKey: normalizedData.publishableKey,
            table: table.name,
            publishedOnly: table.access === 'public_read',
            requiresAuth: table.access !== 'public_read',
            ...(storageBuckets.length ? { storageBuckets } : {}),
            ...(relations.length ? { relations } : {}),
            ...(table.access === 'public_read' ? { orderColumn: 'sort_order', orderDirection: 'asc' as const } : {}),
            ...(recentColumn ? { orderColumn: recentColumn, orderDirection: 'desc' as const } : {}),
          }
        }),
      } : {}),
      ...(bindings.length ? { bindings } : {}),
      ...(repeaters.length ? { repeaters } : {}),
      ...(recordToggles.length ? { recordToggles } : {}),
      ...(dataActions.length ? { dataActions } : {}),
      ...(motionActivities.length ? { motionActivities } : {}),
    },
    files,
  }
}

export function addProjectFunctionRuntime(
  bundle: ProjectBundle,
  registrations: ExternalFunctionRegistration[],
  rawLibraries: RawJavaScriptRuntimeLibrary[] = [],
) {
  const filesByPath = new Map(bundle.files.map((file) => [file.path, file]))
  const decoder = new TextDecoder()
  const usedFunctionIds = new Set<string>()
  let usesJsLab = false
  let usesPythonLab = false
  bundle.manifest.pages.forEach((page) => {
    const file = filesByPath.get(page.file)
    if (!file) return
    const document = new DOMParser().parseFromString(decoder.decode(file.bytes), 'text/html')
    if (document.querySelector(`[${JS_LAB_ATTRIBUTE}]`)) usesJsLab = true
    if (document.querySelector(`[${PYTHON_LAB_ATTRIBUTE}]`)) usesPythonLab = true
    document.querySelectorAll<HTMLElement>(`[${EXTERNAL_FUNCTION_ATTRIBUTE}]`).forEach((element) => {
      const id = element.getAttribute(EXTERNAL_FUNCTION_ATTRIBUTE)?.trim()
      if (id) usedFunctionIds.add(id)
    })
  })
  if (!usedFunctionIds.size && !usesJsLab && !usesPythonLab) return bundle

  const registrationsById = new Map(registrations.map((registration) => [
    registration.metadata.id,
    registration,
  ]))
  const usedRegistrations = (usesJsLab ? registrations : [...usedFunctionIds].map((id) => {
    const registration = registrationsById.get(id)
    if (!registration) throw new Error(`No se encontró la función “${id}” usada por el proyecto.`)
    return registration
  }))
  const runtimeFile: ProjectFile = {
    bytes: new TextEncoder().encode(createFunctionBlockRuntimeSource(usedRegistrations, usesJsLab ? rawLibraries : [])),
    mediaType: 'text/javascript',
    path: 'builder-runtime/functions.js',
  }
  const pythonRuntimeFile: ProjectFile = {
    bytes: new TextEncoder().encode(createPythonLabRuntimeSource()),
    mediaType: 'text/javascript',
    path: 'builder-runtime/python.js',
  }
  return {
    ...bundle,
    files: [
      ...bundle.files.filter((file) => file.path !== runtimeFile.path && file.path !== pythonRuntimeFile.path),
      ...((usedFunctionIds.size || usesJsLab) ? [runtimeFile] : []),
      ...(usesPythonLab ? [pythonRuntimeFile] : []),
    ],
  }
}

export function editorProjectBundle(
  editor: Editor,
  supabaseConfig?: SupabaseEditorConfig,
  functionRegistrations: ExternalFunctionRegistration[] = externalFunctionRegistrations,
  rawLibraries: RawJavaScriptRuntimeLibrary[] = [],
) {
  const pages = editor.Pages.getAll().map((page) => {
    const component = page.getMainComponent()
    const body = document.createElement('body')
    Object.entries(component.getAttributes()).forEach(([name, value]) => {
      if (value !== false && value != null) body.setAttribute(name, String(value))
    })
    Object.entries(component.getStyle()).forEach(([property, value]) => {
      if (value != null) body.style.setProperty(property, String(value))
    })
    body.innerHTML = editor.getHtml({ component })
    return {
      id: page.getId(),
      isStartPage: page.get('isStartPage') === true,
      name: page.getName() || 'Sin título',
      access: page.get('access') as EditorExportPage['access'],
      roles: Array.isArray(page.get('roles'))
        ? (page.get('roles') as unknown[]).filter((role): role is string => typeof role === 'string')
        : undefined,
      html: body.outerHTML,
      css: editor.getCss({ component, keepUnusedStyles: true }),
      js: editor.getJs({ component }),
    }
  })

  return addProjectFunctionRuntime(buildEditorProjectBundle(
    pages,
    pages.find((page) => page.isStartPage)?.id ?? pages[0]?.id ?? '',
    'Sitio creado con Visual Builder',
    supabaseConfig,
  ), functionRegistrations, rawLibraries)
}

export async function exportEditorProject(
  editor: Editor,
  supabaseConfig?: SupabaseEditorConfig,
  functionRegistrations: ExternalFunctionRegistration[] = externalFunctionRegistrations,
  rawLibraries: RawJavaScriptRuntimeLibrary[] = [],
) {
  await editor.store()
  const bundle = editorProjectBundle(editor, supabaseConfig, functionRegistrations, rawLibraries)
  const blob = await zipProjectExporter.export(bundle)
  const validation = await validateStaticArchive(blob)
  if (!validation.valid) {
    throw new Error(`La exportación no está lista: ${validation.errors[0]}`)
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeFilename(bundle.manifest.name)
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
