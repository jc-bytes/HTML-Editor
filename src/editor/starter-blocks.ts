import type { Component, Editor } from 'grapesjs'
import navbar from 'grapesjs-navbar'
import {
  AUTH_ACTION_ATTRIBUTE,
  AUTH_PRESENTATION_ATTRIBUTE,
  type AuthLogoutPresentation,
} from '../core/auth-components'

export const starterNavbarStyles = `
.builder-navbar {
  width: 100%;
  min-height: 72px;
  color: #17324d;
  background: #fff;
  border-bottom: 1px solid #e4ece9;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.builder-navbar-container {
  width: min(100% - 36px, 1120px);
  min-height: 72px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 22px;
}
.builder-navbar-brand {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #17324d;
  text-decoration: none;
  font-weight: 800;
  white-space: nowrap;
}
.builder-navbar-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  color: #fff;
  background: #178579;
  border-radius: 9px;
  font-size: 12px;
  letter-spacing: -.02em;
}
.builder-navbar-name { font-size: 15px; letter-spacing: -.015em; }
.builder-navbar-items-c { margin-left: auto; }
.builder-navbar-menu {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: #f2f7f5;
  border-radius: 12px;
}
.builder-navbar-menu-link {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  color: #50677a;
  border-radius: 9px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  transition: color .18s ease, background .18s ease;
}
.builder-navbar-menu-link:hover { color: #176f68; background: #e5efec; }
.builder-navbar-menu-link.is-active {
  color: #fff;
  background: #178579;
  box-shadow: 0 4px 12px rgba(23, 133, 121, .18);
}
.builder-navbar-logout {
  width: 44px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  color: #66798a;
  background: transparent;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  transition: color .18s ease, background .18s ease;
}
.builder-navbar-logout:hover { color: #17324d; background: #e5efec; }
.builder-navbar-logout--text,
.builder-navbar-logout--both { width: auto; padding: 0 15px; font: inherit; font-size: 14px; font-weight: 700; }
.builder-navbar-logout--both { gap: 8px; padding: 0 13px; white-space: nowrap; }
.builder-navbar-logout svg {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}
.builder-navbar-logout--both span { line-height: 1; }
.builder-navbar-burger {
  width: 42px;
  height: 42px;
  margin-left: auto;
  display: none;
  padding: 10px;
  background: #f2f7f5;
  border-radius: 10px;
  cursor: pointer;
}
.builder-navbar-burger-line {
  height: 2px;
  margin: 4px 0;
  padding: 0;
  background: #17324d;
  border-radius: 2px;
}
@media (max-width: 820px) {
  .builder-navbar-container { flex-wrap: wrap; padding: 14px 0; }
  .builder-navbar-burger { display: block; }
  .builder-navbar-items-c { width: 100%; margin-left: 0; display: none; }
  .builder-navbar-menu { width: 100%; display: grid; gap: 3px; }
  .builder-navbar-menu-link { width: 100%; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .builder-navbar-menu-link, .builder-navbar-logout { transition: none; }
}`

export const starterNavbarLogoutIcon = '<svg aria-hidden="true" fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="22"><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9"/></svg>'

export const starterNavbarLogoutButton = `<button aria-label="Cerrar sesión" class="builder-navbar-logout" data-builder-auth-action="logout" data-builder-auth-presentation="icon" data-builder-auth-visible="signed-in" data-gjs-name="Cerrar sesión" title="Cerrar sesión" type="button">${starterNavbarLogoutIcon}</button>`

export const starterNavbarBlock = {
  type: 'navbar',
  components: [{
    type: 'navbar-container',
    components: [{
      type: 'link',
      attributes: { 'aria-label': 'Inicio', class: 'builder-navbar-brand', href: '#' },
      components: [
        { tagName: 'span', attributes: { class: 'builder-navbar-mark' }, components: 'T' },
        { tagName: 'span', attributes: { class: 'builder-navbar-name' }, components: 'Tu sitio' },
      ],
    }, {
      type: 'navbar-burger-menu',
    }, {
      attributes: { class: 'builder-navbar-items-c', 'data-gjs': 'navbar-items' },
      components: {
        type: 'navbar-nav-menu',
        components: [
          { type: 'navbar-nav-menu-link', attributes: { class: 'builder-navbar-menu-link is-active', href: '#' }, components: 'Inicio' },
          { type: 'navbar-nav-menu-link', attributes: { class: 'builder-navbar-menu-link', href: '#servicios' }, components: 'Servicios' },
          { type: 'navbar-nav-menu-link', attributes: { class: 'builder-navbar-menu-link', href: '#proyectos' }, components: 'Proyectos' },
          { type: 'navbar-nav-menu-link', attributes: { class: 'builder-navbar-menu-link', href: '#nosotros' }, components: 'Nosotros' },
          { type: 'navbar-nav-menu-link', attributes: { class: 'builder-navbar-menu-link', href: '#contacto' }, components: 'Contacto' },
        ],
      },
    }],
  }],
}

export function resolveNavbarPlugin(candidate: unknown): typeof navbar {
  let current = candidate
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current === 'function') return current as typeof navbar
    if (!current || typeof current !== 'object') break
    current = (current as { default?: unknown }).default
  }
  throw new Error('No se pudo cargar el componente de barra de navegación.')
}

export function starterNavbarPlugin(editor: Editor) {
  resolveNavbarPlugin(navbar)(editor, {
    block: {
      category: 'Elementos',
      content: starterNavbarBlock,
    },
    classPrefix: 'builder-navbar',
    label: 'Barra de navegación',
    style: starterNavbarStyles,
  })
}

function navbarLogoutStyle(presentation: AuthLogoutPresentation) {
  return {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-direction': 'row',
    width: presentation === 'icon' ? '44px' : 'auto',
    height: '38px',
    padding: presentation === 'icon' ? '0' : presentation === 'both' ? '0 13px' : '0 15px',
    gap: presentation === 'both' ? '8px' : '0',
    color: '#66798a',
    'background-color': 'transparent',
    border: '0',
    'border-radius': '9px',
    cursor: 'pointer',
    'font-family': 'inherit',
    'font-size': '14px',
    'font-weight': '700',
    'line-height': '1',
    'white-space': 'nowrap',
  }
}

export function normalizeStarterNavbars(editor: Editor) {
  const classByType: Record<string, string> = {
    navbar: 'builder-navbar',
    'navbar-container': 'builder-navbar-container',
    'navbar-nav-menu': 'builder-navbar-menu',
    'navbar-nav-menu-link': 'builder-navbar-menu-link',
    'navbar-burger-menu': 'builder-navbar-burger',
    'navbar-burger-menu-line': 'builder-navbar-burger-line',
  }
  let changed = 0
  const visit = (component?: Component, insideNavbar = false) => {
    if (!component) return
    const type = String(component.get('type') ?? '')
    const isInsideNavbar = insideNavbar || type === 'navbar'
    const expectedClass = classByType[type]
    if (expectedClass) {
      const legacyClass = type === 'navbar'
        ? 'navbar'
        : type === 'navbar-container'
          ? 'navbar-container'
          : type === 'navbar-nav-menu'
            ? 'navbar-menu'
            : type === 'navbar-nav-menu-link'
              ? 'navbar-menu-link'
              : type === 'navbar-burger-menu' ? 'navbar-burger' : 'navbar-burger-line'
      const classes = component.getClasses()
      if (classes.includes(legacyClass)) {
        component.removeClass(legacyClass)
        changed += 1
      }
      if (!component.getClasses().includes(expectedClass)) {
        component.addClass(expectedClass)
        changed += 1
      }
    }
    if (isInsideNavbar && component.getAttributes()[AUTH_ACTION_ATTRIBUTE] === 'logout') {
      const savedPresentation = component.getAttributes()[AUTH_PRESENTATION_ATTRIBUTE]
      const presentation: AuthLogoutPresentation = savedPresentation === 'icon'
        || savedPresentation === 'text'
        || savedPresentation === 'both'
        ? savedPresentation
        : component.getInnerHTML().includes('<svg') ? 'icon' : 'text'
      const style = component.getStyle()
      const expectedStyle = navbarLogoutStyle(presentation)
      const markup = component.getInnerHTML()
      const hasIcon = markup.includes('<svg')
      const hasLabel = markup.includes('Cerrar sesión')
      const classes = component.getClasses()
      const needsRepair = savedPresentation !== presentation
        || hasIcon !== (presentation !== 'text')
        || hasLabel !== (presentation !== 'icon')
        || !classes.includes('builder-navbar-logout')
        || classes.includes('builder-navbar-logout--text') !== (presentation === 'text')
        || classes.includes('builder-navbar-logout--both') !== (presentation === 'both')
        || Object.entries(expectedStyle).some(([property, value]) => style[property] !== value)
      if (needsRepair) {
        applyNavbarLogoutPresentation(component, presentation)
        changed += 1
      }
    }
    component.components().models.forEach((child) => visit(child, isInsideNavbar))
  }
  editor.Pages.getAll().forEach((page) => visit(page.getMainComponent()))
  return changed
}

export function applyNavbarLogoutPresentation(
  component: Component,
  presentation: AuthLogoutPresentation,
) {
  component.components(presentation === 'icon'
    ? starterNavbarLogoutIcon
    : presentation === 'both'
      ? `${starterNavbarLogoutIcon}<span>Cerrar sesión</span>`
      : 'Cerrar sesión')
  component.addClass('builder-navbar-logout')
  if (presentation === 'text') component.addClass('builder-navbar-logout--text')
  else component.removeClass('builder-navbar-logout--text')
  if (presentation === 'both') component.addClass('builder-navbar-logout--both')
  else component.removeClass('builder-navbar-logout--both')
  component.addAttributes({
    [AUTH_PRESENTATION_ATTRIBUTE]: presentation,
    'aria-label': 'Cerrar sesión',
    title: 'Cerrar sesión',
  })
  component.setStyle(navbarLogoutStyle(presentation))
}

export function updateStarterNavbarLink(
  component: Component,
  settings: { active: boolean; href?: string; label: string },
) {
  const label = settings.label.trim() || 'Enlace'
  const encodedLabel = document.createElement('span')
  encodedLabel.textContent = label
  component.components(encodedLabel.innerHTML)
  if (settings.href !== undefined) component.addAttributes({ href: settings.href.trim() || '#' })
  const siblings = component.parent()?.components().models ?? []
  siblings.forEach((candidate) => candidate.removeClass('is-active'))
  if (settings.active) component.addClass('is-active')
}

export const starterStyles = `<style>
.builder-starter-section{width:100%;padding:clamp(28px,5vw,64px);color:#17302e;background:#f7faf9;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
.builder-starter-grid{display:grid;gap:20px;align-items:start}
.builder-starter-grid--2{grid-template-columns:repeat(2,minmax(0,1fr))}
.builder-starter-grid--3{grid-template-columns:repeat(3,minmax(0,1fr))}
.builder-starter-grid--aside{grid-template-columns:minmax(180px,.35fr) minmax(0,1fr)}
.builder-starter-card{min-width:0;align-self:start;padding:24px;background:#fff;border:1px solid #d8e3e1;border-radius:16px;box-shadow:0 10px 24px rgba(20,55,52,.07)}
.builder-starter-card h2,.builder-starter-card h3{margin:0 0 10px;color:#173f3d;line-height:1.15}
.builder-starter-card p{margin:0;color:#58706c;line-height:1.6}
.builder-starter-eyebrow{margin:0 0 10px!important;color:#6d53d9!important;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
.builder-starter-button{display:inline-block;margin-top:20px;padding:11px 16px;color:#fff!important;background:#6f52dc;border-radius:8px;text-decoration:none;font-weight:800}
.builder-starter-visual{min-height:240px;display:grid;place-items:center;padding:24px;color:#e9fffa;background:linear-gradient(135deg,#126f69,#243f5f 58%,#7456df);border-radius:18px;text-align:center}
.builder-starter-visual strong{display:block;font-size:22px}.builder-starter-visual span{display:block;margin-top:7px;opacity:.8}
.builder-starter-number{width:36px;height:36px;display:grid;place-items:center;margin-bottom:32px;color:#fff;background:#6f52dc;border-radius:10px;font-weight:850}
@media(max-width:767px){.builder-starter-grid--2,.builder-starter-grid--3,.builder-starter-grid--aside{grid-template-columns:1fr}.builder-starter-section{padding:24px 18px}}
</style>`

export const starterLayoutBlocks = {
  column1: `<section class="builder-starter-section" data-gjs-name="Sección destacada">
    <div class="builder-starter-card" style="max-width:780px;margin:0 auto;text-align:center">
      <p class="builder-starter-eyebrow">Presenta tu idea</p>
      <h2 style="font-size:clamp(30px,5vw,54px)">Un título claro que invite a continuar</h2>
      <p style="max-width:620px;margin:0 auto">Explica aquí el propósito de esta sección. Puedes editar el texto, los colores y el botón.</p>
      <a class="builder-starter-button" href="#">Conoce más</a>
    </div>
  </section>${starterStyles}`,
  column2: `<section class="builder-starter-section" data-gjs-name="Imagen y texto">
    <div class="builder-starter-grid builder-starter-grid--2">
      <div class="builder-starter-visual" data-gjs-name="Imagen de ejemplo"><div><strong>Tu imagen aquí</strong><span>Reemplaza este bloque por una foto o video</span></div></div>
      <article class="builder-starter-card" data-gjs-name="Contenido">
        <p class="builder-starter-eyebrow">Destaca lo importante</p>
        <h2>Combina una imagen con una explicación</h2>
        <p>Este diseño funciona bien para presentar un proyecto, una actividad, una persona o un servicio.</p>
        <a class="builder-starter-button" href="#">Ver detalles</a>
      </article>
    </div>
  </section>${starterStyles}`,
  column3: `<section class="builder-starter-section" data-gjs-name="Tres tarjetas">
    <div class="builder-starter-grid builder-starter-grid--3">
      <article class="builder-starter-card" data-gjs-name="Tarjeta 1"><div class="builder-starter-number">1</div><h3>Primer beneficio</h3><p>Describe una idea principal con una frase breve y fácil de entender.</p></article>
      <article class="builder-starter-card" data-gjs-name="Tarjeta 2"><div class="builder-starter-number">2</div><h3>Segundo beneficio</h3><p>Cambia el texto, el color o agrega una imagen para personalizar esta tarjeta.</p></article>
      <article class="builder-starter-card" data-gjs-name="Tarjeta 3"><div class="builder-starter-number">3</div><h3>Tercer beneficio</h3><p>Las tarjetas se acomodan automáticamente en pantallas pequeñas.</p></article>
    </div>
  </section>${starterStyles}`,
  'column3-7': `<section class="builder-starter-section" data-gjs-name="Barra lateral y contenido">
    <div class="builder-starter-grid builder-starter-grid--aside">
      <aside class="builder-starter-card" style="background:#e9e4ff;border-color:#d1c7ff"><p class="builder-starter-eyebrow">En resumen</p><h3>Idea clave</h3><p>Usa esta columna para una nota, dato o llamada de atención.</p></aside>
      <article class="builder-starter-card"><h2>Contenido principal</h2><p>La columna ancha ofrece espacio para explicar el tema con más detalle. Puedes añadir imágenes, listas, botones u otros componentes dentro de ella.</p><a class="builder-starter-button" href="#">Continuar</a></article>
    </div>
  </section>${starterStyles}`,
} as const

const imagePlaceholder = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#126f69"/><stop offset="1" stop-color="#7456df"/></linearGradient></defs><rect width="1200" height="675" rx="28" fill="url(#g)"/><circle cx="600" cy="285" r="72" fill="none" stroke="#fff" stroke-width="18" opacity=".85"/><path d="M310 520 485 355l110 103 96-83 199 145H310Z" fill="#fff" opacity=".82"/><text x="600" y="600" fill="#fff" font-family="Arial,sans-serif" font-size="34" text-anchor="middle">Haz doble clic para reemplazar esta imagen</text></svg>`)}`

const fieldShellStyle = 'display:grid;gap:7px;max-width:440px;color:#243d39;font-family:Inter,ui-sans-serif,system-ui,sans-serif'
const fieldLabelStyle = 'font-size:14px;font-weight:750;line-height:1.35'
const fieldControlStyle = 'width:100%;min-height:44px;box-sizing:border-box;padding:0 12px;color:#243d39;background:#fff;border:1px solid #b9cbc7;border-radius:8px;font:inherit'

const starterFormBlocks = {
  input: `<label style="${fieldShellStyle}"><span style="${fieldLabelStyle}">Nombre</span><input type="text" name="nombre" placeholder="Escribe tu nombre" style="${fieldControlStyle}"></label>`,
  textarea: `<label style="${fieldShellStyle}"><span style="${fieldLabelStyle}">Mensaje</span><textarea name="mensaje" placeholder="Escribe tu mensaje" style="${fieldControlStyle};min-height:120px;padding:12px;resize:vertical"></textarea></label>`,
  select: `<label style="${fieldShellStyle}"><span style="${fieldLabelStyle}">Elige una opción</span><select name="opcion" style="${fieldControlStyle}"><option value="">Selecciona…</option><option value="opcion-1">Opción 1</option><option value="opcion-2">Opción 2</option><option value="opcion-3">Opción 3</option></select></label>`,
  label: `<label style="${fieldShellStyle}"><span style="${fieldLabelStyle}">Correo electrónico</span><input type="email" name="correo" placeholder="nombre@ejemplo.com" style="${fieldControlStyle}"></label>`,
  checkbox: `<label style="display:flex;align-items:flex-start;gap:10px;max-width:440px;color:#243d39;font:500 15px/1.45 Inter,ui-sans-serif,system-ui,sans-serif"><input type="checkbox" name="aceptar" value="si" style="width:18px;height:18px;margin:2px 0 0;accent-color:#6f52dc"><span>Acepto los términos y condiciones.</span></label>`,
  radio: `<fieldset style="display:grid;gap:10px;max-width:440px;margin:0;padding:18px;color:#243d39;border:1px solid #d8e3e1;border-radius:12px;font:500 15px/1.4 Inter,ui-sans-serif,system-ui,sans-serif"><legend style="padding:0 6px;font-weight:800">Elige una opción</legend><label style="display:flex;align-items:center;gap:9px"><input type="radio" name="opcion-ejemplo" value="opcion-1" checked style="width:18px;height:18px;accent-color:#6f52dc">Opción 1</label><label style="display:flex;align-items:center;gap:9px"><input type="radio" name="opcion-ejemplo" value="opcion-2" style="width:18px;height:18px;accent-color:#6f52dc">Opción 2</label><label style="display:flex;align-items:center;gap:9px"><input type="radio" name="opcion-ejemplo" value="opcion-3" style="width:18px;height:18px;accent-color:#6f52dc">Opción 3</label></fieldset>`,
} as const

export function configureStarterBlocks(editor: Editor) {
  editor.BlockManager.getCategories().forEach((category: { getLabel: () => string; set: (key: string, value: string) => void }) => {
    if (category.getLabel().toLowerCase() === 'basic') category.set('label', 'Básico')
  })
  Object.entries(starterLayoutBlocks).forEach(([id, content]) => {
    const block = editor.BlockManager.get(id)
    if (!block) return
    const labels: Record<string, string> = {
      column1: 'Sección destacada',
      column2: 'Imagen + texto',
      column3: 'Tres tarjetas',
      'column3-7': 'Barra lateral',
    }
    block.set({ category: 'Diseño', content, label: labels[id] })
  })

  editor.BlockManager.get('text-basic')?.set({
    category: 'Diseño',
    label: 'Texto con título',
    content: `<section class="builder-starter-section"><div class="builder-starter-card"><h2>Título de la sección</h2><p>Escribe aquí una explicación clara. Puedes seleccionar cualquier texto para cambiar su tamaño, color y estilo.</p></div></section>${starterStyles}`,
  })
  editor.BlockManager.get('quote')?.set({
    category: 'Diseño',
    label: 'Cita',
    content: '<blockquote style="margin:24px;padding:24px 28px;color:#253e3b;background:#f1f7f5;border-left:5px solid #6f52dc;border-radius:0 12px 12px 0;font:600 20px/1.5 Georgia,serif">“Escribe aquí una frase importante que quieras destacar.”<footer style="margin-top:12px;color:#617773;font:500 14px/1.4 Inter,system-ui,sans-serif">— Nombre de la persona</footer></blockquote>',
  })
  editor.BlockManager.get('link-block')?.set({ category: 'Diseño', label: 'Enlace destacado' })
  editor.BlockManager.get('text')?.set({
    category: 'Elementos',
    label: 'Texto',
    content: { type: 'text', content: 'Escribe aquí tu texto.', style: { padding: '10px', color: '#263b38', 'line-height': '1.6' } },
  })
  editor.BlockManager.get('link')?.set({
    category: 'Elementos',
    label: 'Enlace',
    content: { type: 'link', content: 'Conoce más →', style: { color: '#5f45cf', 'font-weight': '700' } },
  })
  editor.BlockManager.get('image')?.set({
    category: 'Elementos',
    label: 'Imagen',
    content: { type: 'image', attributes: { alt: 'Imagen de ejemplo', src: imagePlaceholder }, style: { display: 'block', width: '100%', 'max-width': '900px', 'border-radius': '14px' } },
  })
  editor.BlockManager.get('video')?.set({ category: 'Elementos', label: 'Video' })
  editor.BlockManager.get('map')?.set({ category: 'Elementos', label: 'Mapa' })
  editor.BlockManager.get('navbar')?.set({
    category: 'Elementos',
    content: starterNavbarBlock,
    label: 'Barra de navegación',
  })

  editor.BlockManager.get('form')?.set({
    category: 'Formularios',
    label: 'Formulario de contacto',
    content: `<form style="display:grid;gap:14px;max-width:560px;padding:28px;color:#243d39;background:#fff;border:1px solid #d8e3e1;border-radius:16px;box-shadow:0 12px 30px rgba(20,55,52,.08)">
      <h2 style="margin:0">Contáctanos</h2><p style="margin:0 0 8px;color:#627773">Completa el formulario y te responderemos pronto.</p>
      <label style="display:grid;gap:6px;font-weight:700">Nombre<input name="name" placeholder="Tu nombre" style="min-height:44px;padding:0 12px;border:1px solid #b9cbc7;border-radius:8px"></label>
      <label style="display:grid;gap:6px;font-weight:700">Correo<input name="email" type="email" placeholder="nombre@ejemplo.com" style="min-height:44px;padding:0 12px;border:1px solid #b9cbc7;border-radius:8px"></label>
      <label style="display:grid;gap:6px;font-weight:700">Mensaje<textarea name="message" placeholder="¿Cómo podemos ayudarte?" style="min-height:120px;padding:12px;border:1px solid #b9cbc7;border-radius:8px"></textarea></label>
      <button type="submit" style="min-height:44px;color:#fff;background:#6f52dc;border:0;border-radius:8px;font-weight:800">Enviar mensaje</button>
    </form>`,
  })
  editor.BlockManager.get('input')?.set({ category: 'Formularios', label: 'Campo de texto', content: starterFormBlocks.input })
  editor.BlockManager.get('textarea')?.set({ category: 'Formularios', label: 'Área de texto', content: starterFormBlocks.textarea })
  editor.BlockManager.get('select')?.set({ category: 'Formularios', label: 'Lista de opciones', content: starterFormBlocks.select })
  editor.BlockManager.get('button')?.set({
    category: 'Formularios',
    label: 'Botón',
    content: {
      type: 'button',
      text: 'Continuar',
      style: {
        'min-height': '44px',
        padding: '0 18px',
        color: '#fff',
        background: '#6f52dc',
        border: '0',
        'border-radius': '8px',
        'font-weight': '800',
        cursor: 'pointer',
      },
    },
  })
  editor.BlockManager.get('label')?.set({ category: 'Formularios', label: 'Etiqueta y campo', content: starterFormBlocks.label })
  editor.BlockManager.get('checkbox')?.set({ category: 'Formularios', label: 'Casilla', content: starterFormBlocks.checkbox })
  editor.BlockManager.get('radio')?.set({ category: 'Formularios', label: 'Grupo de opciones', content: starterFormBlocks.radio })
}
