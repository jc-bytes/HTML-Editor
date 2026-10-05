import { describe, expect, it, vi } from 'vitest'
import {
  addComponentColorToolbar,
  addComponentPositionToolbar,
  applyContainerHorizontalAlignment,
  applyContainerVerticalAlignment,
  applyDirectComponentColor,
  applyComponentLineHeight,
  applyInlineTextStyle,
  cssColorToHex,
  enhanceColorPicker,
  disableCanvasResizing,
  installEditorCanvasLayoutGuards,
  isEditableCanvasTarget,
  keepToolbarInsideBounds,
  reorderedPageIndex,
  authMetadataFieldMarkup,
} from './OpenSourceEditor'
import grapesjs from 'grapesjs'
import type { Component } from 'grapesjs'

describe('section double-click routing', () => {
  it('lets editable text handle double-clicks while section chrome keeps its own action', () => {
    const section = document.createElement('section')
    const paragraph = document.createElement('p')
    const inlineText = document.createElement('span')
    paragraph.append(inlineText)
    section.append(paragraph)
    const components = [{ getEl: () => section, get: () => false }, {
      getEl: () => paragraph,
      get: (key: string) => key === 'editable',
    }] as unknown as Component[]

    expect(isEditableCanvasTarget(inlineText, components)).toBe(true)
    expect(isEditableCanvasTarget(section, components)).toBe(false)
  })
})

describe('page reordering', () => {
  it('calculates stable insertion indexes when dragging in either direction', () => {
    expect(reorderedPageIndex(0, 2, 'before')).toBe(1)
    expect(reorderedPageIndex(0, 2, 'after')).toBe(2)
    expect(reorderedPageIndex(2, 0, 'before')).toBe(0)
    expect(reorderedPageIndex(2, 0, 'after')).toBe(1)
  })
})

describe('inline typography controls', () => {
  it('renders a mapped signup radio group from visual settings', () => {
    const markup = authMetadataFieldMarkup({
      key: 'user_role', label: 'Choose your role', control: 'radio', direction: 'horizontal', required: true,
      destinationTableId: 'profiles-table', destinationField: 'user_role',
      options: [{ label: 'Student', value: 'student', description: 'Learn and practice' }, { label: 'Teacher', value: 'teacher' }],
    })
    const document = new DOMParser().parseFromString(markup, 'text/html')

    expect(
      document
        .querySelector('[data-builder-auth-metadata-definition="user_role"]')
        ?.getAttribute('data-builder-auth-metadata-table'),
    ).toBe('profiles-table')
    expect(document.querySelector('fieldset')?.getAttribute('data-builder-auth-metadata-direction')).toBe('horizontal')
    expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(2)
    expect(document.querySelector('.builder-auth-choice')?.getAttribute('style')).toContain('display:flex')
    expect(document.querySelector('.builder-auth-choice-grid')?.getAttribute('style')).toContain('repeat(auto-fit')
    expect(document.querySelector('input')?.getAttribute('style')).toContain('width:20px!important')
    expect(document.body.textContent).toContain('Student')
    expect(document.body.textContent).toContain('Learn and practice')
    expect(document.querySelector('input')?.hasAttribute('required')).toBe(true)
  })

  it('keeps a scaled toolbar clear of the canvas edges', () => {
    const toolbar = document.createElement('div')
    toolbar.style.left = '-40px'
    toolbar.style.top = '-20px'
    Object.defineProperties(toolbar, {
      offsetWidth: { configurable: true, value: 560 },
      offsetHeight: { configurable: true, value: 80 },
    })
    toolbar.getBoundingClientRect = () => new DOMRect(460, 70, 280, 40)

    expect(keepToolbarInsideBounds(toolbar, new DOMRect(500, 80, 600, 500))).toBe(true)
    expect(toolbar.style.left).toBe('64px')
    expect(toolbar.style.top).toBe('24px')
  })

  it('wraps only the highlighted text with the selected font size', () => {
    document.body.innerHTML = '<p id="text">Edit this phrase</p>'
    const text = document.querySelector('#text')!
    const textNode = text.firstChild!
    const selection = window.getSelection()!
    const range = document.createRange()
    range.setStart(textNode, 5)
    range.setEnd(textNode, 9)
    selection.removeAllRanges()
    selection.addRange(range)

    expect(applyInlineTextStyle({ doc: document, el: text as HTMLElement, selection: () => selection }, 'font-size', '24px')).toBe(true)
    expect(text.innerHTML).toBe('Edit <span style="font-size: 24px;">this</span> phrase')
  })

  it('does not insert formatting without highlighted text', () => {
    document.body.innerHTML = '<p id="text">Nothing selected</p>'
    const text = document.querySelector('#text')!
    const selection = window.getSelection()!
    selection.removeAllRanges()

    expect(applyInlineTextStyle({ doc: document, el: text as HTMLElement, selection: () => selection }, 'font-family', 'Georgia, serif')).toBe(false)
    expect(text.innerHTML).toBe('Nothing selected')
  })

  it('replaces an existing inline value instead of nesting conflicting styles', () => {
    document.body.innerHTML = '<p id="text"><span style="line-height: 2">Two lines</span></p>'
    const text = document.querySelector('#text')!
    const styledText = text.querySelector('span')!
    const selection = window.getSelection()!
    const range = document.createRange()
    range.selectNodeContents(styledText)
    selection.removeAllRanges()
    selection.addRange(range)

    expect(applyInlineTextStyle({ doc: document, el: text as HTMLElement, selection: () => selection }, 'line-height', 'normal')).toBe(true)
    expect(text.querySelectorAll('[style*="line-height"]').length).toBe(1)
    expect((text.querySelector('[style*="line-height"]') as HTMLElement).style.lineHeight).toBe('normal')
  })

  it('stores line spacing on the component and clears stale nested line heights', () => {
    document.body.innerHTML = '<h1 id="text"><span style="line-height: 2">Saved heading</span></h1>'
    const text = document.querySelector('#text') as HTMLElement
    const descendant = { removeStyle: vi.fn() }
    const component = { addStyle: vi.fn(), find: vi.fn(() => [descendant]) }

    expect(applyComponentLineHeight(
      component as never,
      { doc: document, el: text, selection: () => null },
      '1.15',
    )).toBe(true)
    expect(component.addStyle).toHaveBeenCalledWith({ 'line-height': '1.15' })
    expect(descendant.removeStyle).toHaveBeenCalledWith('line-height')
    expect(text.querySelector('span')).not.toHaveAttribute('style')
  })

  it('normalizes computed RGB colors for the toolbar color input', () => {
    expect(cssColorToHex('rgb(22, 127, 120)')).toBe('#167f78')
    expect(cssColorToHex('#AABBCC')).toBe('#aabbcc')
  })
})

describe('direct canvas resizing', () => {
  it('disables handles for an entire component tree', () => {
    const editor = grapesjs.init({ headless: true, storageManager: false })
    const section = editor.getWrapper()!.append(`
      <section class="builder-starter-section">
        <div class="builder-starter-grid builder-starter-grid--3">
          <article class="builder-starter-card">Tarjeta</article>
        </div>
      </section>
    `)[0]
    const grid = section.components().at(0)!
    const card = grid.components().at(0)!

    section.set('resizable', true)
    grid.set('resizable', true)
    card.set('resizable', true)

    expect(disableCanvasResizing(section)).toBe(4)
    expect(section.get('resizable')).toBe(false)
    expect(grid.get('resizable')).toBe(false)
    expect(card.get('resizable')).toBe(false)
    editor.destroy()
  })

  it('stores dimension changes on one component instead of its shared class', () => {
    const editor = grapesjs.init({
      headless: true,
      selectorManager: { componentFirst: true },
      storageManager: false,
    })
    editor.SelectorManager.setComponentFirst(true)
    const [first, second] = editor.getWrapper()!.append(`
      <article class="shared-card">Uno</article>
      <article class="shared-card">Dos</article>
    `)
    const styleTarget = editor.StyleManager.getModelToStyle(first)

    styleTarget.addStyle({ width: '320px', height: '180px' })

    expect(first.getStyle()).toMatchObject({ width: '320px', height: '180px' })
    expect(second.getStyle()).not.toHaveProperty('width')
    expect(editor.Css.getRule('.shared-card')?.getStyle()?.width).toBeUndefined()
    editor.destroy()
  })
})

describe('direct component colors', () => {
  it('adds an eyedropper that commits the sampled color through Spectrum input', async () => {
    document.body.innerHTML = `
      <div class="visual-editor-color-picker">
        <div class="sp-input-container"><input class="sp-input"></div>
      </div>
    `
    const picker = document.querySelector<HTMLElement>('.visual-editor-color-picker')!
    const input = picker.querySelector<HTMLInputElement>('.sp-input')!
    const onChange = vi.fn()
    input.addEventListener('change', onChange)
    class MockEyeDropper {
      open = vi.fn(async () => ({ sRGBHex: '#12abef' }))
    }

    expect(enhanceColorPicker(picker, MockEyeDropper)).toBe(true)
    expect(enhanceColorPicker(picker, MockEyeDropper)).toBe(false)
    picker.querySelector<HTMLButtonElement>('.visual-editor-eyedropper')!.click()
    await vi.waitFor(() => expect(input.value).toBe('#12abef'))

    expect(input.placeholder).toContain('#RRGGBB')
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('leaves a disabled sampling control when the browser lacks EyeDropper', () => {
    document.body.innerHTML = '<div class="visual-editor-color-picker"><div class="sp-input-container"><input class="sp-input"></div></div>'
    const picker = document.querySelector<HTMLElement>('.visual-editor-color-picker')!

    expect(enhanceColorPicker(picker, undefined)).toBe(true)
    expect(picker.querySelector<HTMLButtonElement>('.visual-editor-eyedropper')).toBeDisabled()
  })

  it('adds background and border actions only to container toolbars', () => {
    const editor = grapesjs.init({ headless: true, storageManager: false })
    const [section, text] = editor.getWrapper()!.append('<section><p>Contenido</p></section><p>Texto</p>')

    expect(addComponentColorToolbar(section)).toBe(true)
    expect((section.get('toolbar') ?? []).filter((item) => String(item.id).startsWith('builder:set-'))).toHaveLength(2)
    expect(addComponentColorToolbar(section)).toBe(false)
    expect(addComponentColorToolbar(text)).toBe(false)
    editor.destroy()
  })

  it('applies colors only to the targeted component', () => {
    const editor = grapesjs.init({ headless: true, storageManager: false })
    const [first, second] = editor.getWrapper()!.append('<section>Uno</section><section>Dos</section>')

    applyDirectComponentColor(first, 'background-color', '#123456')
    applyDirectComponentColor(first, 'border-color', '#abcdef')

    expect(first.getStyle()).toMatchObject({
      'background-color': '#123456',
      'border-color': '#abcdef',
      'border-style': 'solid',
      'border-width': '1px',
    })
    expect(second.getStyle()).not.toHaveProperty('background-color')
    editor.destroy()
  })
})

describe('container positioning', () => {
  it('adds a positioning action to elements inside a container', () => {
    const editor = grapesjs.init({ headless: true, storageManager: false })
    const section = editor.getWrapper()!.append('<section><img src="example.png"></section>')[0]
    const image = section.components().at(0)!

    expect(addComponentPositionToolbar(image)).toBe(true)
    expect((image.get('toolbar') ?? []).some((item) => item.id === 'builder:set-container-position')).toBe(true)
    expect((image.get('toolbar') ?? []).some((item) => item.id === 'builder:set-container-horizontal-position')).toBe(true)
    expect(addComponentPositionToolbar(image)).toBe(false)
    editor.destroy()
  })

  it('aligns the immediate container without styling the selected child', () => {
    const editor = grapesjs.init({ headless: true, storageManager: false })
    const section = editor.getWrapper()!.append('<section data-builder-layout-row><div data-builder-layout-column><img src="example.png"></div></section>')[0]
    const column = section.components().at(0)!
    const image = column.components().at(0)!

    expect(applyContainerVerticalAlignment(image, 'center')).toBe(true)
    expect(column.getStyle()).toMatchObject({
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': 'center',
      'align-self': 'stretch',
      height: '100%',
    })
    expect(image.getStyle()).not.toHaveProperty('justify-content')
    editor.destroy()
  })

  it('aligns only the selected element horizontally', () => {
    const editor = grapesjs.init({ headless: true, storageManager: false })
    const section = editor.getWrapper()!.append('<section><img src="one.png" style="width:100%"><img src="two.png"></section>')[0]
    const first = section.components().at(0)!
    const second = section.components().at(1)!

    expect(applyContainerHorizontalAlignment(first, 'right')).toBe(true)
    expect(section.getStyle()).toMatchObject({ display: 'flex', 'flex-direction': 'column' })
    expect(first.getStyle()).toMatchObject({ 'align-self': 'flex-end', width: '90%' })
    expect(second.getStyle()).not.toHaveProperty('align-self')
    editor.destroy()
  })
})

describe('editor canvas layout guards', () => {
  it('caps runaway viewport-height sections only inside the editor document', () => {
    const editorDocument = document
    editorDocument.body.innerHTML = `
      <main class="runaway" style="min-height: 16777213px"></main>
      <section class="normal" style="min-height: 600px"></section>
    `
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 16_777_213 })

    expect(installEditorCanvasLayoutGuards(editorDocument)).toBe(1)
    expect(editorDocument.querySelector('.runaway')).toHaveAttribute('data-builder-editor-viewport-guard', 'true')
    expect(editorDocument.querySelector('.normal')).not.toHaveAttribute('data-builder-editor-viewport-guard')
    expect(editorDocument.head.querySelector('style[data-builder-editor-layout-guards]')?.textContent)
      .toContain('--builder-editor-viewport-height: 720px')
    expect(editorDocument.head.querySelector('style[data-builder-editor-layout-guards]')?.textContent)
      .toContain('--builder-editor-data-card-height: 320px')
    expect(editorDocument.head.querySelector('style[data-builder-editor-layout-guards]')?.textContent)
      .toContain('min-height: var(--builder-editor-viewport-height) !important')
    expect(editorDocument.head.querySelector('style[data-builder-editor-layout-guards]')?.textContent)
      .toContain('.builder-data-grid')
    expect(editorDocument.head.querySelector('style[data-builder-editor-layout-guards]')?.textContent)
      .toContain('.lsp-page')
    expect(editorDocument.head.querySelector('style[data-builder-editor-layout-guards]')?.textContent)
      .toContain('.builder-page-layout')
    expect(editorDocument.head.querySelector('style[data-builder-editor-layout-guards]')?.textContent)
      .toContain('grid-template-columns: repeat(var(--builder-data-cols-desktop, 4)')
  })

  it('detects a runaway minimum height even when the iframe viewport itself is normal', () => {
    document.body.innerHTML = '<div class="runaway" style="min-height: 16777213px"></div>'
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 })

    expect(installEditorCanvasLayoutGuards(document, 720)).toBe(1)
    expect(document.querySelector('.runaway')).toHaveAttribute('data-builder-editor-viewport-guard', 'true')
  })
})
