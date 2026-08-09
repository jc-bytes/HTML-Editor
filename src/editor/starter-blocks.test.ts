import { describe, expect, it } from 'vitest'
import grapesjs from 'grapesjs'
import blocksBasic from 'grapesjs-blocks-basic'
import pluginForms from 'grapesjs-plugin-forms'
import {
  applyNavbarLogoutPresentation,
  configureStarterBlocks,
  normalizeStarterNavbars,
  resolveNavbarPlugin,
  starterLayoutBlocks,
  starterNavbarPlugin,
  starterNavbarLogoutButton,
  starterNavbarStyles,
  starterStyles,
  updateStarterNavbarLink,
} from './starter-blocks'

describe('starter component blocks', () => {
  it('normalizes CommonJS plugin wrappers before registration', () => {
    const plugin = (() => undefined) as unknown as ReturnType<typeof resolveNavbarPlugin>
    expect(resolveNavbarPlugin({ default: plugin })).toBe(plugin)
    expect(resolveNavbarPlugin({ default: { default: plugin } })).toBe(plugin)
  })

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

  it('uses a polished responsive navbar with generic navigation labels', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({
      container,
      headless: true,
      storageManager: false,
      plugins: [starterNavbarPlugin],
    })
    configureStarterBlocks(editor)

    const block = editor.BlockManager.get('navbar')!
    const content = block.getContent()
    if (!content || typeof content === 'function') throw new Error('Navbar block content is missing.')
    editor.addComponents(content)
    const html = editor.getHtml()
    const css = editor.getCss()

    expect(block.get('label')).toBe('Barra de navegación')
    expect(html).toContain('Tu sitio')
    expect(html).toContain('class="builder-navbar"')
    expect(html).toContain('Servicios')
    expect(html).toContain('Proyectos')
    expect(html).toContain('Contacto')
    expect(html).toContain('builder-navbar-menu-link is-active')
    expect(css).toContain('.builder-navbar-menu')
    expect(css).toContain('@media (max-width: 820px)')

    const navbarComponent = editor.getWrapper()?.components().at(0)!
    navbarComponent.removeClass('builder-navbar')
    navbarComponent.addClass('navbar')
    expect(normalizeStarterNavbars(editor)).toBeGreaterThan(0)
    expect(navbarComponent.getClasses()).toContain('builder-navbar')
    expect(navbarComponent.getClasses()).not.toContain('navbar')

    const links = editor.getWrapper()?.findType('navbar-nav-menu-link') ?? []
    updateStarterNavbarLink(links[1], {
      active: true,
      href: '#new-section',
      label: 'Nueva sección',
    })
    expect(links[0].getClasses()).not.toContain('is-active')
    expect(links[1].getClasses()).toContain('is-active')
    expect(links[1].getAttributes().href).toBe('#new-section')
    expect(links[1].getInnerHTML()).toBe('Nueva sección')
    updateStarterNavbarLink(links[1], { active: false, label: 'Sección renombrada' })
    expect(links[1].getAttributes().href).toBe('#new-section')

    const logout = links[0].parent()!.append(
      '<button data-builder-auth-action="logout" style="background:green">Cerrar sesión</button>',
    )[0]
    expect(normalizeStarterNavbars(editor)).toBeGreaterThan(0)
    expect(logout.getClasses()).toContain('builder-navbar-logout')
    expect(logout.getAttributes()['aria-label']).toBe('Cerrar sesión')
    expect(logout.getAttributes()['data-builder-auth-presentation']).toBe('text')
    expect(logout.getInnerHTML()).toBe('Cerrar sesión')
    applyNavbarLogoutPresentation(logout, 'icon')
    expect(logout.getInnerHTML()).toContain('<svg')
    expect(logout.getInnerHTML()).not.toContain('Cerrar sesión')
    applyNavbarLogoutPresentation(logout, 'both')
    expect(logout.getInnerHTML()).toContain('<svg')
    expect(logout.getInnerHTML()).toContain('Cerrar sesión')
    expect(logout.getClasses()).toContain('builder-navbar-logout--both')
    expect(logout.getClasses()).not.toContain('builder-navbar-logout--text')
    expect(logout.getStyle()).toMatchObject({
      display: 'inline-flex',
      'flex-direction': 'row',
      gap: '8px',
      'white-space': 'nowrap',
    })
    logout.components('<span>Cerrar sesión</span>')
    logout.removeClass('builder-navbar-logout')
    expect(normalizeStarterNavbars(editor)).toBeGreaterThan(0)
    expect(logout.getInnerHTML()).toContain('<svg')
    expect(logout.getInnerHTML()).toContain('Cerrar sesión')
    expect(logout.getClasses()).toContain('builder-navbar-logout')
    expect(starterNavbarStyles).toContain('display: inline-flex')
    expect(starterNavbarStyles).toContain('white-space: nowrap')
    expect(starterNavbarLogoutButton).toContain('stroke="currentColor"')
    expect(starterNavbarLogoutButton).toContain('aria-label="Cerrar sesión"')

    editor.destroy()
    container.remove()
  })
})
