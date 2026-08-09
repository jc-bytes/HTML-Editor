import grapesjs from 'grapesjs'
import type { Editor } from 'grapesjs'
import { afterEach, describe, expect, it } from 'vitest'
import {
  appendGridItem,
  appendGridSlot,
  appendLayoutRow,
  createGridLayoutPlugin,
  ensurePageGrid,
  FULL_PAGE_TEMPLATE_ATTRIBUTE,
  GRID_EDITOR_STYLES,
  GRID_LAYOUT_STYLES,
  isGridItem,
  LAYOUT_COLUMN_ATTRIBUTE,
  LAYOUT_PRESET_ATTRIBUTE,
  LAYOUT_ROW_ATTRIBUTE,
  layoutRowFor,
  layoutRowOrder,
  moveLayoutRow,
  PAGE_LAYOUT_ATTRIBUTE,
  placeComponentInGrid,
  readLayoutSettings,
  readSiteMargin,
  updateLayoutGap,
  updateLayoutMinHeight,
  updateLayoutPreset,
  updateSiteMargin,
} from './grid-layout'

describe('page layout rows', () => {
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

  it('creates one permanent page layout with one row and one visible column', () => {
    const current = createEditor()
    const layout = ensurePageGrid(current)!
    const row = layout.components().at(0)!
    const column = row.components().at(0)!

    expect(layout.getAttributes()).toHaveProperty(PAGE_LAYOUT_ATTRIBUTE)
    expect(layout.get('removable')).toBe(false)
    expect(layout.get('droppable')).toBe(`[${LAYOUT_ROW_ATTRIBUTE}]`)
    expect(row.getAttributes()).toHaveProperty(LAYOUT_ROW_ATTRIBUTE)
    expect(column.getAttributes()).toHaveProperty(LAYOUT_COLUMN_ATTRIBUTE)
    expect(column.get('removable')).toBe(false)
    expect(current.getWrapper()?.components()).toHaveLength(1)
    expect(ensurePageGrid(current)).toBe(layout)
  })

  it('keeps full-page templates outside the ordinary page grid', () => {
    const current = createEditor()
    current.setComponents(`<main class="builder-auth-page" ${FULL_PAGE_TEMPLATE_ATTRIBUTE}="auth"><form>Access</form></main>`)

    expect(ensurePageGrid(current)).toBeUndefined()
    expect(current.getWrapper()?.components()).toHaveLength(1)
    expect(current.getWrapper()?.components().at(0)?.getAttributes())
      .toHaveProperty(FULL_PAGE_TEMPLATE_ATTRIBUTE, 'auth')
    expect(current.getHtml()).not.toContain(PAGE_LAYOUT_ATTRIBUTE)
  })

  it('repairs legacy access templates that were wrapped in a page grid', () => {
    const current = createEditor()
    current.setComponents(`<main ${PAGE_LAYOUT_ATTRIBUTE} class="builder-page-layout">
      <section ${LAYOUT_ROW_ATTRIBUTE} class="builder-layout-row">
        <div ${LAYOUT_COLUMN_ATTRIBUTE} class="builder-layout-column">
          <main class="builder-auth-page"><form>Access</form></main>
        </div>
      </section>
    </main>`)

    expect(ensurePageGrid(current)).toBeUndefined()
    expect(current.getWrapper()?.components()).toHaveLength(1)
    expect(current.getWrapper()?.components().at(0)?.getClasses()).toContain('builder-auth-page')
    expect(current.getHtml()).not.toContain(PAGE_LAYOUT_ATTRIBUTE)
  })

  it('adds independent two- and three-column rows', () => {
    const current = createEditor()
    const layout = ensurePageGrid(current)!
    const two = appendLayoutRow(current, 'equal-2')!
    const three = appendLayoutRow(current, 'equal-3')!

    expect(two.components()).toHaveLength(2)
    expect(three.components()).toHaveLength(3)

    updateLayoutPreset(two, 'sidebar-left')
    expect(readLayoutSettings(two).preset).toBe('sidebar-left')
    expect(three.getAttributes()[LAYOUT_PRESET_ATTRIBUTE]).toBe('equal-3')
    expect(three.components()).toHaveLength(3)
    expect(layout.components()).toHaveLength(3)
  })

  it('repairs stale one-column styles when a populated row changes preset', () => {
    const current = createEditor()
    const row = ensurePageGrid(current)!.components().at(0)!
    row.components().at(0)!.append('<section>Contenido existente</section>')
    row.addStyle({ display: 'block', 'grid-template-columns': 'minmax(0, 1fr)' })

    updateLayoutPreset(row, 'equal-3')

    expect(row.components()).toHaveLength(3)
    expect(current.getHtml()).toContain('Contenido existente')
    expect(row.getStyle()).toMatchObject({ display: 'grid', width: '100%' })
    expect(row.getStyle()).not.toHaveProperty('grid-template-columns')
  })

  it('repairs stale structural row styles when an existing project loads', () => {
    const current = createEditor()
    current.setComponents(`<main ${PAGE_LAYOUT_ATTRIBUTE} class="builder-page-layout">
      <section ${LAYOUT_ROW_ATTRIBUTE} ${LAYOUT_PRESET_ATTRIBUTE}="equal-2" class="builder-layout-row" style="display:block;grid-template-columns:1fr">
        <div ${LAYOUT_COLUMN_ATTRIBUTE} class="builder-layout-column"><p>Izquierda</p></div>
        <div ${LAYOUT_COLUMN_ATTRIBUTE} class="builder-layout-column"><p>Derecha</p></div>
      </section>
    </main>`)

    const row = ensurePageGrid(current)!.components().at(0)!

    expect(row.getStyle()).toMatchObject({ display: 'grid', width: '100%' })
    expect(row.getStyle()).not.toHaveProperty('grid-template-columns')
    expect(readLayoutSettings(row).preset).toBe('equal-2')
    expect(row.components()).toHaveLength(2)
  })

  it('changes only the selected row gap and minimum height', () => {
    const current = createEditor()
    const first = ensurePageGrid(current)!.components().at(0)!
    const second = appendLayoutRow(current, 'equal-2')!

    updateLayoutGap(second, 36)
    updateLayoutMinHeight(second, 280)

    expect(readLayoutSettings(second)).toEqual({ preset: 'equal-2', gap: 36, minHeight: 280 })
    expect(second.getStyle().gap).toBe('36px')
    expect(readLayoutSettings(first)).toEqual({ preset: 'single', gap: 20, minHeight: 120 })
  })

  it('moves content into the first remaining column when reducing column count', () => {
    const current = createEditor()
    const row = appendLayoutRow(current, 'equal-3')!
    const columns = row.components().models
    columns[0].append('<p>Uno</p>')
    columns[1].append('<p>Dos</p>')
    columns[2].append('<p>Tres</p>')

    updateLayoutPreset(row, 'single')

    expect(row.components()).toHaveLength(1)
    expect(row.components().at(0)?.components()).toHaveLength(3)
    expect(current.getHtml()).toContain('Tres')
  })

  it('inserts content into a selected empty column', () => {
    const current = createEditor()
    const layout = ensurePageGrid(current)!
    const selectedColumn = appendGridSlot(current, 'equal-2')!
    current.select(selectedColumn)

    const inserted = appendGridItem(current, '<p>Seleccionado</p>')

    expect(inserted?.parent()).toBe(selectedColumn)
    expect(layoutRowFor(inserted)?.getAttributes()[LAYOUT_PRESET_ATTRIBUTE]).toBe('equal-2')
    expect(layout.components()).toHaveLength(2)
  })

  it('uses another empty column before creating a new row', () => {
    const current = createEditor()
    const layout = ensurePageGrid(current)!
    updateLayoutPreset(layout.components().at(0)!, 'equal-2')

    const first = appendGridItem(current, '<p>Primero</p>')!
    const second = appendGridItem(current, '<p>Segundo</p>')!

    expect(first.parent()).not.toBe(second.parent())
    expect(first.parent()?.parent()).toBe(second.parent()?.parent())
    expect(layout.components()).toHaveLength(1)
  })

  it('wraps direct body or page-layout drops in a single-column row', () => {
    const current = createEditor()
    const layout = ensurePageGrid(current)!
    const directDrop = layout.append('<button>Directo</button>')[0]

    placeComponentInGrid(current, directDrop)

    expect(isGridItem(directDrop.parent())).toBe(true)
    expect(layoutRowFor(directDrop)?.getAttributes()[LAYOUT_PRESET_ATTRIBUTE]).toBe('single')
    const nested = directDrop.append('<span>Interior</span>')[0]
    placeComponentInGrid(current, nested)
    expect(nested.parent()).toBe(directDrop)
  })

  it('wraps existing body content in separate vertical rows', () => {
    const current = createEditor()
    current.setComponents('<header>Cabecera</header><section>Contenido anterior</section>')

    const layout = ensurePageGrid(current)!

    expect(current.getWrapper()?.components()).toHaveLength(1)
    expect(layout.components()).toHaveLength(2)
    expect(current.getHtml()).toContain('Cabecera')
    expect(current.getHtml()).toContain('Contenido anterior')
  })

  it('reorders complete rows without changing their internal columns', () => {
    const current = createEditor()
    const first = ensurePageGrid(current)!.components().at(0)!
    const second = appendLayoutRow(current, 'equal-2')!

    expect(layoutRowOrder(second)).toEqual({ index: 1, count: 2 })
    expect(moveLayoutRow(second, -1)).toBe(true)
    expect(layoutRowOrder(second)).toEqual({ index: 0, count: 2 })
    expect(second.components()).toHaveLength(2)
    expect(first.components()).toHaveLength(1)
  })

  it('creates and inserts into the selected page', () => {
    const current = createEditor()
    current.setComponents('<main>Página inicial</main>')
    const secondPage = current.Pages.add({ id: 'second', component: '' }, { select: true })!

    appendGridItem(current, '<p>Segunda página</p>')

    expect(current.getHtml({ component: secondPage.getMainComponent() })).toContain('Segunda página')
    expect(current.getHtml({ component: current.Pages.getAll()[0].getMainComponent() })).not.toContain('Segunda página')
  })

  it('persists row preset, gap, and height through serialized HTML', () => {
    const current = createEditor()
    const row = ensurePageGrid(current)!.components().at(0)!
    updateLayoutPreset(row, 'sidebar-right')
    updateLayoutGap(row, 28)
    updateLayoutMinHeight(row, 240)
    const html = current.getHtml()
    current.destroy()

    const restored = createEditor()
    restored.setComponents(html)
    const restoredRow = ensurePageGrid(restored)!.components().at(0)!

    expect(readLayoutSettings(restoredRow)).toEqual({ preset: 'sidebar-right', gap: 28, minHeight: 240 })
    expect(restoredRow.components()).toHaveLength(2)
  })

  it('updates responsive site margin rules', () => {
    const current = createEditor()
    ensurePageGrid(current)
    current.Css.addRules(GRID_LAYOUT_STYLES)

    expect(updateSiteMargin(current, 40)).toBe(40)
    expect(readSiteMargin(current)).toBe(40)
    expect(current.getCss()).toContain('padding-left:40px')
    expect(current.getCss()).toContain('@media (max-width: 991px)')
    expect(current.getCss()).toContain('padding-left:30px')
    expect(current.getCss()).toContain('@media (max-width: 767px)')
    expect(current.getCss()).toContain('padding-left:20px')
  })

  it('exports responsive rows while keeping editor-only drop hints separate', () => {
    expect(GRID_LAYOUT_STYLES).toContain('min-height: 100vh')
    expect(GRID_LAYOUT_STYLES).toContain('repeat(2')
    expect(GRID_LAYOUT_STYLES).toContain('repeat(3')
    expect(GRID_LAYOUT_STYLES).toContain('display: grid !important')
    expect(GRID_LAYOUT_STYLES).toContain('repeat(2, minmax(0, 1fr)) !important')
    expect(GRID_LAYOUT_STYLES).toContain('@media (max-width: 767px)')
    expect(GRID_LAYOUT_STYLES).toContain('align-items: start')
    expect(GRID_LAYOUT_STYLES).toContain('min-height: 0')
    expect(GRID_LAYOUT_STYLES).not.toContain('min-height: var(--builder-layout-min-height')
    expect(GRID_LAYOUT_STYLES).not.toContain('Arrastra un elemento aquí')
    expect(GRID_EDITOR_STYLES).toContain('Arrastra un elemento aquí')
    expect(GRID_EDITOR_STYLES).toContain('min-height: var(--builder-layout-min-height')
  })

  it('registers each layout preset as an add-panel block', () => {
    const current = createEditor()
    expect(current.BlockManager.get('builder-layout-single')?.getLabel()).toBe('Una columna')
    expect(current.BlockManager.get('builder-layout-single')?.get('media')).toContain('<svg')
    expect(current.BlockManager.get('builder-layout-equal-2')?.getLabel()).toBe('Dos columnas')
    expect(current.BlockManager.get('builder-layout-equal-3')?.getLabel()).toBe('Tres columnas')
  })
})
