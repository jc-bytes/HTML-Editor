import grapesjs from 'grapesjs'
import type { Editor } from 'grapesjs'
import { afterEach, describe, expect, it } from 'vitest'
import {
  appendGridItem,
  appendGridSlot,
  createGridLayoutPlugin,
  ensurePageGrid,
  GRID_EDITOR_STYLES,
  GRID_ITEM_ATTRIBUTE,
  GRID_LAYOUT_STYLES,
  GRID_SECTION_ATTRIBUTE,
  gridItemOrder,
  gridPlacementAfterDrag,
  moveGridItem,
  PAGE_GRID_ATTRIBUTE,
  placeComponentInGrid,
  placeGridItemAtHorizontalDrop,
  placeGridItemBesidePrevious,
  readGridItemPlacement,
  readSiteMargin,
  updateGridItemPlacement,
  updateSiteMargin,
  alignGridItem,
} from './grid-layout'

describe('body-level grid layout', () => {
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

  it('creates one permanent page grid with an initial selectable slot', () => {
    const current = createEditor()
    const grid = ensurePageGrid(current)

    expect(grid?.getAttributes()).toHaveProperty(PAGE_GRID_ATTRIBUTE)
    expect(grid?.get('removable')).toBe(false)
    expect(grid?.get('droppable')).toBe(`[${GRID_ITEM_ATTRIBUTE}]`)
    expect(grid?.components()).toHaveLength(1)
    expect(grid?.components().at(0)?.getAttributes()).toHaveProperty(GRID_ITEM_ATTRIBUTE)
    expect(current.getWrapper()?.components()).toHaveLength(1)
    expect(ensurePageGrid(current)).toBe(grid)
  })

  it('wraps direct legacy body content in full-width grid items', () => {
    const current = createEditor()
    current.setComponents('<header>Cabecera</header><main>Contenido anterior</main>')

    const grid = ensurePageGrid(current)!

    expect(current.getWrapper()?.components()).toHaveLength(1)
    expect(grid.components()).toHaveLength(2)
    expect(current.getHtml()).toContain('Cabecera')
    expect(current.getHtml()).toContain('Contenido anterior')
  })

  it('flattens old section grids into one page grid', () => {
    const current = createEditor()
    current.setComponents(`
      <section ${GRID_SECTION_ATTRIBUTE}><div data-psl-grid-content><div ${GRID_ITEM_ATTRIBUTE}><p>Uno</p></div></div></section>
      <section ${GRID_SECTION_ATTRIBUTE}><div data-psl-grid-content><div ${GRID_ITEM_ATTRIBUTE}><p>Dos</p></div></div></section>
    `)

    const grid = ensurePageGrid(current)!

    expect(grid.components()).toHaveLength(2)
    expect(current.getHtml()).not.toContain(GRID_SECTION_ATTRIBUTE)
    expect(current.getHtml().match(new RegExp(PAGE_GRID_ATTRIBUTE, 'g'))).toHaveLength(1)
  })

  it('creates and inserts into the selected page instead of the initial page', () => {
    const current = createEditor()
    current.setComponents('<main>Página inicial</main>')
    const secondPage = current.Pages.add({ id: 'second', component: '' }, { select: true })!

    appendGridItem(current, '<p>Segunda página</p>')

    expect(current.getHtml({ component: secondPage.getMainComponent() })).toContain('Segunda página')
    expect(current.getHtml({ component: current.Pages.getAll()[0].getMainComponent() })).not.toContain('Segunda página')
  })

  it('reuses the selected empty slot when inserting content', () => {
    const current = createEditor()
    const grid = ensurePageGrid(current)!
    const selectedSlot = appendGridSlot(current)!
    current.select(selectedSlot)

    const inserted = appendGridItem(current, '<p>Seleccionado</p>')

    expect(inserted?.parent()).toBe(selectedSlot)
    expect(grid.components()).toHaveLength(2)
  })

  it('wraps a component dropped directly on the body or page grid', () => {
    const current = createEditor()
    const grid = ensurePageGrid(current)!
    const directDrop = grid.append('<button>Directo</button>')[0]

    placeComponentInGrid(current, directDrop)

    expect(directDrop.parent()?.getAttributes()).toHaveProperty(GRID_ITEM_ATTRIBUTE)
    const nested = directDrop.append('<span>Interior</span>')[0]
    placeComponentInGrid(current, nested)
    expect(nested.parent()).toBe(directDrop)
  })

  it('repairs content that escaped a grid item and reuses the empty slot', () => {
    const current = createEditor()
    const grid = ensurePageGrid(current)!
    const slot = grid.components().at(0)!
    const image = slot.append('<img src="example.png">')[0]

    image.move(grid)
    expect(image.parent()).toBe(grid)

    ensurePageGrid(current)

    expect(image.parent()).toBe(slot)
    expect(grid.components()).toHaveLength(1)
    expect(grid.components().models.every((component) => (
      component.getAttributes()[GRID_ITEM_ATTRIBUTE] !== undefined
    ))).toBe(true)
  })

  it('sizes and aligns an item within twelve desktop columns', () => {
    const current = createEditor()
    const item = appendGridItem(current, '<p>Posicionable</p>')!.parent()!

    updateGridItemPlacement(item, { span: 6 })
    expect(readGridItemPlacement(item)).toEqual({ span: 6, start: 1 })
    expect(alignGridItem(item, 'center')).toEqual({ span: 6, start: 4 })
    expect(alignGridItem(item, 'right')).toEqual({ span: 6, start: 7 })
    expect(current.getCss()).toContain('grid-column-start:7')
  })

  it('calculates bounded move and resize gestures in column steps', () => {
    expect(gridPlacementAfterDrag({ start: 4, span: 6 }, 'move', 2)).toEqual({ start: 6, span: 6 })
    expect(gridPlacementAfterDrag({ start: 4, span: 6 }, 'move', 20)).toEqual({ start: 7, span: 6 })
    expect(gridPlacementAfterDrag({ start: 4, span: 6 }, 'resize-right', -2)).toEqual({ start: 4, span: 4 })
    expect(gridPlacementAfterDrag({ start: 4, span: 6 }, 'resize-left', 2)).toEqual({ start: 6, span: 4 })
    expect(gridPlacementAfterDrag({ start: 4, span: 6 }, 'resize-left', -10)).toEqual({ start: 1, span: 9 })
  })

  it('reorders items in the single page grid', () => {
    const current = createEditor()
    const first = appendGridItem(current, '<p>Primero</p>')!.parent()!
    const second = appendGridItem(current, '<p>Segundo</p>')!.parent()!

    expect(gridItemOrder(second)).toEqual({ index: 1, count: 2 })
    expect(moveGridItem(second, -1)).toBe(true)
    expect(gridItemOrder(second)).toEqual({ index: 0, count: 2 })
    expect(first.parent()).toBe(second.parent())
  })

  it('places an item beside its previous sibling as a 6 + 6 row', () => {
    const current = createEditor()
    const first = appendGridItem(current, '<p>Primero</p>')!.parent()!
    const second = appendGridItem(current, '<p>Segundo</p>')!.parent()!

    expect(placeGridItemBesidePrevious(second)).toBe(true)
    expect(readGridItemPlacement(first)).toEqual({ span: 6, start: 1 })
    expect(readGridItemPlacement(second)).toEqual({ span: 6, start: 7 })
  })

  it('uses a horizontal drop to place an item beside its previous sibling', () => {
    const current = createEditor()
    const first = appendGridItem(current, '<p>Texto</p>')!.parent()!
    const second = appendGridItem(current, '<img src="example.png">')!.parent()!

    expect(placeGridItemAtHorizontalDrop(second, .82, first)).toBe(true)
    expect(readGridItemPlacement(first)).toEqual({ span: 6, start: 1 })
    expect(readGridItemPlacement(second)).toEqual({ span: 6, start: 7 })
  })

  it('moves a narrower item horizontally without resizing it', () => {
    const current = createEditor()
    const item = appendGridItem(current, '<p>Movible</p>')!.parent()!
    updateGridItemPlacement(item, { span: 4, start: 1 })

    expect(placeGridItemAtHorizontalDrop(item, 1)).toBe(true)
    expect(readGridItemPlacement(item)).toEqual({ span: 4, start: 9 })
  })

  it('updates the responsive site margin variables', () => {
    const current = createEditor()
    ensurePageGrid(current)
    current.Css.addRules(GRID_LAYOUT_STYLES)

    expect(updateSiteMargin(current, 40)).toBe(40)
    expect(readSiteMargin(current)).toBe(40)
    expect(current.getCss()).toContain('--psl-site-margin-desktop:40px')
    expect(current.getCss()).toContain('--psl-site-margin-tablet:30px')
    expect(current.getCss()).toContain('--psl-site-margin-mobile:20px')
    expect(current.getCss()).toContain('padding-left:40px')
    expect(current.getCss()).toContain('padding-left:30px')
    expect(current.getCss()).toContain('padding-left:20px')
  })

  it('exports one responsive page grid without editor controls', () => {
    expect(GRID_LAYOUT_STYLES).toContain('min-height: 100vh')
    expect(GRID_LAYOUT_STYLES).toContain('repeat(12')
    expect(GRID_LAYOUT_STYLES).toContain('repeat(8')
    expect(GRID_LAYOUT_STYLES).toContain('repeat(4')
    expect(GRID_LAYOUT_STYLES).not.toContain('Arrastra un elemento aquí')
    expect(GRID_LAYOUT_STYLES).not.toContain('psl-grid-canvas-controls')
    expect(GRID_EDITOR_STYLES).toContain('Arrastra un elemento aquí')
    expect(GRID_EDITOR_STYLES).toContain('psl-grid-canvas-controls')
  })
})
