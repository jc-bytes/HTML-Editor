import type { Component, ComponentAdd, ComponentDefinition, Editor } from 'grapesjs'

export const PAGE_LAYOUT_ATTRIBUTE = 'data-psl-page-layout'
export const LAYOUT_ROW_ATTRIBUTE = 'data-psl-layout-row'
export const LAYOUT_COLUMN_ATTRIBUTE = 'data-psl-layout-column'
export const LAYOUT_PRESET_ATTRIBUTE = 'data-psl-layout-preset'
export const LAYOUT_GAP_ATTRIBUTE = 'data-psl-layout-gap'
export const LAYOUT_MIN_HEIGHT_ATTRIBUTE = 'data-psl-layout-min-height'

// Kept only so projects created by the experimental grid can be migrated safely.
export const PAGE_GRID_ATTRIBUTE = 'data-psl-page-grid'
export const GRID_SECTION_ATTRIBUTE = 'data-psl-grid-section'
export const GRID_CONTENT_ATTRIBUTE = 'data-psl-grid-content'
export const GRID_ITEM_ATTRIBUTE = 'data-psl-grid-item'
export const GRID_SPAN_ATTRIBUTE = 'data-psl-grid-span'
export const GRID_START_ATTRIBUTE = 'data-psl-grid-start'
export const GRID_ROW_ATTRIBUTE = 'data-psl-grid-row'

export const DEFAULT_SITE_MARGIN = 32
export const DEFAULT_LAYOUT_GAP = 20
export const DEFAULT_LAYOUT_MIN_HEIGHT = 120

export type LayoutPreset = 'single' | 'equal-2' | 'equal-3' | 'sidebar-left' | 'sidebar-right'

export const LAYOUT_PRESETS: Array<{
  id: LayoutPreset
  label: string
  columns: number
  template: string
}> = [
  { id: 'single', label: 'Una columna', columns: 1, template: 'minmax(0, 1fr)' },
  { id: 'equal-2', label: 'Dos columnas', columns: 2, template: 'repeat(2, minmax(0, 1fr))' },
  { id: 'equal-3', label: 'Tres columnas', columns: 3, template: 'repeat(3, minmax(0, 1fr))' },
  { id: 'sidebar-left', label: '30 / 70', columns: 2, template: 'minmax(0, 3fr) minmax(0, 7fr)' },
  { id: 'sidebar-right', label: '70 / 30', columns: 2, template: 'minmax(0, 7fr) minmax(0, 3fr)' },
]

export const GRID_LAYOUT_STYLES = `
:root {
  --psl-site-margin-desktop: 32px;
  --psl-site-margin-tablet: 24px;
  --psl-site-margin-mobile: 16px;
}
.psl-page-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-height: 100vh;
  padding: var(--psl-site-margin-desktop);
  box-sizing: border-box;
}
.psl-layout-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--psl-layout-gap, 20px);
  align-items: start;
  width: 100%;
  min-width: 0;
  min-height: var(--psl-layout-min-height, 120px);
  box-sizing: border-box;
}
.psl-layout-row[data-psl-layout-preset="equal-2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.psl-layout-row[data-psl-layout-preset="equal-3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.psl-layout-row[data-psl-layout-preset="sidebar-left"] { grid-template-columns: minmax(0, 3fr) minmax(0, 7fr); }
.psl-layout-row[data-psl-layout-preset="sidebar-right"] { grid-template-columns: minmax(0, 7fr) minmax(0, 3fr); }
.psl-layout-column {
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
}
.psl-layout-column > * { max-width: 100%; box-sizing: border-box; }
@media (max-width: 991px) {
  .psl-page-layout { padding: var(--psl-site-margin-tablet); }
}
@media (max-width: 767px) {
  .psl-page-layout { padding: var(--psl-site-margin-mobile); gap: 16px; }
  .psl-layout-row,
  .psl-layout-row[data-psl-layout-preset] { grid-template-columns: minmax(0, 1fr); gap: 16px; }
}
`

export const GRID_EDITOR_STYLES = `
[data-psl-page-layout] { outline: 1px dashed rgba(111, 82, 220, .18); outline-offset: -1px; }
[data-psl-layout-row] {
  position: relative;
  outline: 1px solid rgba(111, 82, 220, .18);
  outline-offset: 4px;
}
[data-psl-layout-column] {
  position: relative;
  outline: 1px dashed rgba(111, 82, 220, .34);
  outline-offset: -1px;
}
[data-psl-layout-column]:empty {
  min-height: var(--psl-layout-min-height, 120px);
  border: 2px dashed rgba(111, 82, 220, .5);
  border-radius: 10px;
  background: rgba(111, 82, 220, .055);
}
[data-psl-layout-column]:empty::before {
  content: "Arrastra un elemento aquí";
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  color: #6f52dc;
  font: 750 15px/1.4 Inter, ui-sans-serif, system-ui, sans-serif;
  text-align: center;
  pointer-events: none;
}
`

function hasAttribute(component: Component, attribute: string) {
  return Object.prototype.hasOwnProperty.call(component.getAttributes(), attribute)
}

function directChildren(component: Component) {
  return component.components().models
}

function currentPageRoot(editor: Editor) {
  return editor.Pages.getSelected()?.getMainComponent() ?? editor.getWrapper()
}

function clampedInteger(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}

export function isPageGrid(component?: Component | null) {
  return Boolean(component && (
    hasAttribute(component, PAGE_LAYOUT_ATTRIBUTE)
    || hasAttribute(component, PAGE_GRID_ATTRIBUTE)
  ))
}

export function isLayoutRow(component?: Component | null) {
  return Boolean(component && hasAttribute(component, LAYOUT_ROW_ATTRIBUTE))
}

export function isGridSection(component?: Component | null) {
  return Boolean(component && (isLayoutRow(component) || hasAttribute(component, GRID_SECTION_ATTRIBUTE)))
}

export function isGridContent(component?: Component | null) {
  return Boolean(component && (isPageGrid(component) || hasAttribute(component, GRID_CONTENT_ATTRIBUTE)))
}

export function isGridItem(component?: Component | null) {
  return Boolean(component && (
    hasAttribute(component, LAYOUT_COLUMN_ATTRIBUTE)
    || hasAttribute(component, GRID_ITEM_ATTRIBUTE)
  ))
}

export function gridItemFor(component?: Component | null) {
  let current = component
  while (current) {
    if (isGridItem(current)) return current
    current = current.parent()
  }
  return undefined
}

export function layoutRowFor(component?: Component | null) {
  let current = component
  while (current) {
    if (isLayoutRow(current)) return current
    current = current.parent()
  }
  return undefined
}

export function layoutColumnDefinition(): ComponentDefinition {
  return {
    type: 'psl-layout-column',
    tagName: 'div',
    name: 'Columna',
    attributes: {
      [LAYOUT_COLUMN_ATTRIBUTE]: '',
      class: 'psl-layout-column',
    },
    draggable: false,
    droppable: true,
    removable: false,
    copyable: false,
    resizable: false,
  }
}

export function layoutRowDefinition(
  preset: LayoutPreset = 'single',
  options: { gap?: number; minHeight?: number } = {},
): ComponentDefinition {
  const definition = LAYOUT_PRESETS.find((candidate) => candidate.id === preset) ?? LAYOUT_PRESETS[0]
  const gap = clampedInteger(options.gap ?? DEFAULT_LAYOUT_GAP, 0, 64)
  const minHeight = clampedInteger(options.minHeight ?? DEFAULT_LAYOUT_MIN_HEIGHT, 48, 800)
  return {
    type: 'psl-layout-row',
    tagName: 'section',
    name: definition.label,
    attributes: {
      [LAYOUT_ROW_ATTRIBUTE]: '',
      [LAYOUT_PRESET_ATTRIBUTE]: definition.id,
      [LAYOUT_GAP_ATTRIBUTE]: String(gap),
      [LAYOUT_MIN_HEIGHT_ATTRIBUTE]: String(minHeight),
      class: 'psl-layout-row',
    },
    style: {
      '--psl-layout-gap': `${gap}px`,
      '--psl-layout-min-height': `${minHeight}px`,
    },
    draggable: `[${PAGE_LAYOUT_ATTRIBUTE}]`,
    droppable: `[${LAYOUT_COLUMN_ATTRIBUTE}]`,
    resizable: false,
    components: Array.from({ length: definition.columns }, () => layoutColumnDefinition()),
  }
}

export function pageGridDefinition(): ComponentDefinition {
  return {
    type: 'psl-page-layout',
    tagName: 'main',
    name: 'Contenido de página · fijo',
    attributes: {
      [PAGE_LAYOUT_ATTRIBUTE]: '',
      class: 'psl-page-layout',
    },
    draggable: false,
    droppable: `[${LAYOUT_ROW_ATTRIBUTE}]`,
    removable: false,
    copyable: false,
    selectable: false,
    hoverable: false,
    resizable: false,
    components: [layoutRowDefinition()],
  }
}

export function readLayoutPreset(row?: Component | null): LayoutPreset {
  const value = row?.getAttributes()[LAYOUT_PRESET_ATTRIBUTE]
  return LAYOUT_PRESETS.some((preset) => preset.id === value) ? value as LayoutPreset : 'single'
}

export function readLayoutSettings(row?: Component | null) {
  const attributes = row?.getAttributes() ?? {}
  return {
    preset: readLayoutPreset(row),
    gap: clampedInteger(Number(attributes[LAYOUT_GAP_ATTRIBUTE]) || DEFAULT_LAYOUT_GAP, 0, 64),
    minHeight: clampedInteger(Number(attributes[LAYOUT_MIN_HEIGHT_ATTRIBUTE]) || DEFAULT_LAYOUT_MIN_HEIGHT, 48, 800),
  }
}

function setColumnCount(row: Component, count: number) {
  const columns = directChildren(row).filter(isGridItem)
  if (columns.length < count) {
    for (let index = columns.length; index < count; index += 1) row.append(layoutColumnDefinition())
  } else if (columns.length > count) {
    const destination = columns[0]
    columns.slice(count).forEach((column) => {
      ;[...directChildren(column)].forEach((content) => content.move(destination))
      column.remove()
    })
  }
}

export function updateLayoutPreset(row: Component, preset: LayoutPreset) {
  const definition = LAYOUT_PRESETS.find((candidate) => candidate.id === preset) ?? LAYOUT_PRESETS[0]
  setColumnCount(row, definition.columns)
  row.addAttributes({ [LAYOUT_PRESET_ATTRIBUTE]: definition.id })
  row.set('name', definition.label)
  return definition.id
}

export function updateLayoutGap(row: Component, gap: number) {
  const next = clampedInteger(gap, 0, 64)
  row.addAttributes({ [LAYOUT_GAP_ATTRIBUTE]: String(next) })
  row.addStyle({ '--psl-layout-gap': `${next}px` })
  return next
}

export function updateLayoutMinHeight(row: Component, minHeight: number) {
  const next = clampedInteger(minHeight, 48, 800)
  row.addAttributes({ [LAYOUT_MIN_HEIGHT_ATTRIBUTE]: String(next) })
  row.addStyle({ '--psl-layout-min-height': `${next}px` })
  return next
}

function legacyPlacement(item: Component) {
  const attributes = item.getAttributes()
  return {
    row: Math.max(1, Math.round(Number(attributes[GRID_ROW_ATTRIBUTE]) || 1)),
    start: clampedInteger(Number(attributes[GRID_START_ATTRIBUTE]) || 1, 1, 12),
    span: clampedInteger(Number(attributes[GRID_SPAN_ATTRIBUTE]) || 12, 1, 12),
  }
}

function presetForLegacyItems(items: Component[]): LayoutPreset {
  if (items.length >= 3) return 'equal-3'
  if (items.length <= 1) return 'single'
  const firstSpan = legacyPlacement(items[0]).span
  if (firstSpan <= 4) return 'sidebar-left'
  if (firstSpan >= 8) return 'sidebar-right'
  return 'equal-2'
}

function moveLegacyItemsIntoRows(layout: Component, items: Component[]) {
  const grouped = new Map<number, Component[]>()
  items.forEach((item) => {
    const row = legacyPlacement(item).row
    grouped.set(row, [...(grouped.get(row) ?? []), item])
  })
  ;[...grouped.entries()].sort(([first], [second]) => first - second).forEach(([, rowItems]) => {
    const ordered = [...rowItems].sort((first, second) => legacyPlacement(first).start - legacyPlacement(second).start)
    for (let offset = 0; offset < ordered.length; offset += 3) {
      const chunk = ordered.slice(offset, offset + 3)
      const row = layout.append(layoutRowDefinition(presetForLegacyItems(chunk)))[0]
      const columns = row ? directChildren(row).filter(isGridItem) : []
      chunk.forEach((legacyItem, index) => {
        const destination = columns[index] ?? columns[0]
        if (destination) [...directChildren(legacyItem)].forEach((content) => content.move(destination))
        legacyItem.remove()
      })
    }
  })
}

function migrateLegacyLayout(layout: Component) {
  const legacyItems = directChildren(layout).filter((component) => (
    hasAttribute(component, GRID_ITEM_ATTRIBUTE) && !hasAttribute(component, LAYOUT_COLUMN_ATTRIBUTE)
  ))
  if (legacyItems.length) moveLegacyItemsIntoRows(layout, legacyItems)
  layout.removeAttributes([PAGE_GRID_ATTRIBUTE, GRID_CONTENT_ATTRIBUTE])
  layout.addAttributes({ [PAGE_LAYOUT_ATTRIBUTE]: '' })
  layout.setClass('psl-page-layout')
  layout.set({
    name: 'Contenido de página · fijo',
    draggable: false,
    droppable: `[${LAYOUT_ROW_ATTRIBUTE}]`,
    removable: false,
    copyable: false,
    selectable: false,
    hoverable: false,
    resizable: false,
  })
  return legacyItems.length
}

function appendSingleRowForComponent(layout: Component, component: Component) {
  const row = layout.append(layoutRowDefinition('single'))[0]
  const column = row && directChildren(row).find(isGridItem)
  if (column) component.move(column)
  return column
}

function repairPageLayout(layout: Component) {
  let repaired = 0
  ;[...directChildren(layout)].forEach((component) => {
    if (isLayoutRow(component)) return
    if (hasAttribute(component, GRID_ITEM_ATTRIBUTE)) return
    appendSingleRowForComponent(layout, component)
    repaired += 1
  })
  return repaired
}

function removeRedundantEmptyRows(layout: Component) {
  const rows = directChildren(layout).filter(isLayoutRow)
  if (rows.length <= 1) return 0
  const emptyRows = rows.filter((row) => directChildren(row).filter(isGridItem).every(
    (column) => directChildren(column).length === 0,
  ))
  emptyRows.forEach((row) => row.remove())
  return emptyRows.length
}

function migrateLegacyRootChildren(root: Component, layout: Component) {
  let migrated = 0
  ;[...directChildren(root)].forEach((component) => {
    if (component === layout) return
    if (hasAttribute(component, GRID_SECTION_ATTRIBUTE) || hasAttribute(component, GRID_CONTENT_ATTRIBUTE)) {
      const nestedItems = component.find(`[${GRID_ITEM_ATTRIBUTE}]`)
      nestedItems.forEach((item) => appendSingleRowForComponent(layout, item))
      component.remove()
      migrated += nestedItems.length
      return
    }
    appendSingleRowForComponent(layout, component)
    migrated += 1
  })
  return migrated
}

export function ensurePageGrid(editor: Editor) {
  const root = currentPageRoot(editor)
  if (!root) return undefined
  let layout = directChildren(root).find(isPageGrid)
  if (!layout) layout = root.append(pageGridDefinition())[0]
  if (!layout) return undefined
  const legacyCount = migrateLegacyLayout(layout)
  const repairedCount = repairPageLayout(layout)
  const migratedRootCount = migrateLegacyRootChildren(root, layout)
  if (legacyCount + repairedCount + migratedRootCount > 0) removeRedundantEmptyRows(layout)
  if (!directChildren(layout).some(isLayoutRow)) layout.append(layoutRowDefinition())
  return layout
}

export function firstGridContent(editor: Editor) {
  return ensurePageGrid(editor)
}

export function ensureGridSlots(editor: Editor) {
  const layout = ensurePageGrid(editor)
  if (!layout || directChildren(layout).some(isLayoutRow)) return 0
  layout.append(layoutRowDefinition())
  return 1
}

export function appendLayoutRow(editor: Editor, preset: LayoutPreset = 'single') {
  const layout = ensurePageGrid(editor)
  return layout?.append(layoutRowDefinition(preset))[0]
}

export function appendGridSlot(editor: Editor, preset: LayoutPreset = 'single') {
  const row = appendLayoutRow(editor, preset)
  return row && directChildren(row).find(isGridItem)
}

function firstEmptyColumn(layout: Component) {
  return directChildren(layout)
    .filter(isLayoutRow)
    .flatMap((row) => directChildren(row).filter(isGridItem))
    .find((column) => directChildren(column).length === 0)
}

function layoutPresetFromContent(content: ComponentAdd) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return undefined
  const attributes = (content as ComponentDefinition).attributes
  const preset = attributes?.[LAYOUT_PRESET_ATTRIBUTE]
  return LAYOUT_PRESETS.some((candidate) => candidate.id === preset) ? preset as LayoutPreset : undefined
}

export function appendGridItem(editor: Editor, content: ComponentAdd) {
  const layout = ensurePageGrid(editor)
  if (!layout) return undefined
  const layoutPreset = layoutPresetFromContent(content)
  if (layoutPreset) return layout.append(content)[0]
  const selectedColumn = gridItemFor(editor.getSelected())
  const column = selectedColumn && directChildren(selectedColumn).length === 0
    ? selectedColumn
    : firstEmptyColumn(layout) ?? appendGridSlot(editor, 'single')
  if (!column) return undefined
  return column.append(content)[0]
}

export function placeComponentInGrid(editor: Editor, component?: Component | null) {
  if (!component || isPageGrid(component)) return component ?? undefined
  const layout = ensurePageGrid(editor)
  if (!layout) return component
  if (isLayoutRow(component)) {
    if (component.parent() !== layout) component.move(layout)
    return component
  }
  if (gridItemFor(component)) return component
  const parent = component.parent()
  const root = currentPageRoot(editor)
  if (parent === layout || parent === root) appendSingleRowForComponent(layout, component)
  return component
}

export function moveLayoutRow(row: Component, direction: -1 | 1) {
  const parent = row.parent()
  if (!parent || !isPageGrid(parent)) return false
  const rows = directChildren(parent).filter(isLayoutRow)
  const index = rows.indexOf(row)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= rows.length) return false
  row.move(parent, { at: nextIndex })
  return true
}

export function layoutRowOrder(row?: Component | null) {
  const parent = row?.parent()
  if (!row || !parent || !isPageGrid(parent)) return { index: -1, count: 0 }
  const rows = directChildren(parent).filter(isLayoutRow)
  return { index: rows.indexOf(row), count: rows.length }
}

export function readSiteMargin(editor: Editor) {
  const value = editor.Css.getRule('.psl-page-layout')?.getStyle()['padding-left']
    ?? editor.Css.getRule('.psl-page-grid')?.getStyle()['padding-left']
    ?? editor.Css.getRule(':root')?.getStyle()['--psl-site-margin-desktop']
  return clampedInteger(Number.parseFloat(String(value ?? DEFAULT_SITE_MARGIN)), 0, 96)
}

export function updateSiteMargin(editor: Editor, margin: number) {
  const desktop = clampedInteger(margin, 0, 96)
  editor.Css.setRule(':root', {
    '--psl-site-margin-desktop': `${desktop}px`,
    '--psl-site-margin-tablet': `${Math.round(desktop * .75)}px`,
    '--psl-site-margin-mobile': `${Math.round(desktop * .5)}px`,
  }, { addStyles: true })
  return desktop
}

export function installGridEditorStyles(editor: Editor) {
  const document = editor.Canvas.getDocument()
  if (!document || document.querySelector('style[data-psl-grid-editor]')) return
  const style = document.createElement('style')
  style.setAttribute('data-psl-grid-editor', '')
  style.textContent = GRID_EDITOR_STYLES
  document.head.append(style)
}

export function createGridLayoutPlugin(editor: Editor) {
  editor.DomComponents.addType('psl-page-layout', {
    isComponent: (element) => element.hasAttribute?.(PAGE_LAYOUT_ATTRIBUTE),
    model: { defaults: pageGridDefinition() },
  })
  editor.DomComponents.addType('psl-layout-row', {
    isComponent: (element) => element.hasAttribute?.(LAYOUT_ROW_ATTRIBUTE),
    model: { defaults: layoutRowDefinition() },
  })
  editor.DomComponents.addType('psl-layout-column', {
    isComponent: (element) => element.hasAttribute?.(LAYOUT_COLUMN_ATTRIBUTE),
    model: { defaults: layoutColumnDefinition() },
  })
  // Legacy types remain readable until ensurePageGrid migrates the page.
  editor.DomComponents.addType('psl-page-grid', {
    isComponent: (element) => element.hasAttribute?.(PAGE_GRID_ATTRIBUTE),
    model: { defaults: pageGridDefinition() },
  })
  LAYOUT_PRESETS.forEach((preset) => {
    editor.BlockManager.add(`psl-layout-${preset.id}`, {
      category: 'Diseño de página',
      label: preset.label,
      attributes: { title: preset.label },
      content: layoutRowDefinition(preset.id),
    })
  })
}
