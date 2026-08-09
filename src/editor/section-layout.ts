import type { Component, Editor } from 'grapesjs'

export const SECTION_GRID_ATTRIBUTE = 'data-builder-section-grid'
export const SECTION_COLUMNS_ATTRIBUTE = 'data-builder-section-columns'
export const SECTION_GAP_ATTRIBUTE = 'data-builder-section-gap'
export const SECTION_MARGIN_ATTRIBUTE = 'data-builder-section-margin'
export const SECTION_PADDING_ATTRIBUTE = 'data-builder-section-padding'
export const SECTION_LAYOUT_OPEN_EVENT = 'builder:section-layout:open'

export const DEFAULT_SECTION_GAP = 20
export const DEFAULT_SECTION_MARGIN = 0
export const DEFAULT_SECTION_PADDING = 32

export type SectionLayoutSettings = {
  columns: number[]
  gap: number
  margin: number
  padding: number
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}

function hasClass(component: Component | null | undefined, className: string) {
  return Boolean(component?.getClasses().includes(className))
}

function equalColumns(count: number) {
  const safeCount = clamp(count, 1, 6)
  const base = Math.floor(100 / safeCount)
  return Array.from({ length: safeCount }, (_, index) => (
    index === safeCount - 1 ? 100 - (base * (safeCount - 1)) : base
  ))
}

function normalizedColumns(values: number[], fallbackCount = 1) {
  if (!values.length) return equalColumns(fallbackCount)
  const positive = values.slice(0, 6).map((value) => Math.max(1, Number(value) || 1))
  const total = positive.reduce((sum, value) => sum + value, 0)
  const normalized = positive.map((value) => Math.max(1, Math.round((value / total) * 100)))
  normalized[normalized.length - 1] += 100 - normalized.reduce((sum, value) => sum + value, 0)
  return normalized
}

function inferredColumnCount(grid: Component) {
  const classes = grid.getClasses()
  if (classes.includes('builder-starter-grid--3')) return 3
  if (classes.includes('builder-starter-grid--2') || classes.includes('builder-starter-grid--aside')) return 2
  return Math.min(6, Math.max(1, grid.components().length || 1))
}

function sectionForGrid(grid?: Component | null) {
  let current = grid?.parent()
  while (current) {
    if (hasClass(current, 'builder-starter-section')) return current
    current = current.parent()
  }
  return undefined
}

export function isSectionGrid(component?: Component | null) {
  return Boolean(component && (
    hasClass(component, 'builder-starter-grid')
    || Object.prototype.hasOwnProperty.call(component.getAttributes(), SECTION_GRID_ATTRIBUTE)
  ))
}

export function sectionGridFor(component?: Component | null) {
  let current = component
  while (current) {
    if (isSectionGrid(current)) return current
    current = current.parent()
  }
  return undefined
}

export function readSectionLayoutSettings(grid?: Component | null): SectionLayoutSettings {
  if (!grid) return {
    columns: [100],
    gap: DEFAULT_SECTION_GAP,
    margin: DEFAULT_SECTION_MARGIN,
    padding: DEFAULT_SECTION_PADDING,
  }
  const attributes = grid.getAttributes()
  const savedColumns = String(attributes[SECTION_COLUMNS_ATTRIBUTE] ?? '')
    .split(',')
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
  return {
    columns: normalizedColumns(savedColumns, inferredColumnCount(grid)),
    gap: clamp(Number(attributes[SECTION_GAP_ATTRIBUTE] ?? DEFAULT_SECTION_GAP), 0, 64),
    margin: clamp(Number(attributes[SECTION_MARGIN_ATTRIBUTE] ?? DEFAULT_SECTION_MARGIN), 0, 120),
    padding: clamp(Number(attributes[SECTION_PADDING_ATTRIBUTE] ?? DEFAULT_SECTION_PADDING), 0, 120),
  }
}

function storeColumns(grid: Component, columns: number[]) {
  const normalized = normalizedColumns(columns)
  grid.addAttributes({
    [SECTION_GRID_ATTRIBUTE]: '',
    [SECTION_COLUMNS_ATTRIBUTE]: normalized.join(','),
  })
  grid.addStyle({
    '--builder-section-columns': normalized.map((value) => `minmax(0, ${value}fr)`).join(' '),
  })
  return normalized
}

export function updateSectionColumnCount(grid: Component, count: number) {
  return storeColumns(grid, equalColumns(count))
}

export function updateSectionColumnWidth(grid: Component, index: number, width: number) {
  const current = readSectionLayoutSettings(grid).columns
  if (index < 0 || index >= current.length - 1) return current
  const committedTotal = current.slice(0, index).reduce((sum, value) => sum + value, 0)
  const remainingCount = current.length - index - 1
  current[index] = clamp(width, 5, Math.max(5, 100 - committedTotal - (remainingCount * 5)))
  const remainder = 100 - committedTotal - current[index]
  const base = Math.floor(remainder / remainingCount)
  for (let nextIndex = index + 1; nextIndex < current.length; nextIndex += 1) {
    current[nextIndex] = nextIndex === current.length - 1
      ? remainder - (base * (remainingCount - 1))
      : base
  }
  return storeColumns(grid, current)
}

export function updateSectionGap(grid: Component, gap: number) {
  const next = clamp(gap, 0, 64)
  grid.addAttributes({ [SECTION_GRID_ATTRIBUTE]: '', [SECTION_GAP_ATTRIBUTE]: String(next) })
  grid.addStyle({ gap: `${next}px` })
  return next
}

export function updateSectionMargin(grid: Component, margin: number) {
  const next = clamp(margin, 0, 120)
  grid.addAttributes({ [SECTION_GRID_ATTRIBUTE]: '', [SECTION_MARGIN_ATTRIBUTE]: String(next) })
  sectionForGrid(grid)?.addStyle({ 'margin-top': `${next}px`, 'margin-bottom': `${next}px` })
  return next
}

export function updateSectionPadding(grid: Component, padding: number) {
  const next = clamp(padding, 0, 120)
  grid.addAttributes({ [SECTION_GRID_ATTRIBUTE]: '', [SECTION_PADDING_ATTRIBUTE]: String(next) })
  sectionForGrid(grid)?.addStyle({ padding: `${next}px` })
  return next
}

export const SECTION_LAYOUT_STYLES = `
.builder-starter-grid[data-builder-section-grid] {
  grid-template-columns: var(--builder-section-columns, minmax(0, 1fr));
}
@media (max-width: 767px) {
  .builder-starter-grid[data-builder-section-grid] { grid-template-columns: minmax(0, 1fr); }
}
`

export function createSectionLayoutPlugin(editor: Editor) {
  editor.DomComponents.addType('builder-section-grid', {
    isComponent: (element) => element.classList?.contains('builder-starter-grid')
      || element.hasAttribute?.(SECTION_GRID_ATTRIBUTE),
    model: {
      defaults: {
        name: 'Tarjetas',
        resizable: false,
      },
      init() {
        this.set('name', 'Tarjetas')
      },
    },
    view: {
      events() {
        return { dblclick: 'openSectionLayout' }
      },
      openSectionLayout(event: MouseEvent) {
        event.preventDefault()
        event.stopPropagation()
        this.em.getEditor().trigger(SECTION_LAYOUT_OPEN_EVENT, this.model)
      },
    },
  })
}
