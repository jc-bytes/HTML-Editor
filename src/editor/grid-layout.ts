import type { Component, ComponentAdd, ComponentDefinition, Editor } from 'grapesjs'

export const PAGE_LAYOUT_ATTRIBUTE = 'data-builder-page-layout'
export const LAYOUT_ROW_ATTRIBUTE = 'data-builder-layout-row'
export const LAYOUT_COLUMN_ATTRIBUTE = 'data-builder-layout-column'
export const LAYOUT_PRESET_ATTRIBUTE = 'data-builder-layout-preset'
export const LAYOUT_GAP_ATTRIBUTE = 'data-builder-layout-gap'
export const LAYOUT_MIN_HEIGHT_ATTRIBUTE = 'data-builder-layout-min-height'
export const FULL_PAGE_TEMPLATE_ATTRIBUTE = 'data-builder-full-page-template'

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

function layoutPresetIcon(preset: LayoutPreset) {
  const columns = preset === 'single'
    ? [[5, 38]]
    : preset === 'equal-3'
      ? [[4, 11], [18.5, 11], [33, 11]]
      : preset === 'sidebar-left'
        ? [[4, 13], [20, 24]]
        : preset === 'sidebar-right'
          ? [[4, 24], [31, 13]]
          : [[4, 19], [25, 19]]
  return `<svg aria-hidden="true" viewBox="0 0 48 36">${columns
    .map(([x, width]) => `<rect x="${x}" y="5" width="${width}" height="26" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>`)
    .join('')}</svg>`
}

export const GRID_LAYOUT_STYLES = `
.builder-page-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-height: 100vh;
  padding: 32px;
  box-sizing: border-box;
}
.builder-layout-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  align-items: start;
  width: 100%;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
}
.builder-layout-row[data-builder-layout-preset="equal-2"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
.builder-layout-row[data-builder-layout-preset="equal-3"] { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
.builder-layout-row[data-builder-layout-preset="sidebar-left"] { grid-template-columns: minmax(0, 3fr) minmax(0, 7fr) !important; }
.builder-layout-row[data-builder-layout-preset="sidebar-right"] { grid-template-columns: minmax(0, 7fr) minmax(0, 3fr) !important; }
.builder-layout-column {
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
}
.builder-layout-column > * { max-width: 100%; box-sizing: border-box; }
@media (max-width: 991px) {
  .builder-page-layout { padding: 24px; }
}
@media (max-width: 767px) {
  .builder-page-layout { padding: 16px; gap: 16px; }
  .builder-layout-row,
  .builder-layout-row[data-builder-layout-preset] { grid-template-columns: minmax(0, 1fr) !important; gap: 16px !important; }
}
`

export const GRID_EDITOR_STYLES = `
[data-builder-page-layout] { outline: 1px dashed rgba(111, 82, 220, .18); outline-offset: -1px; }
[data-builder-layout-row] {
  position: relative;
  outline: 1px solid rgba(111, 82, 220, .18);
  outline-offset: 4px;
}
[data-builder-layout-column] {
  position: relative;
  outline: 1px dashed rgba(111, 82, 220, .34);
  outline-offset: -1px;
}
[data-builder-layout-column]:empty {
  min-height: var(--builder-layout-min-height, 120px);
  border: 2px dashed rgba(111, 82, 220, .5);
  border-radius: 10px;
  background: rgba(111, 82, 220, .055);
}
[data-builder-layout-column]:empty::before {
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

function fullPageTemplateFor(root: Component) {
  const candidates: Component[] = []
  const visit = (component: Component) => {
    candidates.push(component)
    directChildren(component).forEach(visit)
  }
  visit(root)
  return candidates.find((component) => {
    const attributes = component.getAttributes()
    const classes = String(attributes.class ?? '').split(/\s+/)
    return hasAttribute(component, FULL_PAGE_TEMPLATE_ATTRIBUTE) || classes.includes('builder-auth-page')
  })
}

function restoreFullPageTemplateRoot(root: Component, fullPage: Component) {
  const layouts = directChildren(root).filter(isPageGrid)
  if (fullPage.parent() !== root) fullPage.move(root, { at: 0 })
  layouts.forEach((layout) => layout.remove())
}

function clampedInteger(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}

export function isPageGrid(component?: Component | null) {
  return Boolean(component && hasAttribute(component, PAGE_LAYOUT_ATTRIBUTE))
}

export function isLayoutRow(component?: Component | null) {
  return Boolean(component && hasAttribute(component, LAYOUT_ROW_ATTRIBUTE))
}

export function isGridSection(component?: Component | null) {
  return Boolean(component && isLayoutRow(component))
}

export function isGridContent(component?: Component | null) {
  return Boolean(component && isPageGrid(component))
}

export function isGridItem(component?: Component | null) {
  return Boolean(component && hasAttribute(component, LAYOUT_COLUMN_ATTRIBUTE))
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
    type: 'builder-layout-column',
    tagName: 'div',
    name: 'Columna',
    attributes: {
      [LAYOUT_COLUMN_ATTRIBUTE]: '',
      class: 'builder-layout-column',
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
    type: 'builder-layout-row',
    tagName: 'section',
    name: definition.label,
    attributes: {
      [LAYOUT_ROW_ATTRIBUTE]: '',
      [LAYOUT_PRESET_ATTRIBUTE]: definition.id,
      [LAYOUT_GAP_ATTRIBUTE]: String(gap),
      [LAYOUT_MIN_HEIGHT_ATTRIBUTE]: String(minHeight),
      class: 'builder-layout-row',
    },
    style: {
      gap: `${gap}px`,
      '--builder-layout-min-height': `${minHeight}px`,
    },
    draggable: `[${PAGE_LAYOUT_ATTRIBUTE}]`,
    droppable: `[${LAYOUT_COLUMN_ATTRIBUTE}]`,
    resizable: false,
    components: Array.from({ length: definition.columns }, () => layoutColumnDefinition()),
  }
}

export function pageGridDefinition(): ComponentDefinition {
  return {
    type: 'builder-page-layout',
    tagName: 'main',
    name: 'Contenido de página · fijo',
    attributes: {
      [PAGE_LAYOUT_ATTRIBUTE]: '',
      class: 'builder-page-layout',
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

function normalizeLayoutRow(row: Component) {
  // Layout rows are structural; presets own their grid tracks.
  ;['grid-template-columns', 'grid-template-rows', 'grid-auto-flow'].forEach((property) => {
    row.removeStyle(property)
  })
  row.addStyle({ display: 'grid', width: '100%' })
  row.set('resizable', false)
}

export function updateLayoutPreset(row: Component, preset: LayoutPreset) {
  const definition = LAYOUT_PRESETS.find((candidate) => candidate.id === preset) ?? LAYOUT_PRESETS[0]
  setColumnCount(row, definition.columns)
  normalizeLayoutRow(row)
  row.addAttributes({ [LAYOUT_PRESET_ATTRIBUTE]: definition.id })
  row.set('name', definition.label)
  return definition.id
}

export function updateLayoutGap(row: Component, gap: number) {
  const next = clampedInteger(gap, 0, 64)
  row.addAttributes({ [LAYOUT_GAP_ATTRIBUTE]: String(next) })
  row.addStyle({ gap: `${next}px` })
  return next
}

export function updateLayoutMinHeight(row: Component, minHeight: number) {
  const next = clampedInteger(minHeight, 48, 800)
  row.addAttributes({ [LAYOUT_MIN_HEIGHT_ATTRIBUTE]: String(next) })
  row.addStyle({ '--builder-layout-min-height': `${next}px` })
  return next
}

function appendSingleRowForComponent(layout: Component, component: Component) {
  const row = layout.append(layoutRowDefinition('single'))[0]
  const column = row && directChildren(row).find(isGridItem)
  if (column) component.move(column)
  return column
}

function normalizeLayoutChildren(layout: Component) {
  let placed = 0
  ;[...directChildren(layout)].forEach((component) => {
    if (isLayoutRow(component)) {
      normalizeLayoutRow(component)
      return
    }
    appendSingleRowForComponent(layout, component)
    placed += 1
  })
  return placed
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

function placeRootChildrenInLayout(root: Component, layout: Component) {
  let placed = 0
  ;[...directChildren(root)].forEach((component) => {
    if (component === layout) return
    appendSingleRowForComponent(layout, component)
    placed += 1
  })
  return placed
}

export function ensurePageGrid(editor: Editor) {
  const root = currentPageRoot(editor)
  if (!root) return undefined
  const fullPage = fullPageTemplateFor(root)
  if (fullPage) {
    restoreFullPageTemplateRoot(root, fullPage)
    return undefined
  }
  let layout = directChildren(root).find(isPageGrid)
  if (!layout) layout = root.append(pageGridDefinition())[0]
  if (!layout) return undefined
  const placedLayoutCount = normalizeLayoutChildren(layout)
  const placedRootCount = placeRootChildrenInLayout(root, layout)
  if (placedLayoutCount + placedRootCount > 0) removeRedundantEmptyRows(layout)
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
  const value = editor.Css.getRule('.builder-page-layout')?.getStyle()['padding-left']
    ?? editor.Css.getRule('.builder-page-layout')?.getStyle().padding
  return clampedInteger(Number.parseFloat(String(value ?? DEFAULT_SITE_MARGIN)), 0, 96)
}

export function updateSiteMargin(editor: Editor, margin: number) {
  const desktop = clampedInteger(margin, 0, 96)
  const tabletRule = {
    atRuleParams: '(max-width: 991px)',
    atRuleType: 'media',
  } as const
  const mobileRule = {
    atRuleParams: '(max-width: 767px)',
    atRuleType: 'media',
  } as const
  const updatePaddingRule = (padding: number, ruleOptions = {}) => {
    const rule = editor.Css.getRule('.builder-page-layout', ruleOptions)
    const style = {
      'padding-bottom': `${padding}px`,
      'padding-left': `${padding}px`,
      'padding-right': `${padding}px`,
      'padding-top': `${padding}px`,
    }
    if (rule) rule.addStyle(style)
    else editor.Css.setRule('.builder-page-layout', style, ruleOptions)
  }
  updatePaddingRule(desktop)
  updatePaddingRule(Math.round(desktop * .75), tabletRule)
  updatePaddingRule(Math.round(desktop * .5), mobileRule)
  return desktop
}

export function installGridEditorStyles(editor: Editor) {
  const document = editor.Canvas.getDocument()
  if (!document || document.querySelector('style[data-builder-grid-editor]')) return
  const style = document.createElement('style')
  style.setAttribute('data-builder-grid-editor', '')
  style.textContent = GRID_EDITOR_STYLES
  document.head.append(style)
}

export function createGridLayoutPlugin(editor: Editor) {
  editor.DomComponents.addType('builder-page-layout', {
    isComponent: (element) => element.hasAttribute?.(PAGE_LAYOUT_ATTRIBUTE),
    model: { defaults: pageGridDefinition() },
  })
  editor.DomComponents.addType('builder-layout-row', {
    isComponent: (element) => element.hasAttribute?.(LAYOUT_ROW_ATTRIBUTE),
    model: { defaults: layoutRowDefinition() },
  })
  editor.DomComponents.addType('builder-layout-column', {
    isComponent: (element) => element.hasAttribute?.(LAYOUT_COLUMN_ATTRIBUTE),
    model: { defaults: layoutColumnDefinition() },
  })
  LAYOUT_PRESETS.forEach((preset) => {
    editor.BlockManager.add(`builder-layout-${preset.id}`, {
      category: 'Diseño de página',
      label: preset.label,
      media: layoutPresetIcon(preset.id),
      attributes: { title: preset.label },
      content: layoutRowDefinition(preset.id),
    })
  })
}
