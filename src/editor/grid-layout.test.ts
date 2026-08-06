import grapesjs from 'grapesjs'
import type { Editor } from 'grapesjs'
import { afterEach, describe, expect, it } from 'vitest'
import {
  alignGridItem,
  appendGridItem,
  appendGridSection,
  createGridLayoutPlugin,
  ensureGridSection,
  ensureGridSlots,
  GRID_EDITOR_STYLES,
  GRID_ITEM_ATTRIBUTE,
  GRID_LAYOUT_STYLES,
  GRID_SECTION_ATTRIBUTE,
  gridContentOf,
  gridItemOrder,
  gridPlacementAfterDrag,
  moveGridItem,
  moveGridItemToAdjacentSection,
  placeComponentInGrid,
  readGridItemPlacement,
  readSiteMargin,
  updateGridItemPlacement,
  updateSiteMargin,
} from './grid-layout'

describe('grid layout foundation', () => {
  let editor: Editor | undefined

  afterEach(() => editor?.destroy())

  function createEditor() {
    editor = grapesjs.init({
      headless: true,
      storageManager: false,
      plugins: [createGridLayoutPlugin],
    })
    return editor
  }

  it('creates one ready-to-use grid section on an empty page', () => {
    const current = createEditor()
    const section = ensureGridSection(current)

    expect(section?.getAttributes()).toHaveProperty(GRID_SECTION_ATTRIBUTE)
    expect(section && gridContentOf(section)).toBeDefined()
    expect(section && gridContentOf(section)?.components()).toHaveLength(1)
    expect(section && gridContentOf(section)?.components().at(0)?.getAttributes()).toHaveProperty(GRID_ITEM_ATTRIBUTE)
    expect(ensureGridSection(current)).toBe(section)
    expect(current.getWrapper()?.components()).toHaveLength(1)
  })

  it('does not convert existing legacy content automatically', () => {
    const current = createEditor()
    current.setComponents('<main><h1>Página importada</h1></main>')

    expect(ensureGridSection(current)).toBeUndefined()
    expect(current.getHtml()).toContain('Página importada')
    expect(current.getHtml()).not.toContain(GRID_SECTION_ATTRIBUTE)
  })

  it('creates and inserts into the selected page instead of the initial page', () => {
    const current = createEditor()
    current.setComponents('<main>Página inicial</main>')
    const secondPage = current.Pages.add({ id: 'second', component: '' }, { select: true })!

    ensureGridSection(current)
    appendGridItem(current, '<p>Segunda página</p>')

    expect(current.getHtml({ component: secondPage.getMainComponent() })).toContain('Segunda página')
    expect(current.getHtml({ component: current.Pages.getAll()[0].getMainComponent() })).not.toContain('Segunda página')
  })

  it('adds new content as a full-width grid item', () => {
    const current = createEditor()
    ensureGridSection(current)

    const heading = appendGridItem(current, '<h2>Nuevo contenido</h2>')

    expect(heading?.get('tagName')).toBe('h2')
    expect(heading?.parent()?.getAttributes()).toHaveProperty(GRID_ITEM_ATTRIBUTE)
    expect(heading?.parent()?.parent()?.components()).toHaveLength(1)
    expect(current.getHtml()).toContain('Nuevo contenido')
  })

  it('adds a separate grid section beside legacy content when requested by insertion', () => {
    const current = createEditor()
    current.setComponents('<main>Contenido anterior</main>')

    appendGridItem(current, '<p>Contenido nuevo</p>')

    expect(current.getWrapper()?.components()).toHaveLength(2)
    expect(current.getHtml()).toContain(GRID_SECTION_ATTRIBUTE)
    expect(current.getHtml()).toContain('Contenido anterior')
  })

  it('wraps a direct canvas drop without changing nested drops', () => {
    const current = createEditor()
    const section = ensureGridSection(current)!
    const grid = gridContentOf(section)!
    const directDrop = grid.append('<button>Directo</button>')[0]

    placeComponentInGrid(current, directDrop)

    expect(directDrop.parent()?.getAttributes()).toHaveProperty(GRID_ITEM_ATTRIBUTE)
    const nested = directDrop.append('<span>Interior</span>')[0]
    placeComponentInGrid(current, nested)
    expect(nested.parent()).toBe(directDrop)
  })

  it('sizes and aligns a grid item within twelve desktop columns', () => {
    const current = createEditor()
    const component = appendGridItem(current, '<p>Posicionable</p>')!
    const item = component.parent()!

    updateGridItemPlacement(item, { span: 6 })
    expect(readGridItemPlacement(item)).toEqual({ span: 6, start: 1 })
    expect(alignGridItem(item, 'center')).toEqual({ span: 6, start: 4 })
    expect(alignGridItem(item, 'right')).toEqual({ span: 6, start: 7 })
    expect(item.getStyle()).toMatchObject({
      'grid-column-end': 'span 6',
      'grid-column-start': '7',
    })
    expect(current.getCss()).toContain('grid-column-start:7')
  })

  it('calculates bounded move and resize gestures in column steps', () => {
    expect(gridPlacementAfterDrag({ start: 4, span: 6 }, 'move', 2)).toEqual({ start: 6, span: 6 })
    expect(gridPlacementAfterDrag({ start: 4, span: 6 }, 'move', 20)).toEqual({ start: 7, span: 6 })
    expect(gridPlacementAfterDrag({ start: 4, span: 6 }, 'resize-right', -2)).toEqual({ start: 4, span: 4 })
    expect(gridPlacementAfterDrag({ start: 4, span: 6 }, 'resize-left', 2)).toEqual({ start: 6, span: 4 })
    expect(gridPlacementAfterDrag({ start: 4, span: 6 }, 'resize-left', -10)).toEqual({ start: 1, span: 9 })
  })

  it('reorders items inside their grid section', () => {
    const current = createEditor()
    const first = appendGridItem(current, '<p>Primero</p>')!.parent()!
    const second = appendGridItem(current, '<p>Segundo</p>')!.parent()!

    expect(gridItemOrder(second)).toEqual({ index: 1, count: 2 })
    expect(moveGridItem(second, -1)).toBe(true)
    expect(gridItemOrder(second)).toEqual({ index: 0, count: 2 })
    expect(current.getHtml().indexOf('Segundo')).toBeLessThan(current.getHtml().indexOf('Primero'))
    expect(moveGridItem(second, -1)).toBe(false)
    expect(first.parent()).toBe(second.parent())
  })

  it('adds additional independent sections', () => {
    const current = createEditor()
    ensureGridSection(current)

    const secondSection = appendGridSection(current)

    expect(secondSection).toBeDefined()
    expect(secondSection && gridContentOf(secondSection)?.components()).toHaveLength(1)
    expect(current.getHtml().match(new RegExp(GRID_SECTION_ATTRIBUTE, 'g'))).toHaveLength(2)
  })

  it('moves an empty slot into the previous section and creates a side-by-side pair', () => {
    const current = createEditor()
    const firstComponent = appendGridItem(current, '<p>Primero</p>')!
    const secondSection = appendGridSection(current)!
    const secondSlot = gridContentOf(secondSection)!.components().at(0)!

    expect(moveGridItemToAdjacentSection(current, secondSlot, -1)).toBe(true)

    expect(current.getHtml().match(new RegExp(GRID_SECTION_ATTRIBUTE, 'g'))).toHaveLength(1)
    expect(firstComponent.parent()?.parent()?.components()).toHaveLength(2)
    expect(readGridItemPlacement(firstComponent.parent())).toEqual({ span: 6, start: 1 })
    expect(readGridItemPlacement(secondSlot)).toEqual({ span: 6, start: 7 })
  })

  it('fills the selected empty slot in a later section', () => {
    const current = createEditor()
    appendGridItem(current, '<p>Primera sección</p>')
    const secondSection = appendGridSection(current)!
    const secondSlot = gridContentOf(secondSection)!.components().at(0)!
    current.select(secondSlot)

    const inserted = appendGridItem(current, '<p>Segunda sección</p>')

    expect(inserted?.parent()).toBe(secondSlot)
    expect(gridContentOf(secondSection)?.components()).toHaveLength(1)
  })

  it('migrates an existing empty section to a selectable grid slot', () => {
    const current = createEditor()
    const section = ensureGridSection(current)!
    gridContentOf(section)?.components().reset()

    expect(ensureGridSlots(current)).toBe(1)
    expect(gridContentOf(section)?.components()).toHaveLength(1)
    expect(ensureGridSlots(current)).toBe(0)
  })

  it('updates the responsive site margin variables', () => {
    const current = createEditor()
    current.Css.addRules(GRID_LAYOUT_STYLES)

    expect(updateSiteMargin(current, 40)).toBe(40)
    expect(readSiteMargin(current)).toBe(40)
    expect(current.getCss()).toContain('--psl-site-margin-desktop:40px')
    expect(current.getCss()).toContain('--psl-site-margin-tablet:30px')
    expect(current.getCss()).toContain('--psl-site-margin-mobile:20px')
  })

  it('keeps editor placeholders out of exported layout styles', () => {
    expect(GRID_LAYOUT_STYLES).toContain('repeat(12')
    expect(GRID_LAYOUT_STYLES).toContain('repeat(8')
    expect(GRID_LAYOUT_STYLES).toContain('repeat(4')
    expect(GRID_LAYOUT_STYLES).not.toContain('Arrastra un elemento aquí')
    expect(GRID_LAYOUT_STYLES).not.toContain('psl-grid-canvas-controls')
    expect(GRID_EDITOR_STYLES).toContain('Arrastra un elemento aquí')
    expect(GRID_EDITOR_STYLES).toContain('psl-grid-canvas-controls')
  })
})
