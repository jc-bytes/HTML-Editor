import type { Component, ComponentAdd, ComponentDefinition, Editor } from 'grapesjs'

export const PAGE_GRID_ATTRIBUTE = 'data-psl-page-grid'
export const GRID_SECTION_ATTRIBUTE = 'data-psl-grid-section'
export const GRID_CONTENT_ATTRIBUTE = 'data-psl-grid-content'
export const GRID_ITEM_ATTRIBUTE = 'data-psl-grid-item'
export const GRID_SPAN_ATTRIBUTE = 'data-psl-grid-span'
export const GRID_START_ATTRIBUTE = 'data-psl-grid-start'
export const GRID_ROW_ATTRIBUTE = 'data-psl-grid-row'

export const GRID_DESKTOP_COLUMNS = 12
export const DEFAULT_SITE_MARGIN = 32

export const GRID_LAYOUT_STYLES = `
:root {
  --psl-site-margin-desktop: 32px;
  --psl-site-margin-tablet: 24px;
  --psl-site-margin-mobile: 16px;
}
.psl-page-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-flow: row;
  grid-auto-rows: minmax(48px, auto);
  align-content: start;
  column-gap: 20px;
  row-gap: 20px;
  width: 100%;
  min-height: 100vh;
  padding-top: 32px;
  padding-right: 32px;
  padding-bottom: 32px;
  padding-left: 32px;
  box-sizing: border-box;
}
.psl-grid-item {
  min-width: 0;
  grid-column-start: auto;
  grid-column-end: span 12;
  grid-row-start: auto;
  box-sizing: border-box;
}
.psl-grid-item > * { max-width: 100%; box-sizing: border-box; }
@media (max-width: 991px) {
  .psl-page-grid { grid-template-columns: repeat(8, minmax(0, 1fr)); padding-top: 24px; padding-right: 24px; padding-bottom: 24px; padding-left: 24px; }
  .psl-grid-item { grid-column-start: auto !important; grid-column-end: span 8 !important; grid-row-start: auto !important; }
}
@media (max-width: 767px) {
  .psl-page-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); padding-top: 16px; padding-right: 16px; padding-bottom: 16px; padding-left: 16px; column-gap: 16px; row-gap: 16px; }
  .psl-grid-item { grid-column-start: auto !important; grid-column-end: span 4 !important; grid-row-start: auto !important; }
}
`

export const GRID_EDITOR_STYLES = `
[data-psl-page-grid] { outline: 1px dashed rgba(111, 82, 220, .2); outline-offset: -1px; }
[data-psl-grid-item]:empty {
  position: relative;
  min-height: 144px;
  place-items: center;
  border: 2px dashed rgba(111, 82, 220, .55);
  border-radius: 12px;
  background: rgba(111, 82, 220, .055);
}
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
body.psl-grid-guides [data-psl-page-grid] {
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
.psl-grid-drop-zone {
  position: absolute;
  z-index: 2147482999;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 6px;
  color: #6245d5;
  background: rgba(111, 82, 220, .09);
  border: 2px dashed rgba(111, 82, 220, .42);
  font: 800 12px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
  text-align: center;
  pointer-events: none;
  opacity: .72;
  transition: background .12s ease, border-color .12s ease, color .12s ease, opacity .12s ease;
}
.psl-grid-drop-zone.active {
  color: #fff;
  background: rgba(111, 82, 220, .78);
  border-color: #fff;
  opacity: 1;
  box-shadow: inset 0 0 0 2px #6f52dc, 0 4px 16px rgba(50, 32, 120, .3);
}
`

export function gridItemDefinition(placement: Partial<GridItemPlacement> = {}): ComponentDefinition {
  const span = clampedInteger(placement.span ?? GRID_DESKTOP_COLUMNS, 1, GRID_DESKTOP_COLUMNS)
  const start = clampedInteger(placement.start ?? 1, 1, GRID_DESKTOP_COLUMNS - span + 1)
  const row = Math.max(1, Math.round(placement.row ?? 1))
  return {
    type: 'psl-grid-item',
    tagName: 'div',
    name: 'Elemento de cuadrícula',
    attributes: {
      [GRID_ITEM_ATTRIBUTE]: '',
      [GRID_SPAN_ATTRIBUTE]: String(span),
      [GRID_START_ATTRIBUTE]: String(start),
      [GRID_ROW_ATTRIBUTE]: String(row),
      class: 'psl-grid-item',
    },
    style: {
      'grid-column-start': String(start),
      'grid-column-end': `span ${span}`,
      'grid-row-start': String(row),
    },
    draggable: false,
    droppable: true,
    resizable: false,
  }
}

export function pageGridDefinition(): ComponentDefinition {
  return {
    type: 'psl-page-grid',
    tagName: 'div',
    name: 'Diseño de página · fijo',
    attributes: {
      [PAGE_GRID_ATTRIBUTE]: '',
      [GRID_CONTENT_ATTRIBUTE]: '',
      class: 'psl-page-grid',
    },
    draggable: false,
    droppable: `[${GRID_ITEM_ATTRIBUTE}]`,
    removable: false,
    copyable: false,
    selectable: false,
    hoverable: false,
    resizable: false,
    components: [gridItemDefinition()],
  }
}

function legacyGridContentDefinition(): ComponentDefinition {
  return {
    type: 'psl-grid-content',
    tagName: 'div',
    name: 'Cuadrícula anterior',
    attributes: { [GRID_CONTENT_ATTRIBUTE]: '', class: 'psl-grid-content' },
    draggable: false,
    droppable: true,
    resizable: false,
  }
}

function legacyGridSectionDefinition(): ComponentDefinition {
  return {
    type: 'psl-grid-section',
    tagName: 'section',
    name: 'Sección anterior',
    attributes: { [GRID_SECTION_ATTRIBUTE]: '', class: 'psl-grid-section' },
    draggable: false,
    droppable: false,
    resizable: false,
  }
}

function hasAttribute(component: Component, attribute: string) {
  return Object.prototype.hasOwnProperty.call(component.getAttributes(), attribute)
}

export function isPageGrid(component?: Component | null) {
  return Boolean(component && hasAttribute(component, PAGE_GRID_ATTRIBUTE))
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

function emptyGridSlot(grid: Component) {
  return directChildren(grid).find((candidate) => isGridItem(candidate) && directChildren(candidate).length === 0)
}

function nextGridRow(grid: Component) {
  return directChildren(grid).filter(isGridItem).reduce(
    (maximum, item) => Math.max(maximum, readGridItemPlacement(item).row),
    0,
  ) + 1
}

function appendWrappedComponent(grid: Component, component: Component) {
  const item = emptyGridSlot(grid) ?? grid.append(gridItemDefinition({ row: nextGridRow(grid) }))[0]
  component.move(item)
  component.set('draggable', false)
  return item
}

function repairDirectPageGridChildren(grid: Component) {
  let repaired = 0
  ;[...directChildren(grid)].forEach((component) => {
    if (isGridItem(component)) return
    appendWrappedComponent(grid, component)
    repaired += 1
  })
  return repaired
}

function migrateRootChildren(root: Component, grid: Component) {
  let migrated = 0
  const rootChildren = [...directChildren(root)]
  rootChildren.forEach((component) => {
    if (component === grid) return
    if (isGridSection(component)) {
      const legacyGrid = gridContentOf(component)
      const legacyItems = legacyGrid ? [...directChildren(legacyGrid)] : []
      legacyItems.forEach((legacyItem) => {
        if (isGridItem(legacyItem)) legacyItem.move(grid)
        else appendWrappedComponent(grid, legacyItem)
        migrated += 1
      })
      component.remove()
      return
    }
    if (isGridContent(component)) {
      ;[...directChildren(component)].forEach((legacyItem) => {
        if (isGridItem(legacyItem)) legacyItem.move(grid)
        else appendWrappedComponent(grid, legacyItem)
        migrated += 1
      })
      component.remove()
      return
    }
    appendWrappedComponent(grid, component)
    migrated += 1
  })
  if (migrated > 0) emptyGridSlot(grid)?.remove()
  return migrated
}

function placementsOverlap(first: GridItemPlacement, second: GridItemPlacement) {
  if (first.row !== second.row) return false
  const firstEnd = first.start + first.span - 1
  const secondEnd = second.start + second.span - 1
  return first.start <= secondEnd && second.start <= firstEnd
}

export function normalizeGridItemPlacements(grid: Component) {
  const occupied: GridItemPlacement[] = []
  let changed = 0
  directChildren(grid).filter(isGridItem).forEach((item) => {
    const current = readGridItemPlacement(item)
    let row = current.row
    while (occupied.some((placement) => placementsOverlap({ ...current, row }, placement))) row += 1
    const attributes = item.getAttributes()
    const needsUpdate = row !== current.row
      || Number(attributes[GRID_SPAN_ATTRIBUTE]) !== current.span
      || Number(attributes[GRID_START_ATTRIBUTE]) !== current.start
      || Number(attributes[GRID_ROW_ATTRIBUTE]) !== row
    if (needsUpdate) {
      updateGridItemPlacement(item, { ...current, row })
      changed += 1
    } else {
      directChildren(item).forEach((component) => component.set('draggable', false))
    }
    occupied.push({ ...current, row })
  })
  return changed
}

export function ensurePageGrid(editor: Editor) {
  const root = currentPageRoot(editor)
  if (!root) return undefined
  let grid = directChildren(root).find(isPageGrid)
  if (!grid) grid = root.append(pageGridDefinition())[0]
  if (!grid) return undefined
  grid.addAttributes({ [PAGE_GRID_ATTRIBUTE]: '', [GRID_CONTENT_ATTRIBUTE]: '' })
  grid.setClass('psl-page-grid')
  migrateRootChildren(root, grid)
  repairDirectPageGridChildren(grid)
  if (!directChildren(grid).some(isGridItem)) grid.append(gridItemDefinition())
  normalizeGridItemPlacements(grid)
  return grid
}

export function firstGridContent(editor: Editor) {
  return ensurePageGrid(editor)
}

export function ensureGridSlots(editor: Editor) {
  const grid = ensurePageGrid(editor)
  if (!grid || directChildren(grid).some(isGridItem)) return 0
  grid.append(gridItemDefinition())
  return 1
}

export function appendGridSlot(editor: Editor) {
  const grid = ensurePageGrid(editor)
  return grid?.append(gridItemDefinition({ row: nextGridRow(grid) }))[0]
}

export function appendGridItem(editor: Editor, content: ComponentAdd) {
  const grid = ensurePageGrid(editor)
  if (!grid) return undefined
  const selectedSlot = gridItemFor(editor.getSelected())
  const item = selectedSlot && selectedSlot.parent() === grid && directChildren(selectedSlot).length === 0
    ? selectedSlot
    : emptyGridSlot(grid) ?? grid.append(gridItemDefinition({ row: nextGridRow(grid) }))[0]
  if (!item) return undefined
  const inserted = item.append(content)[0]
  inserted?.set('draggable', false)
  if (!inserted) item.remove()
  return inserted
}

export function placeComponentInGrid(editor: Editor, component?: Component | null) {
  if (!component || isPageGrid(component) || isGridItem(component)) return component ?? undefined
  const parent = component.parent()
  const root = currentPageRoot(editor)
  if (!parent || isGridItem(parent)) return component
  if (!isPageGrid(parent) && parent !== root) return component
  const grid = ensurePageGrid(editor)
  if (!grid) return component
  const item = emptyGridSlot(grid) ?? grid.append(gridItemDefinition({ row: nextGridRow(grid) }))[0]
  component.move(item)
  component.set('draggable', false)
  return component
}

function clampedInteger(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}

export type GridItemPlacement = { span: number; start: number; row: number }
export type GridDragAction = 'move' | 'resize-left' | 'resize-right'

export function readGridItemPlacement(item?: Component | null): GridItemPlacement {
  const attributes = item?.getAttributes() ?? {}
  const span = clampedInteger(Number(attributes[GRID_SPAN_ATTRIBUTE]) || GRID_DESKTOP_COLUMNS, 1, GRID_DESKTOP_COLUMNS)
  const start = clampedInteger(Number(attributes[GRID_START_ATTRIBUTE]) || 1, 1, GRID_DESKTOP_COLUMNS - span + 1)
  const row = Math.max(1, Math.round(Number(attributes[GRID_ROW_ATTRIBUTE]) || 1))
  return { span, start, row }
}

export function updateGridItemPlacement(item: Component, placement: Partial<GridItemPlacement>) {
  const current = readGridItemPlacement(item)
  const span = clampedInteger(placement.span ?? current.span, 1, GRID_DESKTOP_COLUMNS)
  const start = clampedInteger(placement.start ?? current.start, 1, GRID_DESKTOP_COLUMNS - span + 1)
  const row = Math.max(1, Math.round(placement.row ?? current.row))
  item.addAttributes({
    [GRID_SPAN_ATTRIBUTE]: String(span),
    [GRID_START_ATTRIBUTE]: String(start),
    [GRID_ROW_ATTRIBUTE]: String(row),
  })
  item.addStyle({
    'grid-column-start': String(start),
    'grid-column-end': `span ${span}`,
    'grid-row-start': String(row),
  })
  directChildren(item).forEach((component) => component.set('draggable', false))
  return { span, start, row }
}

export function gridPlacementAfterDrag(placement: GridItemPlacement, action: GridDragAction, columnDelta: number) {
  const span = clampedInteger(placement.span, 1, GRID_DESKTOP_COLUMNS)
  const start = clampedInteger(placement.start, 1, GRID_DESKTOP_COLUMNS - span + 1)
  const row = Math.max(1, Math.round(placement.row))
  if (action === 'move') return { span, row, start: clampedInteger(start + columnDelta, 1, GRID_DESKTOP_COLUMNS - span + 1) }
  if (action === 'resize-right') return { start, row, span: clampedInteger(span + columnDelta, 1, GRID_DESKTOP_COLUMNS - start + 1) }
  const rightEdge = start + span - 1
  const nextStart = clampedInteger(start + columnDelta, 1, rightEdge)
  return { start: nextStart, span: rightEdge - nextStart + 1, row }
}

export function alignGridItem(item: Component, alignment: 'left' | 'center' | 'right') {
  const { span } = readGridItemPlacement(item)
  const available = GRID_DESKTOP_COLUMNS - span
  const start = alignment === 'left' ? 1 : alignment === 'right' ? available + 1 : Math.floor(available / 2) + 1
  return updateGridItemPlacement(item, { start })
}

export function moveGridItem(item: Component, direction: -1 | 1) {
  const parent = item.parent()
  if (!parent || !isPageGrid(parent)) return false
  const siblings = [...directChildren(parent).filter(isGridItem)].sort((first, second) => {
    const firstPlacement = readGridItemPlacement(first)
    const secondPlacement = readGridItemPlacement(second)
    return firstPlacement.row - secondPlacement.row || firstPlacement.start - secondPlacement.start
  })
  const index = siblings.indexOf(item)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return false
  const neighbor = siblings[nextIndex]
  const placement = readGridItemPlacement(item)
  const neighborPlacement = readGridItemPlacement(neighbor)
  updateGridItemPlacement(item, { row: neighborPlacement.row, start: placement.start })
  updateGridItemPlacement(neighbor, { row: placement.row, start: neighborPlacement.start })
  resolveGridItemDrop(item)
  resolveGridItemDrop(neighbor)
  sortGridItemsByPlacement(parent)
  return true
}

export function gridItemOrder(item?: Component | null) {
  const parent = item?.parent()
  if (!item || !parent || !isPageGrid(parent)) return { index: -1, count: 0 }
  const siblings = directChildren(parent)
  return { index: siblings.indexOf(item), count: siblings.length }
}

export function placeGridItemBesidePrevious(item: Component) {
  const parent = item.parent()
  if (!parent || !isPageGrid(parent)) return false
  const siblings = directChildren(parent)
  const index = siblings.indexOf(item)
  const previous = siblings[index - 1]
  if (!previous || !isGridItem(previous)) return false
  const row = readGridItemPlacement(previous).row
  updateGridItemPlacement(previous, { span: 6, start: 1, row })
  updateGridItemPlacement(item, { span: 6, start: 7, row })
  return true
}

export function placeGridItemBesidePeer(item: Component, peer: Component, side: 'left' | 'right') {
  const parent = item.parent()
  if (!parent || peer.parent() !== parent || !isPageGrid(parent) || !isGridItem(peer)) return false
  const row = readGridItemPlacement(peer).row
  if (side === 'right') {
    updateGridItemPlacement(peer, { row, start: 1, span: 6 })
    updateGridItemPlacement(item, { row, start: 7, span: 6 })
  } else {
    updateGridItemPlacement(item, { row, start: 1, span: 6 })
    updateGridItemPlacement(peer, { row, start: 7, span: 6 })
  }
  compactGridRows(parent)
  sortGridItemsByPlacement(parent)
  return true
}

export function resolveGridItemDrop(item: Component, preferredSide?: 'left' | 'right') {
  const parent = item.parent()
  if (!parent || !isPageGrid(parent)) return false
  const placement = readGridItemPlacement(item)
  const collisions = directChildren(parent).filter((candidate) => (
    candidate !== item
    && isGridItem(candidate)
    && placementsOverlap(placement, readGridItemPlacement(candidate))
  ))
  if (collisions.length === 0) return true
  if (collisions.length === 1 && preferredSide) {
    const peer = collisions[0]
    if (preferredSide === 'right') {
      updateGridItemPlacement(peer, { row: placement.row, start: 1, span: 6 })
      updateGridItemPlacement(item, { row: placement.row, start: 7, span: 6 })
    } else {
      updateGridItemPlacement(item, { row: placement.row, start: 1, span: 6 })
      updateGridItemPlacement(peer, { row: placement.row, start: 7, span: 6 })
    }
    return true
  }
  let row = placement.row + 1
  while (directChildren(parent).some((candidate) => (
    candidate !== item
    && isGridItem(candidate)
    && placementsOverlap({ ...placement, row }, readGridItemPlacement(candidate))
  ))) row += 1
  updateGridItemPlacement(item, { row })
  return true
}

export function insertGridItemAtRow(item: Component, targetRow: number) {
  const parent = item.parent()
  if (!parent || !isPageGrid(parent)) return false
  const row = Math.max(1, Math.round(targetRow))
  directChildren(parent).filter((candidate) => candidate !== item && isGridItem(candidate)).forEach((candidate) => {
    const placement = readGridItemPlacement(candidate)
    if (placement.row >= row) updateGridItemPlacement(candidate, { row: placement.row + 1 })
  })
  updateGridItemPlacement(item, { row })
  compactGridRows(parent)
  sortGridItemsByPlacement(parent)
  return true
}

export function compactGridRows(grid: Component) {
  const items = directChildren(grid).filter(isGridItem)
  const rows = [...new Set(items.map((item) => readGridItemPlacement(item).row))].sort((first, second) => first - second)
  const rowMap = new Map(rows.map((row, index) => [row, index + 1]))
  items.forEach((item) => {
    const placement = readGridItemPlacement(item)
    const compactedRow = rowMap.get(placement.row) ?? placement.row
    if (compactedRow !== placement.row) updateGridItemPlacement(item, { row: compactedRow })
  })
  return rows.length
}

export function sortGridItemsByPlacement(grid: Component) {
  const items = directChildren(grid).filter(isGridItem)
  const ordered = [...items].sort((first, second) => {
    const firstPlacement = readGridItemPlacement(first)
    const secondPlacement = readGridItemPlacement(second)
    return firstPlacement.row - secondPlacement.row || firstPlacement.start - secondPlacement.start
  })
  ordered.forEach((item, index) => {
    if (directChildren(grid)[index] !== item) item.move(grid, { at: index })
  })
  return ordered
}

export function readSiteMargin(editor: Editor) {
  const value = editor.Css.getRule('.psl-page-grid')?.getStyle()['padding-left']
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
  const paddingStyle = (value: number) => ({
    'padding-top': `${value}px`,
    'padding-right': `${value}px`,
    'padding-bottom': `${value}px`,
    'padding-left': `${value}px`,
  })
  editor.Css.setRule('.psl-page-grid', paddingStyle(desktop), { addStyles: true })
  editor.Css.setRule('.psl-page-grid', paddingStyle(Math.round(desktop * .75)), {
    addStyles: true,
    atRuleType: 'media',
    atRuleParams: '(max-width: 991px)',
  })
  editor.Css.setRule('.psl-page-grid', paddingStyle(Math.round(desktop * .5)), {
    addStyles: true,
    atRuleType: 'media',
    atRuleParams: '(max-width: 767px)',
  })
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
  editor.DomComponents.addType('psl-page-grid', {
    isComponent: (element) => element.hasAttribute?.(PAGE_GRID_ATTRIBUTE),
    model: { defaults: pageGridDefinition() },
  })
  editor.DomComponents.addType('psl-grid-section', {
    isComponent: (element) => element.hasAttribute?.(GRID_SECTION_ATTRIBUTE),
    model: { defaults: legacyGridSectionDefinition() },
  })
  editor.DomComponents.addType('psl-grid-content', {
    isComponent: (element) => element.hasAttribute?.(GRID_CONTENT_ATTRIBUTE),
    model: { defaults: legacyGridContentDefinition() },
  })
  editor.DomComponents.addType('psl-grid-item', {
    isComponent: (element) => element.hasAttribute?.(GRID_ITEM_ATTRIBUTE),
    model: { defaults: gridItemDefinition() },
  })
}
