import {
  DATA_BIND_FIELD_ATTRIBUTE,
  DATA_BIND_TARGET_ATTRIBUTE,
  DATA_REPEATER_ATTRIBUTE,
  DATA_SCOPE_ATTRIBUTE,
  DATA_SOURCE_ATTRIBUTE,
} from './supabase-data'
import type { SupabaseField, SupabaseTableConfig } from './supabase-data'

export type DataComponentTemplateId = 'card_grid' | 'carousel' | 'simple_list' | 'featured_detail'
export type DataComponentSlotId = 'media' | 'title' | 'description' | 'badge'
export type DataComponentMapping = Partial<Record<DataComponentSlotId, string>>
export const DATA_PAGE_SIZE_ATTRIBUTE = 'data-builder-page-size'
export const DATA_PAGINATION_ATTRIBUTE = 'data-builder-pagination'
export const DATA_DESIGN_PLACEHOLDER_ATTRIBUTE = 'data-builder-design-placeholder'
export const DATA_DESIGN_PREVIEW_COUNT_ATTRIBUTE = 'data-builder-design-preview-count'
export const DATA_COMPONENT_ATTRIBUTE = 'data-builder-data-component'
export const DATA_SORT_FIELD_ATTRIBUTE = 'data-builder-sort-field'
export const DATA_SORT_DIRECTION_ATTRIBUTE = 'data-builder-sort-direction'
export const DATA_FIXED_FILTER_ATTRIBUTE = 'data-builder-fixed-filter'
export const DATA_FILTER_FIELD_ATTRIBUTE = 'data-builder-filter-field'
export const DATA_FILTER_OPERATOR_ATTRIBUTE = 'data-builder-filter-operator'
export const DATA_FILTER_VALUE_ATTRIBUTE = 'data-builder-filter-value'
export const DATA_FILTER_CONTROL_ATTRIBUTE = 'data-builder-filter-control'
export const DATA_FILTER_BOUND_ATTRIBUTE = 'data-builder-filter-bound'
export const DATA_SEARCH_FIELD_ATTRIBUTE = 'data-builder-search-field'
export const DATA_SORT_CONTROL_ATTRIBUTE = 'data-builder-sort-control'
export const DATA_FILTER_CLEAR_ATTRIBUTE = 'data-builder-filter-clear'

export type DataFilterOperator = 'eq' | 'contains' | 'gte' | 'lte'
export interface DataComponentFixedFilter {
  field: string
  operator: DataFilterOperator
  value: string
}
export interface DataComponentVisitorFilter {
  field: string
  kind: 'text' | 'number' | 'boolean' | 'date'
}
export interface DataComponentOptions {
  mediaKind: 'image' | 'video'
  desktopColumns?: number
  tabletColumns?: number
  mobileColumns?: number
  pageSize?: number
  pagination?: boolean
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  fixedFilters?: DataComponentFixedFilter[]
  searchField?: string
  visitorFilters?: DataComponentVisitorFilter[]
  visitorSort?: boolean
  visitorSortFields?: string[]
}

export interface ResolvedDataComponentOptions {
  mediaKind: 'image' | 'video'
  desktopColumns: number
  tabletColumns: number
  mobileColumns: number
  pageSize: number
  pagination: boolean
  sortField?: string
  sortDirection: 'asc' | 'desc'
  fixedFilters: DataComponentFixedFilter[]
  searchField?: string
  visitorFilters: DataComponentVisitorFilter[]
  visitorSort: boolean
  visitorSortFields: string[]
}

export interface DataComponentTemplate {
  description: string
  id: DataComponentTemplateId
  name: string
  repeatMode: 'collection' | 'first'
  responsiveSummary: string
  slots: Array<{
    accepts: SupabaseField['type'][]
    id: DataComponentSlotId
    label: string
    target: 'src' | 'text'
  }>
}

export interface DataComponentSettings {
  mapping: DataComponentMapping
  options: ResolvedDataComponentOptions
  tableId: string
  templateId: DataComponentTemplateId
}

export const dataComponentTemplates: DataComponentTemplate[] = [{
  id: 'card_grid',
  name: 'Cuadrícula de tarjetas',
  description: 'Tarjetas con imagen, título, descripción e indicador.',
  repeatMode: 'collection',
  responsiveSummary: '4 × 3 escritorio/tableta · 2 × 6 móvil',
  slots: [
    { id: 'media', label: 'Imagen o video', target: 'src', accepts: ['media', 'url'] },
    { id: 'title', label: 'Título', target: 'text', accepts: ['text', 'long_text', 'number', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
    { id: 'description', label: 'Texto descriptivo', target: 'text', accepts: ['long_text', 'text', 'number', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
    { id: 'badge', label: 'Indicador', target: 'text', accepts: ['number', 'text', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
  ],
}, {
  id: 'carousel',
  name: 'Carrusel deslizable',
  description: 'Tarjetas horizontales que se deslizan con toque o trackpad.',
  repeatMode: 'collection',
  responsiveSummary: '4 visibles · 3 en tableta · 1 en móvil',
  slots: [
    { id: 'media', label: 'Imagen o video', target: 'src', accepts: ['media', 'url'] },
    { id: 'title', label: 'Título', target: 'text', accepts: ['text', 'long_text', 'number', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
    { id: 'description', label: 'Texto descriptivo', target: 'text', accepts: ['long_text', 'text', 'number', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
    { id: 'badge', label: 'Indicador', target: 'text', accepts: ['number', 'text', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
  ],
}, {
  id: 'simple_list',
  name: 'Lista visual',
  description: 'Filas compactas con miniatura y texto.',
  repeatMode: 'collection',
  responsiveSummary: 'Horizontal · se apila en móvil',
  slots: [
    { id: 'media', label: 'Miniatura', target: 'src', accepts: ['media', 'url'] },
    { id: 'title', label: 'Título', target: 'text', accepts: ['text', 'long_text', 'number', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
    { id: 'description', label: 'Texto descriptivo', target: 'text', accepts: ['long_text', 'text', 'number', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
    { id: 'badge', label: 'Indicador', target: 'text', accepts: ['number', 'text', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
  ],
}, {
  id: 'featured_detail',
  name: 'Detalle destacado',
  description: 'Un elemento con medios grandes y contenido descriptivo.',
  repeatMode: 'first',
  responsiveSummary: '2 columnas · vertical en móvil',
  slots: [
    { id: 'media', label: 'Imagen o video', target: 'src', accepts: ['media', 'url'] },
    { id: 'title', label: 'Título', target: 'text', accepts: ['text', 'long_text', 'number', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
    { id: 'description', label: 'Texto descriptivo', target: 'text', accepts: ['long_text', 'text', 'number', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
    { id: 'badge', label: 'Indicador', target: 'text', accepts: ['number', 'text', 'boolean', 'date', 'datetime', 'url', 'uuid'] },
  ],
}]

const slotPatterns: Record<DataComponentSlotId, RegExp[]> = {
  media: [/media/, /image|imagen/, /photo|foto/, /video/, /cover|portada/],
  title: [/title|titulo/, /name|nombre/, /heading|encabezado/, /label|etiqueta/],
  description: [/description|descripcion/, /summary|resumen/, /feedback|comentario/, /instructions|instrucciones/, /details|detalles/],
  badge: [/score|puntaje|puntuacion/, /difficulty|dificultad/, /category|categoria/, /status|estado/, /price|precio/, /level|nivel/],
}

export function effectiveDataFields(table: SupabaseTableConfig): SupabaseField[] {
  const verified = table.verifiedSchema?.fields ?? []
  const configuredByName = new Map(table.fields.map((field) => [field.name, field]))
  const source = verified.length ? verified.map((field, index) => ({
    id: field.id ?? configuredByName.get(field.name)?.id ?? `verified-${index}-${field.name}`,
    name: field.name,
    type: field.type,
  })) : table.fields
  return [...new Map(source.map((field) => [field.name, field])).values()]
}

export function compatibleFieldsForSlot(
  templateId: DataComponentTemplateId,
  slotId: DataComponentSlotId,
  table: SupabaseTableConfig,
  mapping: DataComponentMapping = {},
  additionalFields: SupabaseField[] = [],
) {
  const slot = dataComponentTemplateById(templateId).slots.find((candidate) => candidate.id === slotId)
  if (!slot) return []
  const usedElsewhere = new Set(Object.entries(mapping).flatMap(([candidateSlot, field]) =>
    candidateSlot !== slotId && field ? [field] : []))
  return [...effectiveDataFields(table), ...additionalFields].filter((field) =>
    slot.accepts.includes(field.type) && !usedElsewhere.has(field.name))
}

export function filterControlKind(field: SupabaseField) {
  if (field.type === 'text' || field.type === 'long_text') return 'text' as const
  if (field.type === 'number') return 'number' as const
  if (field.type === 'boolean') return 'boolean' as const
  if (field.type === 'date' || field.type === 'datetime') return 'date' as const
  return null
}

export function dataComponentTemplateById(id: DataComponentTemplateId) {
  return dataComponentTemplates.find((template) => template.id === id) ?? dataComponentTemplates[0]
}

export function defaultDataComponentOptions(templateId: DataComponentTemplateId): ResolvedDataComponentOptions {
  const queryDefaults = {
    sortDirection: 'asc' as const,
    fixedFilters: [],
    visitorFilters: [],
    visitorSort: false,
    visitorSortFields: [],
  }
  if (templateId === 'simple_list') {
    return { ...queryDefaults, mediaKind: 'image', desktopColumns: 1, tabletColumns: 1, mobileColumns: 1, pageSize: 12, pagination: true }
  }
  if (templateId === 'featured_detail') {
    return { ...queryDefaults, mediaKind: 'image', desktopColumns: 1, tabletColumns: 1, mobileColumns: 1, pageSize: 1, pagination: false }
  }
  if (templateId === 'carousel') {
    return { ...queryDefaults, mediaKind: 'image', desktopColumns: 4, tabletColumns: 3, mobileColumns: 1, pageSize: 12, pagination: true }
  }
  return { ...queryDefaults, mediaKind: 'image', desktopColumns: 4, tabletColumns: 4, mobileColumns: 2, pageSize: 12, pagination: true }
}

function normalizedDataComponentOptions(
  templateId: DataComponentTemplateId,
  options: DataComponentOptions,
): ResolvedDataComponentOptions {
  const defaults = defaultDataComponentOptions(templateId)
  const numberOption = (value: number | undefined, fallback: number, maximum: number) =>
    Math.min(maximum, Math.max(1, Number.isFinite(value) ? Math.round(value!) : fallback))
  return {
    mediaKind: options.mediaKind ?? defaults.mediaKind,
    desktopColumns: numberOption(options.desktopColumns, defaults.desktopColumns, 6),
    tabletColumns: numberOption(options.tabletColumns, defaults.tabletColumns, 6),
    mobileColumns: numberOption(options.mobileColumns, defaults.mobileColumns, 3),
    pageSize: numberOption(options.pageSize, defaults.pageSize, 100),
    pagination: options.pagination ?? defaults.pagination,
    ...(options.sortField?.trim() ? { sortField: options.sortField.trim() } : {}),
    sortDirection: options.sortDirection === 'desc' ? 'desc' : 'asc',
    fixedFilters: (options.fixedFilters ?? []).filter((filter) =>
      filter.field.trim() && filter.value.trim()),
    ...(options.searchField?.trim() ? { searchField: options.searchField.trim() } : {}),
    visitorFilters: [...new Map((options.visitorFilters ?? [])
      .filter((filter) => filter.field.trim() && filter.field !== options.searchField)
      .map((filter) => [filter.field, filter])).values()],
    visitorSort: Boolean(options.visitorSort),
    visitorSortFields: [...new Set((options.visitorSortFields ?? []).filter(Boolean))],
  }
}

export function dataComponentDesignPreviewCount(
  templateId: DataComponentTemplateId,
  options: DataComponentOptions,
) {
  const resolvedOptions = normalizedDataComponentOptions(templateId, options)
  if (templateId === 'featured_detail') return 1
  const largestColumnCount = Math.max(
    resolvedOptions.desktopColumns,
    resolvedOptions.tabletColumns,
    resolvedOptions.mobileColumns,
  )
  const rowCount = templateId === 'carousel' ? 1 : 2
  return Math.min(resolvedOptions.pageSize, largestColumnCount * rowCount)
}

export function findDataComponentRoot(element: Element) {
  return element.closest<HTMLElement>(`[${DATA_COMPONENT_ATTRIBUTE}]`)
    ?? element.closest<HTMLElement>([
    '.builder-data-grid',
    '.builder-data-carousel',
    '.builder-data-list',
    '.builder-data-featured',
  ].join(','))
}

export function readDataComponentSettings(root: HTMLElement): DataComponentSettings | null {
  const requestedTemplateId = root.getAttribute(DATA_COMPONENT_ATTRIBUTE)
    || (root.classList.contains('builder-data-carousel') ? 'carousel'
      : root.classList.contains('builder-data-list') ? 'simple_list'
        : root.classList.contains('builder-data-featured') ? 'featured_detail'
          : root.classList.contains('builder-data-grid') ? 'card_grid'
            : '')
  if (requestedTemplateId !== 'carousel'
    && requestedTemplateId !== 'simple_list'
    && requestedTemplateId !== 'featured_detail'
    && requestedTemplateId !== 'card_grid') return null
  const templateId: DataComponentTemplateId = requestedTemplateId
  const repeater = root.matches(`[${DATA_REPEATER_ATTRIBUTE}]`)
    ? root
    : root.querySelector<HTMLElement>(`[${DATA_REPEATER_ATTRIBUTE}]`)
  const firstBinding = root.matches(`[${DATA_SOURCE_ATTRIBUTE}]`)
    ? root
    : root.querySelector<HTMLElement>(`[${DATA_SOURCE_ATTRIBUTE}]`)
  const tableId = repeater?.getAttribute(DATA_REPEATER_ATTRIBUTE)
    ?? firstBinding?.getAttribute(DATA_SOURCE_ATTRIBUTE)
    ?? ''
  if (!tableId || tableId === 'true') return null

  const field = (selector: string) => root.querySelector<HTMLElement>(selector)
    ?.getAttribute(DATA_BIND_FIELD_ATTRIBUTE) || undefined
  const mapping: DataComponentMapping = {
    media: field(`.builder-data-card__media[${DATA_BIND_FIELD_ATTRIBUTE}],.builder-data-list__media[${DATA_BIND_FIELD_ATTRIBUTE}],.builder-data-featured__media[${DATA_BIND_FIELD_ATTRIBUTE}]`),
    title: field(`.builder-data-card__content h2[${DATA_BIND_FIELD_ATTRIBUTE}],.builder-data-card__content h3[${DATA_BIND_FIELD_ATTRIBUTE}],.builder-data-list__content h3[${DATA_BIND_FIELD_ATTRIBUTE}],.builder-data-featured__content h2[${DATA_BIND_FIELD_ATTRIBUTE}]`),
    description: field(`.builder-data-card__content p[${DATA_BIND_FIELD_ATTRIBUTE}],.builder-data-list__content p[${DATA_BIND_FIELD_ATTRIBUTE}],.builder-data-featured__content p[${DATA_BIND_FIELD_ATTRIBUTE}]`),
    badge: field(`.builder-data-badge[${DATA_BIND_FIELD_ATTRIBUTE}]`),
  }
  const defaults = defaultDataComponentOptions(templateId)
  const styleNumber = (property: string, fallback: number) => {
    const value = Number.parseFloat(root.style.getPropertyValue(property))
    return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback
  }
  const requestedPageSize = Number.parseInt(repeater?.getAttribute(DATA_PAGE_SIZE_ATTRIBUTE) ?? '', 10)
  const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0 && requestedPageSize <= 100
    ? requestedPageSize
    : defaults.pageSize
  const fixedFilters = [...root.querySelectorAll<HTMLElement>(`[${DATA_FIXED_FILTER_ATTRIBUTE}]`)]
    .flatMap((element): DataComponentFixedFilter[] => {
      const field = element.getAttribute(DATA_FILTER_FIELD_ATTRIBUTE)?.trim()
      const operator = element.getAttribute(DATA_FILTER_OPERATOR_ATTRIBUTE)?.trim()
      const value = element.getAttribute(DATA_FILTER_VALUE_ATTRIBUTE)?.trim()
      if (!field || !value || !['eq', 'contains', 'gte', 'lte'].includes(operator ?? '')) return []
      return [{ field, operator: operator as DataFilterOperator, value }]
    })
  const searchField = root.querySelector<HTMLElement>(`[${DATA_SEARCH_FIELD_ATTRIBUTE}]`)
    ?.getAttribute(DATA_SEARCH_FIELD_ATTRIBUTE)?.trim()
  const visitorFilters = [...root.querySelectorAll<HTMLElement>(`[${DATA_FILTER_CONTROL_ATTRIBUTE}][${DATA_FILTER_FIELD_ATTRIBUTE}]`)]
    .flatMap((element): DataComponentVisitorFilter[] => {
      const field = element.getAttribute(DATA_FILTER_FIELD_ATTRIBUTE)?.trim()
      const kind = element.getAttribute(DATA_FILTER_CONTROL_ATTRIBUTE)?.trim()
      if (!field || !['text', 'number', 'boolean', 'date'].includes(kind ?? '')) return []
      return [{ field, kind: kind as DataComponentVisitorFilter['kind'] }]
    })

  return {
    mapping,
    options: {
      mediaKind: root.querySelector('video') ? 'video' : 'image',
      desktopColumns: styleNumber('--builder-data-cols-desktop', defaults.desktopColumns),
      tabletColumns: styleNumber('--builder-data-cols-tablet', defaults.tabletColumns),
      mobileColumns: styleNumber('--builder-data-cols-mobile', defaults.mobileColumns),
      pageSize,
      pagination: repeater?.getAttribute(DATA_PAGINATION_ATTRIBUTE) === 'true',
      ...(repeater?.getAttribute(DATA_SORT_FIELD_ATTRIBUTE)?.trim()
        ? { sortField: repeater.getAttribute(DATA_SORT_FIELD_ATTRIBUTE)!.trim() }
        : {}),
      sortDirection: repeater?.getAttribute(DATA_SORT_DIRECTION_ATTRIBUTE) === 'desc' ? 'desc' : 'asc',
      fixedFilters,
      ...(searchField ? { searchField } : {}),
      visitorFilters: [...new Map(visitorFilters.map((filter) => [filter.field, filter])).values()],
      visitorSort: Boolean(root.querySelector(`[${DATA_SORT_CONTROL_ATTRIBUTE}]`)),
      visitorSortFields: [...new Set([...root.querySelectorAll<HTMLOptionElement>(`[${DATA_SORT_CONTROL_ATTRIBUTE}] option[data-field]`)]
        .flatMap((option) => option.dataset.field || []))],
    },
    tableId,
    templateId,
  }
}

export function suggestDataComponentMapping(
  templateId: DataComponentTemplateId,
  table: SupabaseTableConfig,
): DataComponentMapping {
  const template = dataComponentTemplateById(templateId)
  const used = new Set<string>()
  const mapping: DataComponentMapping = {}
  const fields = effectiveDataFields(table)
  template.slots.forEach((slot) => {
    const candidates = fields.filter((field) => !used.has(field.name))
    const match = candidates.find((field) =>
      slot.accepts.includes(field.type) && slotPatterns[slot.id].some((pattern) => pattern.test(field.name)))
    if (match) {
      mapping[slot.id] = match.name
      used.add(match.name)
    }
  })
  return mapping
}

function bindingAttributes(
  tableId: string,
  field: string | undefined,
  target: 'src' | 'text',
  sourceMode: 'context' | 'first',
) {
  if (!field) return ''
  return ` ${DATA_BIND_FIELD_ATTRIBUTE}="${field}" ${DATA_BIND_TARGET_ATTRIBUTE}="${target}" ${DATA_SOURCE_ATTRIBUTE}="${tableId}" ${DATA_SCOPE_ATTRIBUTE}="${sourceMode}"`
}

export function createDataComponentMarkup(
  templateId: DataComponentTemplateId,
  tableId: string,
  mapping: DataComponentMapping,
  options: DataComponentOptions = { mediaKind: 'image' },
) {
  const resolvedOptions = normalizedDataComponentOptions(templateId, options)
  const sourceMode = 'context'
  const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const escapeAttribute = (value: string) => escapeText(value).replace(/"/g, '&quot;')
  const readableField = (value: string) => value.replace('.', ' → ').replace(/_/g, ' ')
  const fieldLabel = (field: string | undefined, fallback: string) => field
    ? `${fallback}: ${field.replace(/_/g, ' ')}`
    : fallback
  const binding = (field: string | undefined, target: 'src' | 'text', includeBindings: boolean) =>
    includeBindings ? bindingAttributes(tableId, field, target, sourceMode) : ''
  const mediaLabel = fieldLabel(mapping.media, 'Imagen o video')
  const titleLabel = fieldLabel(mapping.title, 'Título del elemento')
  const descriptionLabel = fieldLabel(mapping.description, 'Descripción del elemento')
  const badgeLabel = fieldLabel(mapping.badge, 'Indicador')
  const mediaElement = (className: string, placeholder: string, includeBindings = true) => {
    if (!mapping.media) return ''
    return resolvedOptions.mediaKind === 'video'
      ? `<video class="${className}" src="" aria-hidden="true" muted playsinline preload="metadata" tabindex="-1"${binding(mapping.media, 'src', includeBindings)}>${placeholder}</video>`
      : `<img class="${className}" src="https://placehold.co/640x420?text=${encodeURIComponent(mediaLabel)}" alt="${escapeText(mediaLabel)}"${binding(mapping.media, 'src', includeBindings)}>`
  }
  const textContent = (heading: 'h2' | 'h3', className: string, includeBindings = true) => {
    const badge = mapping.badge
      ? `<span class="builder-data-badge"${binding(mapping.badge, 'text', includeBindings)}>${escapeText(badgeLabel)}</span>`
      : ''
    const title = mapping.title
      ? `<${heading}${binding(mapping.title, 'text', includeBindings)}>${escapeText(titleLabel)}</${heading}>`
      : ''
    const description = mapping.description
      ? `<p${binding(mapping.description, 'text', includeBindings)}>${escapeText(descriptionLabel)}</p>`
      : ''
    return badge || title || description ? `<div class="${className}">${badge}${title}${description}</div>` : ''
  }
  const withoutMediaClass = mapping.media ? '' : ' builder-data-item--without-media'
  const layoutStyle = `--builder-data-cols-desktop:${resolvedOptions.desktopColumns};--builder-data-cols-tablet:${resolvedOptions.tabletColumns};--builder-data-cols-mobile:${resolvedOptions.mobileColumns};--builder-data-width-desktop:${100 / resolvedOptions.desktopColumns}%;--builder-data-width-tablet:${100 / resolvedOptions.tabletColumns}%;--builder-data-width-mobile:${100 / resolvedOptions.mobileColumns}%`
  const designPreviewCount = dataComponentDesignPreviewCount(templateId, resolvedOptions)
  const sortAttributes = resolvedOptions.sortField
    ? ` ${DATA_SORT_FIELD_ATTRIBUTE}="${escapeAttribute(resolvedOptions.sortField)}" ${DATA_SORT_DIRECTION_ATTRIBUTE}="${resolvedOptions.sortDirection}"`
    : ''
  const repeaterAttributes = `${DATA_REPEATER_ATTRIBUTE}="${tableId}" ${DATA_PAGE_SIZE_ATTRIBUTE}="${resolvedOptions.pageSize}" ${DATA_PAGINATION_ATTRIBUTE}="${resolvedOptions.pagination}" ${DATA_DESIGN_PREVIEW_COUNT_ATTRIBUTE}="${designPreviewCount}"${sortAttributes}`
  const fixedFilterMarkup = resolvedOptions.fixedFilters.map((filter) =>
    `<span ${DATA_FIXED_FILTER_ATTRIBUTE}="true" ${DATA_FILTER_FIELD_ATTRIBUTE}="${escapeAttribute(filter.field)}" ${DATA_FILTER_OPERATOR_ATTRIBUTE}="${filter.operator}" ${DATA_FILTER_VALUE_ATTRIBUTE}="${escapeAttribute(filter.value)}" hidden></span>`).join('')
  const searchMarkup = resolvedOptions.searchField
    ? `<label class="builder-data-control builder-data-control--search"><span>Buscar por ${escapeText(readableField(resolvedOptions.searchField))}</span><input type="search" ${DATA_SEARCH_FIELD_ATTRIBUTE}="${escapeAttribute(resolvedOptions.searchField)}" placeholder="Buscar…" autocomplete="off"></label>`
    : ''
  const visitorFilterMarkup = resolvedOptions.visitorFilters.map((filter) => {
    const field = escapeAttribute(filter.field)
    const label = escapeText(readableField(filter.field))
    if (filter.kind === 'number' || filter.kind === 'date') {
      const inputType = filter.kind === 'number' ? 'number' : 'date'
      return `<fieldset class="builder-data-control builder-data-control--range" ${DATA_FILTER_CONTROL_ATTRIBUTE}="${filter.kind}" ${DATA_FILTER_FIELD_ATTRIBUTE}="${field}"><legend>${label}</legend><label>Desde<input type="${inputType}" ${DATA_FILTER_BOUND_ATTRIBUTE}="min"></label><label>Hasta<input type="${inputType}" ${DATA_FILTER_BOUND_ATTRIBUTE}="max"></label></fieldset>`
    }
    if (filter.kind === 'boolean') {
      return `<label class="builder-data-control"><span>${label}</span><select ${DATA_FILTER_CONTROL_ATTRIBUTE}="boolean" ${DATA_FILTER_FIELD_ATTRIBUTE}="${field}"><option value="">Todos</option><option value="true">Sí</option><option value="false">No</option></select></label>`
    }
    return `<label class="builder-data-control"><span>${label}</span><input type="search" ${DATA_FILTER_CONTROL_ATTRIBUTE}="text" ${DATA_FILTER_FIELD_ATTRIBUTE}="${field}" placeholder="Filtrar…" autocomplete="off"></label>`
  }).join('')
  const visitorSortMarkup = resolvedOptions.visitorSort && resolvedOptions.visitorSortFields.length
    ? `<label class="builder-data-control"><span>Ordenar</span><select ${DATA_SORT_CONTROL_ATTRIBUTE}="true"><option value="">Orden original</option>${resolvedOptions.visitorSortFields.flatMap((field) => [
      `<option data-field="${escapeAttribute(field)}" value="${escapeAttribute(field)}.asc">${escapeText(readableField(field))} · ascendente</option>`,
      `<option data-field="${escapeAttribute(field)}" value="${escapeAttribute(field)}.desc">${escapeText(readableField(field))} · descendente</option>`,
    ]).join('')}</select></label>`
    : ''
  const hasVisitorControls = Boolean(searchMarkup || visitorFilterMarkup || visitorSortMarkup)
  const dataControls = `${fixedFilterMarkup}${hasVisitorControls
    ? `<form class="builder-data-controls" data-builder-filter-form><div class="builder-data-controls__fields">${searchMarkup}${visitorFilterMarkup}${visitorSortMarkup}</div><button class="builder-data-controls__clear" ${DATA_FILTER_CLEAR_ATTRIBUTE}="true" type="reset">Limpiar filtros</button></form>`
    : ''}`
  const repeatDesignItems = (render: (attributes: string, includeBindings: boolean) => string) =>
    Array.from({ length: designPreviewCount }, (_, index) => render(
      index === 0 ? repeaterAttributes : `${DATA_DESIGN_PLACEHOLDER_ATTRIBUTE}="true"`,
      index === 0,
    )).join('\n')
  if (templateId === 'carousel') {
    return `<section ${DATA_COMPONENT_ATTRIBUTE}="${templateId}" class="builder-data-responsive-frame" aria-label="Carrusel de información" style="${layoutStyle}">${dataControls}
      <div class="builder-data-carousel" tabindex="0">
        ${repeatDesignItems((attributes, includeBindings) => `<article class="builder-data-carousel__item${withoutMediaClass}" ${attributes}>
        ${mediaElement('builder-data-card__media', 'Tu navegador no puede reproducir este video.', includeBindings)}
        ${textContent('h3', 'builder-data-card__content', includeBindings)}
        </article>`)}
      </div>
    </section>`
  }
  if (templateId === 'simple_list') {
    return `<section ${DATA_COMPONENT_ATTRIBUTE}="${templateId}" class="builder-data-responsive-frame" aria-label="Lista de información" style="${layoutStyle}">${dataControls}
      <div class="builder-data-list">
        ${repeatDesignItems((attributes, includeBindings) => `<article class="builder-data-list__item${withoutMediaClass}" ${attributes}>
        ${mediaElement('builder-data-list__media', 'Tu navegador no puede reproducir este video.', includeBindings)}
        ${textContent('h3', 'builder-data-list__content', includeBindings)}
        </article>`)}
      </div>
    </section>`
  }
  if (templateId === 'featured_detail') {
    return `<section ${DATA_COMPONENT_ATTRIBUTE}="${templateId}" class="builder-data-responsive-frame">${dataControls}
      <div class="builder-data-featured${withoutMediaClass}" ${repeaterAttributes}>
        ${mediaElement('builder-data-featured__media', 'Tu navegador no puede reproducir este video.')}
        ${textContent('h2', 'builder-data-featured__content')}
      </div>
    </section>`
  }
  return `<section ${DATA_COMPONENT_ATTRIBUTE}="${templateId}" class="builder-data-responsive-frame" aria-label="Cuadrícula de información" style="${layoutStyle}">${dataControls}
    <div class="builder-data-grid">
      ${repeatDesignItems((attributes, includeBindings) => `<article class="builder-data-card${withoutMediaClass}" ${attributes}>
      ${mediaElement('builder-data-card__media', 'Tu navegador no puede reproducir este video.', includeBindings)}
      ${textContent('h3', 'builder-data-card__content', includeBindings)}
      </article>`)}
    </div>
  </section>`
}

export const dataComponentStyles = `
.builder-data-responsive-frame{width:100%;max-width:100%;min-width:0;container-name:builder-data-component;container-type:inline-size}
.builder-data-responsive-frame,.builder-data-responsive-frame *{box-sizing:border-box}
@supports selector(:has(*)){:where(body,main,section,div):has(> .builder-data-grid,> .builder-data-carousel,> .builder-data-list,> .builder-data-featured){container-name:builder-data-component;container-type:inline-size}}
.builder-data-grid{width:100%;max-width:100%;min-width:0;display:grid;grid-template-columns:repeat(var(--builder-data-cols-desktop,4),minmax(0,1fr));gap:1.25rem;padding:1rem .125rem}
.builder-data-card{min-width:0;overflow:hidden;background:#fff;border:1px solid #dce4e2;border-radius:1rem;box-shadow:0 8px 24px rgba(22,54,58,.08)}
.builder-data-card__media{display:block;width:100%;max-width:100%;aspect-ratio:16/10;object-fit:cover;background:#e8efed}
video.builder-data-card__media,video.builder-data-list__media,video.builder-data-featured__media{pointer-events:none}
.builder-data-card__content{display:grid;gap:.65rem;padding:1.1rem}
.builder-data-card h3,.builder-data-list h3,.builder-data-featured h2{margin:0;color:#173f45;line-height:1.2}
.builder-data-card p,.builder-data-list p,.builder-data-featured p{margin:0;color:#5a7378;line-height:1.55;overflow-wrap:anywhere}
.builder-data-badge{width:max-content;max-width:100%;padding:.3rem .55rem;color:#176d65;background:#dff3ef;border-radius:999px;font-size:.75rem;font-weight:800}
.builder-data-carousel{width:100%;max-width:100%;min-width:0;display:flex;gap:1rem;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:inline mandatory;scroll-padding-inline:.125rem;padding:1rem .125rem;scrollbar-width:thin}
.builder-data-carousel__item{flex:0 0 calc(var(--builder-data-width-desktop,25%) - .75rem);min-width:0;overflow:hidden;scroll-snap-align:start;background:#fff;border:1px solid #dce4e2;border-radius:1rem;box-shadow:0 8px 24px rgba(22,54,58,.08)}
.builder-data-carousel__item h3,.builder-data-carousel__item p{margin:0;color:#173f45;line-height:1.45}.builder-data-carousel__item p{color:#5a7378}
.builder-data-list{width:100%;max-width:100%;min-width:0;display:grid;grid-template-columns:repeat(var(--builder-data-cols-desktop,1),minmax(0,1fr));gap:1rem;padding:1rem .125rem}
.builder-data-list__item{min-width:0;display:grid;grid-template-columns:minmax(140px,220px) minmax(0,1fr);gap:1rem;align-items:center;padding:1rem;background:#fff;border:1px solid #dce4e2;border-radius:1rem}
.builder-data-list__media{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:.75rem;background:#e8efed}
.builder-data-list__content{min-width:0;display:grid;gap:.55rem}
.builder-data-featured{width:100%;max-width:100%;min-width:0;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:2rem;align-items:center;padding:1.5rem;background:#f7faf9;border-radius:1.25rem}
.builder-data-featured__media{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:1rem;background:#e8efed}
.builder-data-featured__content{min-width:0;display:grid;gap:.85rem}
.builder-data-list__item.builder-data-item--without-media,.builder-data-featured.builder-data-item--without-media{grid-template-columns:minmax(0,1fr)}
[data-builder-design-placeholder="true"]{opacity:.72}[data-builder-design-placeholder="true"] img{filter:saturate(.55)}
.builder-data-controls{width:100%;margin:0 0 1rem;padding:1rem;display:flex;align-items:end;justify-content:space-between;gap:1rem;background:#f7faf9;border:1px solid #dce4e2;border-radius:1rem}.builder-data-controls__fields{flex:1;display:flex;align-items:end;gap:.75rem;flex-wrap:wrap}.builder-data-control{min-width:min(100%,180px);display:grid;gap:.35rem;color:#294b50;font-size:.82rem;font-weight:750}.builder-data-control input,.builder-data-control select{width:100%;min-height:42px;padding:.55rem .7rem;color:#173f45;background:#fff;border:1px solid #b8cbc7;border-radius:.55rem;font:inherit}.builder-data-control--search{flex:1 1 240px}.builder-data-control--range{min-width:min(100%,280px);margin:0;padding:0;border:0;display:grid;grid-template-columns:1fr 1fr;gap:.5rem}.builder-data-control--range legend{grid-column:1/-1;padding:0;color:#294b50}.builder-data-control--range label{display:grid;gap:.25rem;color:#5a7378;font-size:.75rem}.builder-data-controls__clear{min-height:42px;padding:.55rem .85rem;color:#176d65;background:#fff;border:1px solid #9bbdb7;border-radius:.55rem;cursor:pointer;font-weight:750}
.builder-data-pagination{grid-column:1/-1;width:100%;display:flex;align-items:center;justify-content:center;gap:.75rem;padding:1rem 0}.builder-data-pagination button{min-height:40px;padding:0 1rem;color:#fff;background:#176d65;border:0;border-radius:.55rem;cursor:pointer;font-weight:750}.builder-data-pagination button:disabled{cursor:not-allowed;opacity:.45}.builder-data-pagination span{color:#4f696d;font-size:.9rem;font-weight:700}
.builder-data-pagination[hidden]{display:none}
@media(max-width:900px){.builder-data-grid,.builder-data-list{grid-template-columns:repeat(var(--builder-data-cols-tablet,4),minmax(0,1fr))}.builder-data-carousel__item{flex-basis:calc(var(--builder-data-width-tablet,33.333%) - .67rem)}.builder-data-featured{gap:1.25rem}}
@media(max-width:600px){.builder-data-controls{align-items:stretch;flex-direction:column}.builder-data-controls__fields{display:grid}.builder-data-control,.builder-data-control--search,.builder-data-control--range{width:100%;min-width:0}.builder-data-controls__clear{width:100%}.builder-data-grid,.builder-data-list{grid-template-columns:repeat(var(--builder-data-cols-mobile,2),minmax(0,1fr))}.builder-data-carousel__item{flex-basis:calc(var(--builder-data-width-mobile,100%) - .25rem)}.builder-data-list__item,.builder-data-featured{grid-template-columns:1fr}.builder-data-list__media{aspect-ratio:16/10}.builder-data-featured{padding:1rem}}
@supports(container-type:inline-size){
  @container builder-data-component (max-width:900px){.builder-data-grid,.builder-data-list{grid-template-columns:repeat(var(--builder-data-cols-tablet,4),minmax(0,1fr))}.builder-data-carousel__item{flex-basis:calc(var(--builder-data-width-tablet,33.333%) - .67rem)}.builder-data-featured{gap:1.25rem}}
  @container builder-data-component (max-width:600px){.builder-data-grid,.builder-data-list{grid-template-columns:repeat(var(--builder-data-cols-mobile,2),minmax(0,1fr))}.builder-data-carousel__item{flex-basis:calc(var(--builder-data-width-mobile,100%) - .25rem)}.builder-data-list__item,.builder-data-featured{grid-template-columns:1fr}.builder-data-list__media{aspect-ratio:16/10}.builder-data-featured{padding:1rem}}
}
`
