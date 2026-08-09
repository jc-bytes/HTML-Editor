import { describe, expect, it } from 'vitest'
import grapesjs from 'grapesjs'
import {
  createSectionLayoutPlugin,
  readSectionLayoutSettings,
  SECTION_LAYOUT_STYLES,
  sectionGridFor,
  updateSectionColumnCount,
  updateSectionColumnWidth,
  updateSectionGap,
  updateSectionMargin,
  updateSectionPadding,
} from './section-layout'

function createSection() {
  const editor = grapesjs.init({ headless: true, storageManager: false })
  const section = editor.getWrapper()!.append(`
    <section class="builder-starter-section">
      <div class="builder-starter-grid builder-starter-grid--3">
        <article class="builder-starter-card">Uno</article>
        <article class="builder-starter-card">Dos</article>
        <article class="builder-starter-card">Tres</article>
      </div>
    </section>
  `)[0]
  return { editor, section, grid: section.components().at(0)! }
}

describe('section column configuration', () => {
  it('registers starter grids as section layout components', () => {
    const editor = grapesjs.init({
      headless: true,
      plugins: [createSectionLayoutPlugin],
      storageManager: false,
    })
    editor.setComponents('<div class="builder-starter-grid builder-starter-grid--3"></div>')

    const grid = editor.getWrapper()!.components().at(0)!
    expect(grid.get('type')).toBe('builder-section-grid')
    expect(grid.get('resizable')).toBe(false)
    editor.destroy()
  })

  it('finds the section grid from one of its cards', () => {
    const { editor, grid } = createSection()
    expect(sectionGridFor(grid.components().at(1))).toBe(grid)
    expect(readSectionLayoutSettings(grid).columns).toEqual([33, 33, 34])
    editor.destroy()
  })

  it('keeps column percentages at 100 and assigns the remainder to the last column', () => {
    const { editor, grid } = createSection()

    updateSectionColumnWidth(grid, 0, 40)
    expect(readSectionLayoutSettings(grid).columns).toEqual([40, 30, 30])

    updateSectionColumnWidth(grid, 1, 25)
    expect(readSectionLayoutSettings(grid).columns).toEqual([40, 25, 35])
    expect(grid.getStyle()['--builder-section-columns']).toContain('40fr')
    editor.destroy()
  })

  it('changes track count without deleting cards', () => {
    const { editor, grid } = createSection()
    updateSectionColumnCount(grid, 2)

    expect(readSectionLayoutSettings(grid).columns).toEqual([50, 50])
    expect(grid.components()).toHaveLength(3)
    editor.destroy()
  })

  it('stores gap and section spacing only on the configured section', () => {
    const { editor, section, grid } = createSection()
    updateSectionGap(grid, 28)
    updateSectionMargin(grid, 36)
    updateSectionPadding(grid, 40)

    expect(readSectionLayoutSettings(grid)).toMatchObject({ gap: 28, margin: 36, padding: 40 })
    expect(grid.getStyle()).toMatchObject({ gap: '28px' })
    expect(section.getStyle()).toMatchObject({
      'margin-top': '36px',
      'margin-bottom': '36px',
      padding: '40px',
    })
    editor.destroy()
  })

  it('keeps custom sections stacked on mobile', () => {
    expect(SECTION_LAYOUT_STYLES).toContain('@media (max-width: 767px)')
    expect(SECTION_LAYOUT_STYLES).toContain('grid-template-columns: minmax(0, 1fr)')
  })
})
