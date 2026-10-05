import type { Component, Editor, Plugin } from 'grapesjs'
import type { RegisteredPythonLibrary } from '../python-libraries/types'
import { appendGridItem } from './grid-layout'
import {
  RUNTIME_OUTPUT_ID_ATTRIBUTE,
  RUNTIME_OUTPUT_NAME_ATTRIBUTE,
  RUNTIME_OUTPUT_TYPE_ATTRIBUTE,
  RUNTIME_SOURCE_ID_ATTRIBUTE,
  RUNTIME_SOURCE_NAME_ATTRIBUTE,
} from '../runtime/values/runtime-value-contract'

export const PYTHON_LAB_ATTRIBUTE = 'data-builder-python-lab'
export const PYTHON_LAB_BLOCK_ID = 'builder-python-lab'
export const PYTHON_LAB_COMPONENT_TYPE = 'builder-python-lab'
export const PYTHON_LAB_CODE_ATTRIBUTE = 'data-builder-python-lab-code'
export const PYTHON_LAB_CODE_EDITOR_ATTRIBUTE = 'data-builder-python-lab-code-editor'
export const PYTHON_LAB_PUBLIC_ATTRIBUTE = 'data-builder-python-lab-public'
export const PYTHON_LAB_RUN_ATTRIBUTE = 'data-builder-python-lab-run'
export const PYTHON_LAB_CANCEL_ATTRIBUTE = 'data-builder-python-lab-cancel'
export const PYTHON_LAB_STATUS_ATTRIBUTE = 'data-builder-python-lab-status'
export const PYTHON_LAB_VARIABLE_ROWS_ATTRIBUTE = 'data-builder-python-lab-variable-rows'
export const PYTHON_LAB_VARIABLES_OUTPUT_ID = 'variables'
export const PYTHON_LAB_ITEMS_ATTRIBUTE = 'data-builder-python-lab-items'
export const PYTHON_LAB_LIBRARIES_ATTRIBUTE = 'data-builder-python-lab-libraries'
export const DEFAULT_PYTHON_LAB_CODE = '# Escribe Python o importa un archivo .py.\nresult = 0'

export interface PythonLabCodeItem {
  description: string
  fileName?: string
  inputs: string
  name: string
  outputType: 'number' | 'number[]' | 'number[][]' | 'json'
  source: string
  usage?: string
}

function escapeMarkup(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function visit(component: Component, predicate: (candidate: Component) => boolean): Component | undefined {
  if (predicate(component)) return component
  for (const child of component.components().models) {
    const found = visit(child, predicate)
    if (found) return found
  }
  return undefined
}

export function pythonLabMarkup() {
  const shell = 'display:grid;gap:1rem;width:100%;padding:1rem;box-sizing:border-box;color:#e8edf2;background:#0d1117;border:1px solid #2f3a45;border-radius:.9rem;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;box-shadow:0 14px 34px rgba(0,0,0,.24)'
  return `<section ${PYTHON_LAB_ATTRIBUTE} ${PYTHON_LAB_PUBLIC_ATTRIBUTE}="true" ${PYTHON_LAB_CODE_ATTRIBUTE}="${escapeMarkup(DEFAULT_PYTHON_LAB_CODE)}" ${PYTHON_LAB_ITEMS_ATTRIBUTE}="[]" ${PYTHON_LAB_LIBRARIES_ATTRIBUTE}="[]" ${RUNTIME_SOURCE_NAME_ATTRIBUTE}="Python Lab" ${RUNTIME_OUTPUT_ID_ATTRIBUTE}="${PYTHON_LAB_VARIABLES_OUTPUT_ID}" ${RUNTIME_OUTPUT_NAME_ATTRIBUTE}="Variables" ${RUNTIME_OUTPUT_TYPE_ATTRIBUTE}="json" data-gjs-name="Python Lab" style="${shell}">
    <header style="display:grid;gap:.3rem;padding-bottom:.8rem;border-bottom:1px solid #2f3a45"><strong style="color:#9ed8ca;font-size:1rem">&gt;_ Python Lab</strong><span style="color:#81909d;font:500 .74rem/1.4 Inter,ui-sans-serif,system-ui,sans-serif">Ejecuta Python y NumPy localmente mediante Pyodide.</span></header>
    <label style="display:grid;gap:.4rem;color:#aebdca;font-size:.72rem;font-weight:700">Código Python<textarea ${PYTHON_LAB_CODE_EDITOR_ATTRIBUTE} rows="12" spellcheck="false" style="width:100%;min-height:16rem;box-sizing:border-box;padding:.85rem;color:#e8edf2;background:#080b10;border:1px solid #3a4754;border-radius:.55rem;resize:vertical;font:500 .78rem/1.6 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace">${escapeMarkup(DEFAULT_PYTHON_LAB_CODE)}</textarea></label>
    <p style="margin:0;color:#d7a95b;font:600 .72rem/1.45 Inter,ui-sans-serif,system-ui,sans-serif">Python importado es código ejecutable. El worker protege la interfaz, pero no convierte código no confiable en seguro.</p>
    <div style="display:flex;gap:.65rem;align-items:center"><button ${PYTHON_LAB_RUN_ATTRIBUTE} type="button" style="min-height:2.65rem;flex:1;padding:0 1rem;color:#0b1513;background:#7dd3c2;border:0;border-radius:.45rem;font:750 .78rem Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer">Ejecutar Python Lab →</button><button ${PYTHON_LAB_CANCEL_ATTRIBUTE} type="button" hidden style="min-height:2.65rem;padding:0 1rem;color:#e8edf2;background:#342027;border:1px solid #74404d;border-radius:.45rem">Cancelar</button><details style="position:relative"><summary title="Ver variables" aria-label="Ver variables" style="display:grid;place-items:center;width:2.65rem;height:2.65rem;box-sizing:border-box;color:#9ed8ca;background:#111923;border:1px solid #43515e;border-radius:.45rem;cursor:pointer;list-style:none;font-weight:800">▦</summary><div style="position:absolute;z-index:5;right:0;top:calc(100% + .45rem);width:min(42rem,80vw);max-height:24rem;overflow:auto;padding:.8rem;background:#0d1117;border:1px solid #43515e;border-radius:.6rem;box-shadow:0 16px 40px rgba(0,0,0,.4)"><strong style="display:block;margin-bottom:.6rem;color:#fff">Variables</strong><table style="width:100%;border-collapse:collapse;color:#c9d4dc;font:500 .7rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace"><thead><tr><th style="text-align:left">Nombre</th><th style="text-align:left">Tipo</th><th style="text-align:left">Valor / estado</th></tr></thead><tbody ${PYTHON_LAB_VARIABLE_ROWS_ATTRIBUTE}><tr><td colspan="3">Ejecuta o analiza datos para ver variables.</td></tr></tbody></table></div></details></div>
    <p ${PYTHON_LAB_STATUS_ATTRIBUTE} aria-live="polite" style="min-height:1.2rem;margin:0;color:#86b9ad;font-size:.72rem"></p>
  </section>`
}

export function findPythonLab(editor: Editor) {
  const root = editor.Pages.getSelected()?.getMainComponent() ?? editor.getWrapper()
  return root ? visit(root, (component) => Object.prototype.hasOwnProperty.call(component.getAttributes(), PYTHON_LAB_ATTRIBUTE)) : undefined
}

export function ensurePythonLab(editor: Editor) {
  const existing = findPythonLab(editor)
  if (existing) return { component: existing, created: false }
  const component = appendGridItem(editor, pythonLabMarkup())
  if (!component) throw new Error('No se pudo crear Python Lab en la página actual.')
  component.addAttributes({ [RUNTIME_SOURCE_ID_ATTRIBUTE]: `python-lab-source-${component.cid}` })
  return { component, created: true }
}

export function readPythonLabCode(component: Component) {
  return String(component.getAttributes()[PYTHON_LAB_CODE_ATTRIBUTE] ?? DEFAULT_PYTHON_LAB_CODE)
}

export function updatePythonLabCode(component: Component, code: string) {
  component.addAttributes({ [PYTHON_LAB_CODE_ATTRIBUTE]: code }, { silent: true })
  const editorComponent = visit(component, (candidate) => Object.prototype.hasOwnProperty.call(candidate.getAttributes(), PYTHON_LAB_CODE_EDITOR_ATTRIBUTE))
  editorComponent?.components(escapeMarkup(code), { silent: true })
  const element = component.getEl() as HTMLElement | undefined
  element?.setAttribute(PYTHON_LAB_CODE_ATTRIBUTE, code)
  const textarea = element?.querySelector<HTMLTextAreaElement>(`[${PYTHON_LAB_CODE_EDITOR_ATTRIBUTE}]`)
  if (textarea) textarea.value = code
}

export function appendPythonUsage(component: Component, usage: string) {
  const current = readPythonLabCode(component)
  const base = current === DEFAULT_PYTHON_LAB_CODE ? '' : current.trimEnd()
  updatePythonLabCode(component, `${base ? `${base}\n\n` : ''}${usage}`)
}

export function readPythonLabItems(component: Component): PythonLabCodeItem[] {
  try {
    const parsed = JSON.parse(String(component.getAttributes()[PYTHON_LAB_ITEMS_ATTRIBUTE] ?? '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function appendPythonCodeItem(component: Component, item: PythonLabCodeItem) {
  appendPythonUsage(component, item.usage ?? item.source)
  component.addAttributes({
    [PYTHON_LAB_ITEMS_ATTRIBUTE]: JSON.stringify([...readPythonLabItems(component), item]),
  }, { silent: true })
}

export function usePythonLibrary(component: Component, library: RegisteredPythonLibrary, functionId: string) {
  const metadata = library.functions.find((candidate) => candidate.id === functionId)
  if (!metadata) throw new Error('El ejemplo Python seleccionado ya no está disponible.')
  let current: RegisteredPythonLibrary[] = []
  try {
    const parsed = JSON.parse(String(component.getAttributes()[PYTHON_LAB_LIBRARIES_ATTRIBUTE] ?? '[]'))
    if (Array.isArray(parsed)) current = parsed
  } catch {
    current = []
  }
  if (!current.some((candidate) => candidate.id === library.id)) {
    component.addAttributes({
      [PYTHON_LAB_LIBRARIES_ATTRIBUTE]: JSON.stringify([...current, library]),
    }, { silent: true })
  }
  appendPythonUsage(component, metadata.usage)
}

export function createPythonLabPlugin(): Plugin {
  return (editor) => {
    editor.DomComponents.addType(PYTHON_LAB_COMPONENT_TYPE, {
      isComponent: (element) => element.hasAttribute?.(PYTHON_LAB_ATTRIBUTE),
      model: { defaults: { copyable: false, droppable: false, name: 'Python Lab', traits: [{ type: 'select', name: PYTHON_LAB_PUBLIC_ATTRIBUTE, label: 'Visible en la página', options: [{ id: 'true', name: 'Visible' }, { id: 'false', name: 'Solo editor' }] }] } },
    })
    const normalize = () => editor.Pages?.getAll().forEach((page) => {
      const root = page.getMainComponent()
      const lab = visit(root, (candidate) => Object.prototype.hasOwnProperty.call(candidate.getAttributes(), PYTHON_LAB_ATTRIBUTE))
      if (lab && !lab.getAttributes()[RUNTIME_SOURCE_ID_ATTRIBUTE]) lab.addAttributes({ [RUNTIME_SOURCE_ID_ATTRIBUTE]: `python-lab-source-${lab.cid}` })
    })
    editor.on('component:add', normalize)
    editor.on('project:loaded', normalize)
    editor.on('storage:end:load', normalize)
    editor.BlockManager.add(PYTHON_LAB_BLOCK_ID, {
      label: 'Python Lab',
      category: 'Código',
      attributes: {
        title: 'Ejecuta Python y NumPy localmente mediante Pyodide.',
      },
      content: pythonLabMarkup(),
    })
  }
}
