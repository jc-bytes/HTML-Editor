import { describe, expect, it } from 'vitest'
import grapesjs from 'grapesjs'
import blocksBasic from 'grapesjs-blocks-basic'
import pluginForms from 'grapesjs-plugin-forms'
import { configureStarterBlocks, starterLayoutBlocks, starterStyles } from './starter-blocks'

describe('starter component blocks', () => {
  it('replaces empty column shells with visible, editable examples', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true, plugins: [blocksBasic, pluginForms] })
    configureStarterBlocks(editor)

    expect(editor.BlockManager.getCategories().some((category: { getLabel: () => string }) => category.getLabel() === 'Básico')).toBe(true)
    expect(String(editor.BlockManager.get('column1')?.getContent())).toContain('Un título claro')
    expect(String(editor.BlockManager.get('column2')?.getContent())).toContain('Tu imagen aquí')
    expect(String(editor.BlockManager.get('column3')?.getContent())).toContain('Tercer beneficio')
    expect(String(editor.BlockManager.get('column3-7')?.getContent())).toContain('Contenido principal')
    expect(Object.values(starterLayoutBlocks).every((content) => content.includes('@media(max-width:767px)'))).toBe(true)
    expect(starterStyles).toContain('align-items:start')
    expect(starterStyles).toContain('align-self:start')
    expect(starterLayoutBlocks.column3).toContain('data-gjs-name="Tarjeta 1"')

    editor.destroy()
    container.remove()
  })

  it('gives common media, text, and form blocks meaningful defaults', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true, plugins: [blocksBasic, pluginForms] })
    configureStarterBlocks(editor)

    expect(editor.BlockManager.get('text')?.get('label')).toBe('Texto')
    expect(JSON.stringify(editor.BlockManager.get('image')?.getContent())).toContain('Imagen de ejemplo')
    expect(String(editor.BlockManager.get('form')?.getContent())).toContain('Contáctanos')
    expect(editor.BlockManager.get('form')?.get('category')).toBe('Formularios')
    expect(String(editor.BlockManager.get('input')?.getContent())).toContain('Escribe tu nombre')
    expect(String(editor.BlockManager.get('textarea')?.getContent())).toContain('Escribe tu mensaje')
    expect(String(editor.BlockManager.get('select')?.getContent())).toContain('Opción 3')
    expect(JSON.stringify(editor.BlockManager.get('button')?.getContent())).toContain('Continuar')
    expect(String(editor.BlockManager.get('label')?.getContent())).toContain('Correo electrónico')
    expect(String(editor.BlockManager.get('checkbox')?.getContent())).toContain('términos y condiciones')
    expect(editor.BlockManager.get('radio')?.get('label')).toBe('Grupo de opciones')
    expect(String(editor.BlockManager.get('radio')?.getContent()).match(/type="radio"/g)).toHaveLength(3)

    editor.destroy()
    container.remove()
  })
})
