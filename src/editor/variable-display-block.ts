import type { Component, Editor, Plugin } from 'grapesjs'
import { appendGridItem } from './grid-layout'
import {
  JS_LAB_ATTRIBUTE,
  readJsLabCode,
} from './external-function-blocks'
import {
  PYTHON_LAB_ATTRIBUTE,
  readPythonLabCode,
} from './python-lab-blocks'
import {
  RUNTIME_OUTPUT_ID_ATTRIBUTE,
  RUNTIME_OUTPUT_NAME_ATTRIBUTE,
  RUNTIME_SOURCE_ID_ATTRIBUTE,
  RUNTIME_SOURCE_NAME_ATTRIBUTE,
  runtimeValueKey,
} from '../runtime/values/runtime-value-contract'

export const VARIABLE_DISPLAY_ATTRIBUTE = 'data-builder-variable-display'
export const VARIABLE_DISPLAY_BLOCK_ID = 'builder-variable-display'
export const VARIABLE_DISPLAY_COMPONENT_TYPE = 'builder-variable-display'
export const VARIABLE_DISPLAY_BINDING_ATTRIBUTE = 'data-builder-variable-binding'
export const VARIABLE_DISPLAY_LABEL_ATTRIBUTE = 'data-builder-variable-label'
export const VARIABLE_DISPLAY_FORMAT_ATTRIBUTE = 'data-builder-variable-format'
export const VARIABLE_DISPLAY_MAX_ATTRIBUTE = 'data-builder-variable-max'

interface VariableBinding {
  key: string
  path: string[]
}

export function variableBindingValue(key: string, path: string[] = []) {
  return JSON.stringify({ key, path } satisfies VariableBinding)
}

function pythonDeclaredVariableNames(code: string) {
  const names = new Set<string>()
  code.split(/\r?\n/).forEach((line) => {
    if (!line || /^\s/.test(line)) return
    const match = line.match(/^([A-Za-z_]\w*)\s*(?::[^=]+)?=(?!=)/)
    const name = match?.[1]
    if (name && !name.startsWith('_') && name !== 'runtime_values') names.add(name)
  })
  return [...names]
}

function javascriptTopLevelVariableNames(code: string) {
  const names = new Set<string>()
  code.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*(?==|;|,|$)/)
    if (match?.[1]) names.add(match[1])
  })
  return [...names]
}

function visit(component: Component, callback: (candidate: Component) => void) {
  callback(component)
  component.components().models.forEach((child) => visit(child, callback))
}

function isVariableDisplay(component: Component) {
  return Object.prototype.hasOwnProperty.call(component.getAttributes(), VARIABLE_DISPLAY_ATTRIBUTE)
}

function variableDisplayAncestor(component: Component) {
  let candidate: Component | null = component
  while (candidate && !isVariableDisplay(candidate)) candidate = candidate.parent() ?? null
  return candidate
}

function lockVariableDisplayContents(component: Component) {
  if (!isVariableDisplay(component)) return
  component.set({ hoverable: true, layerable: true, selectable: true })
  visit(component, (candidate) => {
    if (candidate === component) return
    candidate.set({
      copyable: false,
      draggable: false,
      editable: false,
      hoverable: false,
      layerable: false,
      removable: false,
      selectable: false,
    })
    candidate.addStyle({ 'pointer-events': 'none' })
  })
}

export function variableDisplayOptions(editor: Editor) {
  const page = editor.Pages.getSelected()
  if (!page) return []
  const options: Array<{ id: string; name: string }> = []
  visit(page.getMainComponent(), (component) => {
    const attributes = component.getAttributes()
    const sourceId = String(attributes[RUNTIME_SOURCE_ID_ATTRIBUTE] ?? '').trim()
    const outputId = String(attributes[RUNTIME_OUTPUT_ID_ATTRIBUTE] ?? '').trim()
    if (!sourceId || !outputId) return
    const key = runtimeValueKey(sourceId, outputId)
    const sourceName = String(attributes[RUNTIME_SOURCE_NAME_ATTRIBUTE] || sourceId)
    const outputName = String(attributes[RUNTIME_OUTPUT_NAME_ATTRIBUTE] || outputId)
    options.push({ id: variableBindingValue(key), name: `${sourceName} · ${outputName}` })
    const code = Object.prototype.hasOwnProperty.call(attributes, JS_LAB_ATTRIBUTE)
      ? readJsLabCode(component)
      : Object.prototype.hasOwnProperty.call(attributes, PYTHON_LAB_ATTRIBUTE)
        ? readPythonLabCode(component)
        : ''
    const variables = Object.prototype.hasOwnProperty.call(attributes, JS_LAB_ATTRIBUTE)
      ? javascriptTopLevelVariableNames(code)
      : Object.prototype.hasOwnProperty.call(attributes, PYTHON_LAB_ATTRIBUTE)
        ? pythonDeclaredVariableNames(code)
        : []
    variables.forEach((name) => options.push({
      id: variableBindingValue(key, [name]),
      name: `${sourceName} · ${name}`,
    }))
  })
  return options
}

export function variableDisplayMarkup() {
  return `<article ${VARIABLE_DISPLAY_ATTRIBUTE} ${VARIABLE_DISPLAY_BINDING_ATTRIBUTE}="" ${VARIABLE_DISPLAY_LABEL_ATTRIBUTE}="Variable" ${VARIABLE_DISPLAY_FORMAT_ATTRIBUTE}="auto" ${VARIABLE_DISPLAY_MAX_ATTRIBUTE}="1" data-gjs-name="Tarjeta de variable" style="display:grid;gap:.65rem;width:100%;padding:1.2rem;box-sizing:border-box;color:#173f45;background:#fff;border:1px solid #d7e2df;border-radius:1rem;box-shadow:0 .6rem 1.5rem rgba(23,63,69,.08)">
    <span data-builder-variable-display-label style="color:#607772;font:700 .78rem/1.3 Inter,ui-sans-serif,system-ui,sans-serif">Variable</span>
    <strong data-builder-variable-display-value style="min-width:0;color:#173f45;font:800 clamp(1.4rem,4vw,2.2rem)/1.15 Inter,ui-sans-serif,system-ui,sans-serif;overflow-wrap:anywhere">Selecciona una variable</strong>
    <progress data-builder-variable-display-progress hidden value="0" max="1" style="width:100%;height:.7rem;accent-color:#16847d"></progress>
    <small data-builder-variable-display-status aria-live="polite" style="color:#78908b;font:500 .72rem/1.4 Inter,ui-sans-serif,system-ui,sans-serif">Configura esta tarjeta en Propiedades.</small>
  </article>`
}

function updateEditorPreview(component: Component) {
  const attributes = component.getAttributes()
  if (!Object.prototype.hasOwnProperty.call(attributes, VARIABLE_DISPLAY_ATTRIBUTE)) return
  const element = component.getEl() as HTMLElement | undefined
  const label = String(attributes[VARIABLE_DISPLAY_LABEL_ATTRIBUTE] || 'Variable')
  const labelElement = element?.querySelector<HTMLElement>('[data-builder-variable-display-label]')
  if (labelElement) labelElement.textContent = label
  const valueElement = element?.querySelector<HTMLElement>('[data-builder-variable-display-value]')
  if (valueElement) valueElement.textContent = attributes[VARIABLE_DISPLAY_BINDING_ATTRIBUTE]
    ? 'Esperando datos…'
    : 'Selecciona una variable'
}

export function createVariableDisplayPlugin(): Plugin {
  return (editor) => {
    editor.DomComponents.addType(VARIABLE_DISPLAY_COMPONENT_TYPE, {
      isComponent: (element) => element.hasAttribute?.(VARIABLE_DISPLAY_ATTRIBUTE),
      model: {
        defaults: {
          copyable: true,
          droppable: false,
          hoverable: true,
          layerable: true,
          name: 'Tarjeta de variable',
          selectable: true,
          traits: [],
        },
      },
    })
    const refreshTraits = (component: Component) => {
      const card = variableDisplayAncestor(component)
      if (!card) return
      lockVariableDisplayContents(card)
      if (card !== component) return
      const options = [
        { id: '', name: 'Selecciona una variable' },
        ...variableDisplayOptions(editor),
      ]
      card.removeTrait(card.getTraits().map((trait) => trait.getName()))
      card.addTrait([
        { type: 'text', name: VARIABLE_DISPLAY_LABEL_ATTRIBUTE, label: 'Etiqueta' },
        { type: 'select', name: VARIABLE_DISPLAY_BINDING_ATTRIBUTE, label: 'Variable', options },
        {
          type: 'select',
          name: VARIABLE_DISPLAY_FORMAT_ATTRIBUTE,
          label: 'Mostrar como',
          options: [
            { id: 'auto', name: 'Automático' },
            { id: 'number', name: 'Número' },
            { id: 'json', name: 'JSON' },
            { id: 'progress', name: 'Progreso' },
          ],
        },
        { type: 'number', name: VARIABLE_DISPLAY_MAX_ATTRIBUTE, label: 'Máximo del progreso' },
      ])
      updateEditorPreview(card)
    }
    editor.on('component:selected', refreshTraits)
    editor.on('component:add', (component: Component) => {
      const card = variableDisplayAncestor(component)
      if (card) lockVariableDisplayContents(card)
    })
    const lockExistingCards = () => editor.Pages.getAll().forEach((page) => {
      visit(page.getMainComponent(), lockVariableDisplayContents)
    })
    editor.on('project:load', lockExistingCards)
    editor.on('storage:end:load', lockExistingCards)
    editor.on('component:update:attributes', updateEditorPreview)
    editor.BlockManager.add(VARIABLE_DISPLAY_BLOCK_ID, {
      label: 'Tarjeta de variable',
      category: 'Código',
      attributes: { title: 'Muestra una variable publicada por Analizar, Python Lab o JS Lab.' },
      content: variableDisplayMarkup(),
    })
  }
}

export function addVariableDisplay(editor: Editor) {
  const component = appendGridItem(editor, variableDisplayMarkup())
  if (!component) throw new Error('No se pudo añadir la tarjeta de variable.')
  editor.select(component)
  return component
}
