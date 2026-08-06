import type { Component, ComponentAdd, ComponentDefinition, Editor } from 'grapesjs'

export const GRID_SECTION_ATTRIBUTE = 'data-psl-grid-section'
export const GRID_CONTENT_ATTRIBUTE = 'data-psl-grid-content'
export const GRID_ITEM_ATTRIBUTE = 'data-psl-grid-item'
export const GRID_SPAN_ATTRIBUTE = 'data-psl-grid-span'
export const GRID_START_ATTRIBUTE = 'data-psl-grid-start'

export const GRID_DESKTOP_COLUMNS = 12
export const DEFAULT_SITE_MARGIN = 32

export const GRID_LAYOUT_STYLES = `
:root {
  --psl-site-margin-desktop: 32px;
  --psl-site-margin-tablet: 24px;
  --psl-site-margin-mobile: 16px;
}
.psl-grid-section {
  --psl-site-margin: var(--psl-site-margin-desktop);
  --psl-site-max-width: 1200px;
  --psl-grid-gap: 20px;
  --psl-section-space: 32px;
  position: relative;
  width: 100%;
  padding-top: 32px;
  padding-bottom: 32px;
  box-sizing: border-box;
}
.psl-grid-content {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  column-gap: 20px;
  row-gap: 20px;
  width: min(calc(100% - (2 * var(--psl-site-margin))), var(--psl-site-max-width));
  margin-inline: auto;
  box-sizing: border-box;
}
.psl-grid-item {
  min-width: 0;
  grid-column-start: auto;
  grid-column-end: span 12;
  box-sizing: border-box;
}
.psl-grid-item > * { max-width: 100%; }
@media (max-width: 991px) {
  .psl-grid-section { --psl-site-margin: var(--psl-site-margin-tablet); }
  .psl-grid-content { grid-template-columns: repeat(8, minmax(0, 1fr)); }
  .psl-grid-item { grid-column-end: span 8; }
}
@media (max-width: 767px) {
  .psl-grid-section { --psl-site-margin: var(--psl-site-margin-mobile); padding-top: 24px; padding-bottom: 24px; }
  .psl-grid-content { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .psl-grid-item { grid-column-start: auto !important; grid-column-end: span 4 !important; }
}
`

export const GRID_EDITOR_STYLES = `
[data-psl-grid-section] { min-height: 112px; }
[data-psl-grid-content]:empty,
[data-psl-grid-item]:empty {
  position: relative;
  min-height: 144px;
  place-items: center;
  border: 2px dashed rgba(111, 82, 220, .55);
  border-radius: 12px;
  background: rgba(111, 82, 220, .055);
}
[data-psl-grid-content]:empty::before,
[data-psl-grid-item]:empty::before {
  content: "Arrastra un elemento aquí";
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #6f52dc;
  font: 750 18px/1.4 Inter, ui-sans-serif, system-ui, sans-serif;
  pointer-events: none;
}
[data-psl-grid-content]:not(:empty) {
  outline: 1px dashed rgba(111, 82, 220, .16);
  outline-offset: 6px;
}
body.psl-grid-guides [data-psl-grid-content] {
  background-image: repeating-linear-gradient(to right, rgba(111, 82, 220, .1) 0, rgba(111, 82, 220, .1) calc((100% - 220px) / 12), transparent calc((100% - 220px) / 12), transparent calc((100% + 20px) / 12));
}
.psl-grid-canvas-controls {
  position: absolute;
  z-index: 2147483000;
  box-sizing: border-box;
  border: 2px solid #6f52dc;
  pointer-events: none;
}
.psl-grid-canvas-control {
  position: absolute;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  padding: 0;
  color: white;
  background: #6f52dc;
  border: 2px solid white;
  border-radius: 7px;
  box-shadow: 0 2px 8px rgba(20, 14, 48, .35);
  font: 800 15px/1 system-ui, sans-serif;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
}
.psl-grid-canvas-control[data-grid-action="move"] { top: -32px; right: 0; width: 42px; cursor: grab; }
.psl-grid-canvas-control[data-grid-action="resize-left"] { top: 50%; left: -14px; transform: translateY(-50%); cursor: ew-resize; }
.psl-grid-canvas-control[data-grid-action="resize-right"] { top: 50%; right: -14px; transform: translateY(-50%); cursor: ew-resize; }
.psl-grid-canvas-control:active { cursor: grabbing; background: #563cc5; }
`

export function gridItemDefinition(): ComponentDefinition {
  return {
    type: 'psl-grid-item',
    tagName: 'div',
    name: 'Elemento de cuadrícula',
    attributes: {
      [GRID_ITEM_ATTRIBUTE]: '',
      class: 'psl-grid-item',
    },
    draggable: `[${GRID_CONTENT_ATTRIBUTE}]`,
    droppable: true,
    resizable: false,
  }
}

function gridContentDefinition(): ComponentDefinition {
  return {
    type: 'psl-grid-content',
    tagName: 'div',
    name: 'Cuadrícula',
    attributes: {
      [GRID_CONTENT_ATTRIBUTE]: '',
      class: 'psl-grid-content',
    },
    draggable: false,
    droppable: true,
    selectable: false,
    hoverable: false,
    resizable: false,
    components: [gridItemDefinition()],
  }
}

export function gridSectionDefinition(): ComponentDefinition {
  return {
    type: 'psl-grid-section',
    tagName: 'section',
    name: 'Sección de cuadrícula',
    attributes: {
      [GRID_SECTION_ATTRIBUTE]: '',
      class: 'psl-grid-section',
    },
    draggable: true,
    droppable: false,
    resizable: false,
    components: [gridContentDefinition()],
  }
}

function hasAttribute(component: Component, attribute: string) {
  return Object.prototype.hasOwnProperty.call(component.getAttributes(), attribute)
}

export function isGridSection(component?: Component | null) {
  return Boolean(component && hasAttribute(component, GRID_SECTION_ATTRIBUTE))
}

export function isGridContent(component?: Component | null) {
  return Boolean(component && hasAttribute(component, GRID_CONTENT_ATTRIBUTE))
}

export function isGridItem(component?: Component | null) {
  return Boolean(component && hasAttribute(component, GRID_ITEM_ATTRIBUTE))
}

export function gridItemFor(component?: Component | null) {
  let current = component
  while (current) {
    if (isGridItem(current)) return current
    current = current.parent()
  }
  return undefined
}

function directChildren(component: Component) {
  return component.components().models
}

function currentPageRoot(editor: Editor) {
  return editor.Pages.getSelected()?.getMainComponent() ?? editor.getWrapper()
}

export function gridContentOf(section: Component) {
  return directChildren(section).find(isGridContent)
    ?? section.find(`[${GRID_CONTENT_ATTRIBUTE}]`)[0]
}

export function firstGridContent(editor: Editor) {
  const wrapper = currentPageRoot(editor)
  if (!wrapper) return undefined
  return directChildren(wrapper).find(isGridSection)
    ? wrapper.find(`[${GRID_CONTENT_ATTRIBUTE}]`)[0]
    : undefined
}

export function ensureGridSection(editor: Editor, options: { allowAlongsideLegacy?: boolean } = {}) {
  const wrapper = currentPageRoot(editor)
  if (!wrapper) return undefined
  const existing = directChildren(wrapper).find(isGridSection)
  if (existing) {
    ensureGridSlot(existing)
    return existing
  }

  const hasLegacyContent = directChildren(wrapper).some((component) => !isGridSection(component))
  if (hasLegacyContent && !options.allowAlongsideLegacy) return undefined
  return wrapper.append(gridSectionDefinition())[0]
}

export function appendGridSection(editor: Editor) {
  return currentPageRoot(editor)?.append(gridSectionDefinition())[0]
}

export function ensureGridSlot(section: Component) {
  const grid = gridContentOf(section)
  if (!grid) return undefined
  return directChildren(grid).find(isGridItem) ?? grid.append(gridItemDefinition())[0]
}

export function ensureGridSlots(editor: Editor) {
  const root = currentPageRoot(editor)
  if (!root) return 0
  let added = 0
  directChildren(root).filter(isGridSection).forEach((section) => {
    const grid = gridContentOf(section)
    if (!grid || directChildren(grid).some(isGridItem)) return
    grid.append(gridItemDefinition())
    added += 1
  })
  return added
}

export function appendGridItem(editor: Editor, content: ComponentAdd) {
  const section = ensureGridSection(editor, { allowAlongsideLegacy: true })
  const grid = section ? gridContentOf(section) : undefined
  if (!grid) return undefined
  const selectedSlot = gridItemFor(editor.getSelected())
  const item = selectedSlot && directChildren(selectedSlot).length === 0
    ? selectedSlot
    : directChildren(grid).find((candidate) => isGridItem(candidate) && directChildren(candidate).length === 0)
    ?? grid.append(gridItemDefinition())[0]
  if (!item) return undefined
  const inserted = item.append(content)[0]
  if (!inserted) item.remove()
  return inserted
}

export function placeComponentInGrid(editor: Editor, component?: Component | null) {
  if (!component || isGridSection(component) || isGridItem(component)) return component ?? undefined
  const parent = component.parent()
  const wrapper = currentPageRoot(editor)
  if (!parent || isGridItem(parent)) return component
  if (!isGridContent(parent) && parent !== wrapper) return component

  const section = isGridContent(parent)
    ? parent.parent()
    : ensureGridSection(editor, { allowAlongsideLegacy: true })
  const grid = section ? gridContentOf(section) : undefined
  if (!grid) return component
  const item = directChildren(grid).find((candidate) => isGridItem(candidate) && directChildren(candidate).length === 0)
    ?? grid.append(gridItemDefinition())[0]
  if (!item) return component
  item.append(component)
  return component
}

function clampedInteger(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}

export type GridItemPlacement = { span: number; start: number }
export type GridDragAction = 'move' | 'resize-left' | 'resize-right'

export function readGridItemPlacement(item?: Component | null): GridItemPlacement {
  const attributes = item?.getAttributes() ?? {}
  const span = clampedInteger(Number(attributes[GRID_SPAN_ATTRIBUTE]) || GRID_DESKTOP_COLUMNS, 1, GRID_DESKTOP_COLUMNS)
  const start = clampedInteger(Number(attributes[GRID_START_ATTRIBUTE]) || 1, 1, GRID_DESKTOP_COLUMNS - span + 1)
  return { span, start }
}

export function updateGridItemPlacement(item: Component, placement: Partial<GridItemPlacement>) {
  const current = readGridItemPlacement(item)
  const span = clampedInteger(placement.span ?? current.span, 1, GRID_DESKTOP_COLUMNS)
  const start = clampedInteger(placement.start ?? current.start, 1, GRID_DESKTOP_COLUMNS - span + 1)
  item.addAttributes({
    [GRID_SPAN_ATTRIBUTE]: String(span),
    [GRID_START_ATTRIBUTE]: String(start),
  })
  item.addStyle({
    'grid-column-start': String(start),
    'grid-column-end': `span ${span}`,
  })
  return { span, start }
}

export function gridPlacementAfterDrag(
  placement: GridItemPlacement,
  action: GridDragAction,
  columnDelta: number,
) {
  const span = clampedInteger(placement.span, 1, GRID_DESKTOP_COLUMNS)
  const start = clampedInteger(placement.start, 1, GRID_DESKTOP_COLUMNS - span + 1)
  if (action === 'move') return {
    span,
    start: clampedInteger(start + columnDelta, 1, GRID_DESKTOP_COLUMNS - span + 1),
  }
  if (action === 'resize-right') return {
    start,
    span: clampedInteger(span + columnDelta, 1, GRID_DESKTOP_COLUMNS - start + 1),
  }
  const rightEdge = start + span - 1
  const nextStart = clampedInteger(start + columnDelta, 1, rightEdge)
  return { start: nextStart, span: rightEdge - nextStart + 1 }
}

export function alignGridItem(item: Component, alignment: 'left' | 'center' | 'right') {
  const { span } = readGridItemPlacement(item)
  const available = GRID_DESKTOP_COLUMNS - span
  const start = alignment === 'left' ? 1 : alignment === 'right' ? available + 1 : Math.floor(available / 2) + 1
  return updateGridItemPlacement(item, { start })
}

export function moveGridItem(item: Component, direction: -1 | 1) {
  const parent = item.parent()
  if (!parent || !isGridContent(parent)) return false
  const siblings = directChildren(parent)
  const index = siblings.indexOf(item)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return false
  item.move(parent, { at: nextIndex })
  return true
}

export function gridItemOrder(item?: Component | null) {
  const parent = item?.parent()
  if (!item || !parent || !isGridContent(parent)) return { index: -1, count: 0 }
  const siblings = directChildren(parent)
  return { index: siblings.indexOf(item), count: siblings.length }
}

export function moveGridItemToGrid(item: Component, targetGrid: Component) {
  const sourceGrid = item.parent()
  if (!sourceGrid || !isGridContent(sourceGrid) || !isGridContent(targetGrid) || sourceGrid === targetGrid) return false
  const itemWasEmpty = directChildren(item).length === 0
  directChildren(targetGrid)
    .filter((candidate) => isGridItem(candidate) && directChildren(candidate).length === 0)
    .forEach((candidate) => candidate.remove())
  item.move(targetGrid)
  const sourceSection = sourceGrid.parent()
  if (itemWasEmpty && sourceSection && directChildren(sourceGrid).length === 0) sourceSection.remove()
  else if (sourceSection) ensureGridSlot(sourceSection)
  return true
}

export function gridItemSectionOrder(editor: Editor, item?: Component | null) {
  const root = currentPageRoot(editor)
  const section = item?.parent()?.parent()
  if (!root || !section || !isGridSection(section)) return { index: -1, count: 0 }
  const sections = directChildren(root).filter(isGridSection)
  return { index: sections.indexOf(section), count: sections.length }
}

export function moveGridItemToAdjacentSection(editor: Editor, item: Component, direction: -1 | 1) {
  const root = currentPageRoot(editor)
  const sourceSection = item.parent()?.parent()
  if (!root || !sourceSection || !isGridSection(sourceSection)) return false
  const sections = directChildren(root).filter(isGridSection)
  const targetSection = sections[sections.indexOf(sourceSection) + direction]
  const targetGrid = targetSection ? gridContentOf(targetSection) : undefined
  if (!targetGrid) return false
  const targetItems = directChildren(targetGrid).filter((candidate) => isGridItem(candidate) && directChildren(candidate).length > 0)
  const targetItem = targetItems.length === 1 ? targetItems[0] : undefined
  const shouldSplit = targetItem
    && readGridItemPlacement(targetItem).span === GRID_DESKTOP_COLUMNS
    && readGridItemPlacement(item).span === GRID_DESKTOP_COLUMNS
  if (!moveGridItemToGrid(item, targetGrid)) return false
  if (shouldSplit && targetItem) {
    updateGridItemPlacement(targetItem, { span: 6, start: 1 })
    updateGridItemPlacement(item, { span: 6, start: 7 })
  }
  return true
}

export function readSiteMargin(editor: Editor) {
  const value = editor.Css.getRule(':root')?.getStyle()['--psl-site-margin-desktop']
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
  editor.DomComponents.addType('psl-grid-section', {
    isComponent: (element) => element.hasAttribute?.(GRID_SECTION_ATTRIBUTE),
    model: { defaults: gridSectionDefinition() },
  })
  editor.DomComponents.addType('psl-grid-content', {
    isComponent: (element) => element.hasAttribute?.(GRID_CONTENT_ATTRIBUTE),
    model: { defaults: gridContentDefinition() },
  })
  editor.DomComponents.addType('psl-grid-item', {
    isComponent: (element) => element.hasAttribute?.(GRID_ITEM_ATTRIBUTE),
    model: { defaults: gridItemDefinition() },
  })
}
