import type { Component, Editor, Plugin } from 'grapesjs'
import type { ExternalFunctionMetadata } from '../runtime/functions/external-function-registry'
import type { RegisteredExternalFunctionLibrary } from '../runtime/functions/external-library-registry'
import { appendGridItem } from './grid-layout'
import {
  externalFunctionJavascriptName,
  javascriptIdentifier,
} from '../runtime/functions/js-lab-runtime'
import {
  EXTERNAL_FUNCTION_ATTRIBUTE,
  EXTERNAL_FUNCTION_INPUT_ATTRIBUTE,
  EXTERNAL_FUNCTION_OUTPUT_ATTRIBUTE,
  EXTERNAL_FUNCTION_STATUS_ATTRIBUTE,
} from '../runtime/functions/function-block-runtime'
import {
  FUNCTION_RESULT_OUTPUT_ID,
  FUNCTION_INPUT_SOURCE_ATTRIBUTE_PREFIX,
  RUNTIME_OUTPUT_ID_ATTRIBUTE,
  RUNTIME_OUTPUT_NAME_ATTRIBUTE,
  RUNTIME_OUTPUT_TYPE_ATTRIBUTE,
  RUNTIME_SOURCE_ID_ATTRIBUTE,
  RUNTIME_SOURCE_NAME_ATTRIBUTE,
  runtimeValueKey,
} from '../runtime/values/runtime-value-contract'

export const EXTERNAL_FUNCTION_COMPONENT_TYPE = 'builder-external-function'
export const JS_LAB_COMPONENT_TYPE = 'builder-js-lab'
export const JS_LAB_BLOCK_ID = 'builder-js-lab'
export const JS_LAB_ATTRIBUTE = 'data-builder-js-lab'
export const JS_LAB_FUNCTIONS_ATTRIBUTE = 'data-builder-js-lab-functions'
export const JS_LAB_PUBLIC_ATTRIBUTE = 'data-builder-js-lab-public'
export const JS_LAB_CODE_ATTRIBUTE = 'data-builder-js-lab-code'
export const JS_LAB_CODE_EDITOR_ATTRIBUTE = 'data-builder-js-lab-code-editor'
export const JS_LAB_OUTPUT_EXPRESSION_ATTRIBUTE = 'data-builder-js-lab-output-expression'
export const JS_LAB_OUTPUT_TYPE_ATTRIBUTE = 'data-builder-js-lab-output-type'
export const JS_LAB_RUN_ATTRIBUTE = 'data-builder-js-lab-run'
export const JS_LAB_RESULT_ATTRIBUTE = 'data-builder-js-lab-result'
export const JS_LAB_STATUS_ATTRIBUTE = 'data-builder-js-lab-status'
export const JS_LAB_VARIABLE_ROWS_ATTRIBUTE = 'data-builder-js-lab-variable-rows'
export const JS_LAB_VARIABLES_OUTPUT_ID = 'variables'
export const EXTERNAL_FUNCTION_JSON_INPUTS_ATTRIBUTE = 'data-builder-function-json-inputs'
export const EXTERNAL_FUNCTION_SOURCE_INPUTS_ATTRIBUTE = 'data-builder-function-source-inputs'
export const DEFAULT_JS_LAB_CODE = '// Usa funciones de Librerías y publica una variable.\nlet result = 0;'

function escapeMarkup(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function externalFunctionBlockMarkup(
  library: Pick<RegisteredExternalFunctionLibrary, 'id' | 'name'>,
  metadata: ExternalFunctionMetadata,
) {
  const shell = 'display:grid;gap:.8rem;width:100%;padding:1rem;box-sizing:border-box;color:#e8edf2;background:#171c23;border:1px solid #33404d;border-radius:.7rem;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;box-shadow:0 8px 22px rgba(0,0,0,.18)'
  const inputs = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(7rem,1fr));gap:.75rem'
  const field = 'display:grid;gap:.3rem;color:#aebdca;font-size:.74rem;font-weight:700'
  const control = 'min-height:2.65rem;box-sizing:border-box;padding:.45rem .65rem;color:#e8edf2;background:#0f1318;border:1px solid #43515e;border-radius:.45rem;font:inherit'
  const inputMarkup = metadata.inputs.map((input) => {
    const label = escapeMarkup(input.name)
    if (input.type === 'number') {
      return `<label style="${field}">${label}<input ${EXTERNAL_FUNCTION_INPUT_ATTRIBUTE}="${label}" data-builder-function-value-type="number" type="number"${input.defaultValue === undefined ? '' : ` value="${input.defaultValue}"`} style="${control}"></label>`
    }
    if (input.type === 'json') {
      return `<div style="${field}">${label}<div ${EXTERNAL_FUNCTION_INPUT_ATTRIBUTE}="${label}" data-builder-function-value-type="json" style="${control};display:flex;align-items:center;color:#86b9ad">Selecciona una fuente en Propiedades</div></div>`
    }
    const value = JSON.stringify(input.defaultValue ?? [])
    return `<label style="${field}">${label}<textarea ${EXTERNAL_FUNCTION_INPUT_ATTRIBUTE}="${label}" data-builder-function-value-type="${input.type}" rows="4" spellcheck="false" style="${control};min-height:5.5rem;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeMarkup(value)}</textarea></label>`
  }).join('')
  const jsonInputNames = metadata.inputs.filter((input) => input.type === 'json').map((input) => input.name)
  const sourceInputs = metadata.inputs.map((input) => `${input.name}:${input.type}`).join(',')
  return `<form ${EXTERNAL_FUNCTION_ATTRIBUTE}="${escapeMarkup(metadata.id)}" data-builder-function-library-id="${escapeMarkup(library.id)}" data-builder-js-lab-step${jsonInputNames.length ? ` ${EXTERNAL_FUNCTION_JSON_INPUTS_ATTRIBUTE}="${escapeMarkup(jsonInputNames.join(','))}"` : ''} ${EXTERNAL_FUNCTION_SOURCE_INPUTS_ATTRIBUTE}="${escapeMarkup(sourceInputs)}" ${RUNTIME_SOURCE_NAME_ATTRIBUTE}="${escapeMarkup(`${library.name} · ${metadata.name}`)}" ${RUNTIME_OUTPUT_ID_ATTRIBUTE}="${FUNCTION_RESULT_OUTPUT_ID}" ${RUNTIME_OUTPUT_NAME_ATTRIBUTE}="Result" ${RUNTIME_OUTPUT_TYPE_ATTRIBUTE}="${metadata.output.type}" data-gjs-name="${escapeMarkup(`${library.name} · ${metadata.name}`)}" style="${shell}">
    <header style="display:grid;gap:.3rem">
      <strong style="color:#fff;font:750 1rem/1.3 Inter,ui-sans-serif,system-ui,sans-serif">${escapeMarkup(metadata.name)}</strong>
      <code style="color:#9ed8ca;font-size:.72rem">ƒ ${escapeMarkup(metadata.id)}(${metadata.inputs.map((input) => escapeMarkup(input.name)).join(', ')}) → ${escapeMarkup(metadata.output.type)}</code>
      <span style="color:#81909d;font:600 .7rem/1.3 Inter,ui-sans-serif,system-ui,sans-serif">${escapeMarkup(library.name)}</span>
    </header>
    <div style="${inputs}">${inputMarkup}</div>
    <button type="submit" style="min-height:2.65rem;padding:0 1rem;color:#0b1513;background:#7dd3c2;border:0;border-radius:.45rem;font:750 .78rem Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer">Ejecutar →</button>
    <label style="${field}">Resultado<output ${EXTERNAL_FUNCTION_OUTPUT_ATTRIBUTE} style="${control};display:flex;align-items:center;white-space:pre-wrap;overflow-wrap:anywhere">—</output></label>
    <p ${EXTERNAL_FUNCTION_STATUS_ATTRIBUTE} aria-live="polite" style="min-height:1.2rem;margin:0;color:#86b9ad;font-size:.72rem"></p>
  </form>`
}

export function jsLabMarkup() {
  const shell = 'display:grid;gap:1rem;width:100%;padding:1rem;box-sizing:border-box;color:#e8edf2;background:#0d1117;border:1px solid #2f3a45;border-radius:.9rem;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;box-shadow:0 14px 34px rgba(0,0,0,.24)'
  return `<section ${JS_LAB_ATTRIBUTE} ${JS_LAB_PUBLIC_ATTRIBUTE}="true" ${JS_LAB_CODE_ATTRIBUTE}="${escapeMarkup(DEFAULT_JS_LAB_CODE)}" ${RUNTIME_SOURCE_NAME_ATTRIBUTE}="JS Lab" ${RUNTIME_OUTPUT_ID_ATTRIBUTE}="${JS_LAB_VARIABLES_OUTPUT_ID}" ${RUNTIME_OUTPUT_NAME_ATTRIBUTE}="Variables" ${RUNTIME_OUTPUT_TYPE_ATTRIBUTE}="json" data-gjs-name="JS Lab" style="${shell}">
    <header style="display:grid;gap:.3rem;padding-bottom:.8rem;border-bottom:1px solid #2f3a45">
      <strong style="color:#9ed8ca;font-size:1rem">&lt;/&gt; JS Lab</strong>
      <span style="color:#81909d;font:500 .74rem/1.4 Inter,ui-sans-serif,system-ui,sans-serif">Conecta, ejecuta e inspecciona operaciones JavaScript reutilizables.</span>
    </header>
    <label style="display:grid;gap:.4rem;color:#aebdca;font-size:.72rem;font-weight:700">Código JavaScript
      <textarea ${JS_LAB_CODE_EDITOR_ATTRIBUTE} rows="10" spellcheck="false" style="width:100%;min-height:14rem;box-sizing:border-box;padding:.85rem;color:#e8edf2;background:#080b10;border:1px solid #3a4754;border-radius:.55rem;resize:vertical;font:500 .78rem/1.6 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace">${escapeMarkup(DEFAULT_JS_LAB_CODE)}</textarea>
    </label>
    <p style="margin:0;color:#86b9ad;font:600 .72rem/1.45 Inter,ui-sans-serif,system-ui,sans-serif">Todas las variables declaradas con let, const o var se publican juntas como JSON.</p>
    <div style="display:flex;gap:.65rem;align-items:center">
      <button ${JS_LAB_RUN_ATTRIBUTE} type="button" style="min-height:2.65rem;flex:1;padding:0 1rem;color:#0b1513;background:#7dd3c2;border:0;border-radius:.45rem;font:750 .78rem Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer">Ejecutar JS Lab →</button>
      <details data-builder-js-lab-variables style="position:relative">
        <summary title="Ver variables" aria-label="Ver variables" style="display:grid;place-items:center;width:2.65rem;height:2.65rem;box-sizing:border-box;color:#9ed8ca;background:#111923;border:1px solid #43515e;border-radius:.45rem;cursor:pointer;list-style:none;font:800 1rem Inter,ui-sans-serif,system-ui,sans-serif">▦</summary>
        <div style="position:absolute;z-index:5;right:0;top:calc(100% + .45rem);width:min(42rem,80vw);max-height:24rem;overflow:auto;padding:.8rem;background:#0d1117;border:1px solid #43515e;border-radius:.6rem;box-shadow:0 16px 40px rgba(0,0,0,.4)">
          <strong style="display:block;margin-bottom:.6rem;color:#fff;font:750 .8rem Inter,ui-sans-serif,system-ui,sans-serif">Variables</strong>
          <table style="width:100%;border-collapse:collapse;color:#c9d4dc;font:500 .7rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace">
            <thead><tr><th style="padding:.4rem;text-align:left;border-bottom:1px solid #33404d">Nombre</th><th style="padding:.4rem;text-align:left;border-bottom:1px solid #33404d">Tipo</th><th style="padding:.4rem;text-align:left;border-bottom:1px solid #33404d">Valor / estado</th></tr></thead>
            <tbody ${JS_LAB_VARIABLE_ROWS_ATTRIBUTE}><tr><td colspan="3" style="padding:.65rem .4rem;color:#81909d">Ejecuta o analiza datos para ver variables.</td></tr></tbody>
          </table>
        </div>
      </details>
    </div>
    <output ${JS_LAB_RESULT_ATTRIBUTE} hidden>—</output>
    <p ${JS_LAB_STATUS_ATTRIBUTE} aria-live="polite" style="min-height:1.2rem;margin:0;color:#86b9ad;font-size:.72rem"></p>
    <div ${JS_LAB_FUNCTIONS_ATTRIBUTE} hidden></div>
  </section>`
}

export function externalFunctionCodeName(functionId: string) {
  return externalFunctionJavascriptName(functionId)
}

export interface JsLabRuntimeSourceOption {
  alias: string
  key: string
  name: string
  type: string
}

function availableResultVariable(code: string, base: string) {
  let candidate = `${base}Result`
  let suffix = 2
  while (new RegExp(`\\b(?:let|const|var)\\s+${candidate}\\b`).test(code)) {
    candidate = `${base}Result${suffix}`
    suffix += 1
  }
  return candidate
}

export function externalFunctionCallStatement(
  metadata: ExternalFunctionMetadata,
  code: string,
  runtimeSources: JsLabRuntimeSourceOption[] = [],
) {
  const functionName = externalFunctionCodeName(metadata.id)
  const variable = availableResultVariable(code, functionName)
  const argumentsSource = metadata.inputs.map((input) => {
    if (input.defaultValue !== undefined) return JSON.stringify(input.defaultValue)
    const runtimeSource = runtimeSources.find((source) => source.type === input.type)
    if (runtimeSource) return `runtimeValues.${runtimeSource.alias}`
    return input.type === 'number' ? '0' : input.type === 'json' ? 'undefined' : '[]'
  }).join(', ')
  return {
    functionName,
    statement: `let ${variable} = ${functionName}(${argumentsSource});`,
    variable,
  }
}

export function readJsLabCode(component: Component) {
  return String(component.getAttributes()[JS_LAB_CODE_ATTRIBUTE] ?? DEFAULT_JS_LAB_CODE)
}

export function readJsLabSettings(component: Component) {
  const attributes = component.getAttributes()
  return {
    code: readJsLabCode(component),
    outputExpression: String(attributes[JS_LAB_OUTPUT_EXPRESSION_ATTRIBUTE] ?? 'result'),
    outputType: String(attributes[JS_LAB_OUTPUT_TYPE_ATTRIBUTE] ?? 'number'),
  }
}

export function updateJsLabScript(component: Component, options: {
  code?: string
  outputExpression?: string
  outputType?: string
}) {
  const attributes: Record<string, string> = {}
  if (options.code !== undefined) attributes[JS_LAB_CODE_ATTRIBUTE] = options.code
  if (options.outputExpression !== undefined) {
    attributes[JS_LAB_OUTPUT_EXPRESSION_ATTRIBUTE] = options.outputExpression
  }
  if (options.outputType !== undefined) {
    attributes[JS_LAB_OUTPUT_TYPE_ATTRIBUTE] = options.outputType
    attributes[RUNTIME_OUTPUT_TYPE_ATTRIBUTE] = options.outputType
  }
  // JS Lab text changes are persisted by the editor's debounced save queue.
  // Keep GrapesJS autosave from starting one overlapping request per keystroke.
  component.addAttributes(attributes, { silent: true })
  if (options.code !== undefined) {
    const editorComponent = visitComponents(component, (candidate) => (
      Object.prototype.hasOwnProperty.call(candidate.getAttributes(), JS_LAB_CODE_EDITOR_ATTRIBUTE)
    ))
    editorComponent?.components(escapeMarkup(options.code), { silent: true })
  }
  const element = component.getEl() as HTMLElement | undefined
  Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value))
  if (options.code !== undefined) {
    const editor = element?.querySelector<HTMLTextAreaElement>(`[${JS_LAB_CODE_EDITOR_ATTRIBUTE}]`)
    if (editor) editor.value = options.code
  }
  if (options.outputExpression !== undefined) {
    const control = element?.querySelector<HTMLInputElement>('[data-builder-js-lab-output-expression-control]')
    if (control) control.value = options.outputExpression
  }
  if (options.outputType !== undefined) {
    const control = element?.querySelector<HTMLSelectElement>('[data-builder-js-lab-output-type-control]')
    if (control) control.value = options.outputType
  }
}

function visitComponents(
  component: Component,
  visit: (candidate: Component) => boolean | void,
): Component | undefined {
  if (visit(component)) return component
  for (const child of component.components().models) {
    const found = visitComponents(child, visit)
    if (found) return found
  }
  return undefined
}

export function findJsLab(editor: Editor) {
  const root = editor.Pages.getSelected()?.getMainComponent() ?? editor.getWrapper()
  if (!root) return undefined
  return visitComponents(root, (component) => (
    Object.prototype.hasOwnProperty.call(component.getAttributes(), JS_LAB_ATTRIBUTE)
  ))
}

export function jsLabRuntimeSourceOptions(editor: Editor): JsLabRuntimeSourceOption[] {
  const root = editor.Pages.getSelected()?.getMainComponent() ?? editor.getWrapper()
  if (!root) return []
  const candidates: Component[] = []
  const collect = (component: Component) => {
    const attributes = component.getAttributes()
    if (attributes[RUNTIME_SOURCE_ID_ATTRIBUTE]
      && attributes[RUNTIME_OUTPUT_ID_ATTRIBUTE]
      && !Object.prototype.hasOwnProperty.call(attributes, JS_LAB_ATTRIBUTE)) {
      candidates.push(component)
    }
    component.components().models.forEach(collect)
  }
  collect(root)
  const aliases = new Set<string>()
  return candidates.map((component) => {
    const attributes = component.getAttributes()
    const name = String(attributes[RUNTIME_SOURCE_NAME_ATTRIBUTE]
      || attributes[RUNTIME_OUTPUT_NAME_ATTRIBUTE]
      || attributes[RUNTIME_OUTPUT_ID_ATTRIBUTE])
    const baseAlias = javascriptIdentifier(name, 'runtimeValue')
    let alias = baseAlias
    let suffix = 2
    while (aliases.has(alias)) {
      alias = `${baseAlias}${suffix}`
      suffix += 1
    }
    aliases.add(alias)
    return {
      alias,
      key: runtimeValueKey(
        String(attributes[RUNTIME_SOURCE_ID_ATTRIBUTE]),
        String(attributes[RUNTIME_OUTPUT_ID_ATTRIBUTE]),
      ),
      name,
      type: String(attributes[RUNTIME_OUTPUT_TYPE_ATTRIBUTE]),
    }
  })
}

function upgradeJsLabComponent(existing: Component) {
  const hasCodeEditor = Boolean(visitComponents(existing, (component) => (
    Object.prototype.hasOwnProperty.call(component.getAttributes(), JS_LAB_CODE_EDITOR_ATTRIBUTE)
  )))
  const hasLegacyOutputControls = Boolean(visitComponents(existing, (component) => {
    const attributes = component.getAttributes()
    return Object.prototype.hasOwnProperty.call(attributes, 'data-builder-js-lab-output-expression-control')
      || Object.prototype.hasOwnProperty.call(attributes, 'data-builder-js-lab-output-type-control')
  }))
  if (hasCodeEditor && !hasLegacyOutputControls) {
    existing.addAttributes({
      [RUNTIME_OUTPUT_ID_ATTRIBUTE]: JS_LAB_VARIABLES_OUTPUT_ID,
      [RUNTIME_OUTPUT_NAME_ATTRIBUTE]: 'Variables',
      [RUNTIME_OUTPUT_TYPE_ATTRIBUTE]: 'json',
    })
    return { component: existing, replaced: false }
  }
  const parent = existing.parent()
  if (!parent) throw new Error('El JS Lab anterior no se puede actualizar en esta página.')
  const index = parent.components().models.indexOf(existing)
  const previousAttributes = existing.getAttributes()
  const previousCode = readJsLabCode(existing)
  existing.remove()
  const replacement = parent.append(jsLabMarkup(), { at: Math.max(0, index) })[0]
  if (!replacement) throw new Error('No se pudo actualizar JS Lab al editor de código.')
  updateJsLabScript(replacement, { code: previousCode })
  replacement.addAttributes({
    [JS_LAB_PUBLIC_ATTRIBUTE]: String(previousAttributes[JS_LAB_PUBLIC_ATTRIBUTE] !== 'false'),
    ...(previousAttributes[RUNTIME_SOURCE_ID_ATTRIBUTE]
      ? { [RUNTIME_SOURCE_ID_ATTRIBUTE]: String(previousAttributes[RUNTIME_SOURCE_ID_ATTRIBUTE]) }
      : {}),
  })
  return { component: replacement, replaced: true }
}

export function ensureJsLab(editor: Editor) {
  const existing = findJsLab(editor)
  if (existing) {
    const upgraded = upgradeJsLabComponent(existing)
    return { component: upgraded.component, created: upgraded.replaced }
  }
  const component = appendGridItem(editor, jsLabMarkup())
  if (!component) throw new Error('No se pudo crear JS Lab en la página actual.')
  return { component, created: true }
}

export function addExternalFunctionToJsLab(
  editor: Editor,
  library: RegisteredExternalFunctionLibrary,
  metadata: ExternalFunctionMetadata,
) {
  const lab = ensureJsLab(editor)
  const slot = visitComponents(lab.component, (component) => (
    Object.prototype.hasOwnProperty.call(component.getAttributes(), JS_LAB_FUNCTIONS_ATTRIBUTE)
  ))
  if (!slot) throw new Error('JS Lab no tiene un contenedor de operaciones válido.')
  const functionComponent = slot.append(externalFunctionBlockMarkup(library, metadata))[0]
  if (!functionComponent) throw new Error('No se pudo añadir la operación a JS Lab.')
  return { createdLab: lab.created, functionComponent, lab: lab.component }
}

export function createExternalFunctionBlocksPlugin(): Plugin {
  return (editor: Editor) => {
    editor.DomComponents.addType(JS_LAB_COMPONENT_TYPE, {
      isComponent: (element) => element.hasAttribute?.(JS_LAB_ATTRIBUTE),
      model: {
        defaults: {
          copyable: false,
          droppable: false,
          name: 'JS Lab',
          traits: [{
            type: 'select',
            name: JS_LAB_PUBLIC_ATTRIBUTE,
            label: 'Visible en la página',
            options: [
              { id: 'true', name: 'Visible' },
              { id: 'false', name: 'Solo editor · sin ejecución manual' },
            ],
          }],
        },
      },
    })
    editor.DomComponents.addType(EXTERNAL_FUNCTION_COMPONENT_TYPE, {
      isComponent: (element) => element.hasAttribute?.(EXTERNAL_FUNCTION_ATTRIBUTE),
      model: { defaults: { name: 'External Function', traits: [] } },
    })
    const normalizeFunctionSourceIds = () => {
      if (!editor.Pages) return
      const usedSourceIds = new Set<string>()
      const generatedSourceComponents: import('grapesjs').Component[] = []
      editor.Pages.getAll().forEach((page) => {
        const visit = (candidate: import('grapesjs').Component) => {
          const attributes = candidate.getAttributes()
          if (attributes[EXTERNAL_FUNCTION_ATTRIBUTE]
            || Object.prototype.hasOwnProperty.call(attributes, JS_LAB_ATTRIBUTE)) {
            generatedSourceComponents.push(candidate)
          }
          else {
            const sourceId = String(attributes[RUNTIME_SOURCE_ID_ATTRIBUTE] ?? '').trim()
            if (sourceId) usedSourceIds.add(sourceId)
          }
          candidate.components().models.forEach(visit)
        }
        visit(page.getMainComponent())
      })
      generatedSourceComponents.forEach((component) => {
        let sourceId = String(component.getAttributes()[RUNTIME_SOURCE_ID_ATTRIBUTE] ?? '').trim()
        if (!sourceId || usedSourceIds.has(sourceId)) {
          const base = Object.prototype.hasOwnProperty.call(component.getAttributes(), JS_LAB_ATTRIBUTE)
            ? `js-lab-source-${component.cid}`
            : `function-source-${component.cid}`
          sourceId = base
          let suffix = 2
          while (usedSourceIds.has(sourceId)) {
            sourceId = `${base}-${suffix}`
            suffix += 1
          }
          component.addAttributes({ [RUNTIME_SOURCE_ID_ATTRIBUTE]: sourceId })
        }
        usedSourceIds.add(sourceId)
      })
    }
    const upgradeExistingJsLabs = () => {
      if (!editor.Pages) return
      const labs: Component[] = []
      editor.Pages.getAll().forEach((page) => {
        visitComponents(page.getMainComponent(), (component) => {
          if (Object.prototype.hasOwnProperty.call(component.getAttributes(), JS_LAB_ATTRIBUTE)) {
            labs.push(component)
          }
          return false
        })
      })
      labs.forEach(upgradeJsLabComponent)
    }
    const refreshSourceTraits = (component: import('grapesjs').Component) => {
      if (!component.getAttributes()[EXTERNAL_FUNCTION_ATTRIBUTE]) return
      normalizeFunctionSourceIds()
      const producers: import('grapesjs').Component[] = []
      editor.Pages.getAll().forEach((page) => {
        const root = page.getMainComponent()
        const visit = (candidate: import('grapesjs').Component) => {
          if (candidate.getAttributes()[RUNTIME_SOURCE_ID_ATTRIBUTE]) producers.push(candidate)
          candidate.components().models.forEach(visit)
        }
        visit(root)
      })
      const sourceInputs = String(component.getAttributes()[EXTERNAL_FUNCTION_SOURCE_INPUTS_ATTRIBUTE] ?? '')
        .split(',').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
          const separator = entry.indexOf(':')
          return { name: entry.slice(0, separator), type: entry.slice(separator + 1) }
        }).filter((entry) => entry.name && entry.type)
      const traits = sourceInputs.map((input) => {
        const sourceOptions = [{
          id: '',
          name: input.type === 'json' ? 'Selecciona una fuente' : 'Entrada manual',
        }]
        producers.forEach((producer) => {
          if (producer === component) return
          const attributes = producer.getAttributes()
          const sourceId = String(attributes[RUNTIME_SOURCE_ID_ATTRIBUTE] ?? '').trim()
          const outputId = String(attributes[RUNTIME_OUTPUT_ID_ATTRIBUTE] ?? '').trim()
          const outputType = String(attributes[RUNTIME_OUTPUT_TYPE_ATTRIBUTE] ?? '').trim()
          if (!sourceId || !outputId || outputType !== input.type) return
          sourceOptions.push({
            id: runtimeValueKey(sourceId, outputId),
            name: `${attributes[RUNTIME_SOURCE_NAME_ATTRIBUTE] || sourceId} · ${attributes[RUNTIME_OUTPUT_NAME_ATTRIBUTE] || outputId}`,
          })
        })
        return {
          type: 'select',
          name: `${FUNCTION_INPUT_SOURCE_ATTRIBUTE_PREFIX}${input.name}`,
          label: `${input.name} · Fuente`,
          options: sourceOptions,
        }
      })
      component.removeTrait(component.getTraits().map((trait) => trait.getName()))
      component.addTrait(traits)
    }
    editor.on('component:selected', refreshSourceTraits)
    editor.on('component:add', normalizeFunctionSourceIds)
    editor.on('project:loaded', () => {
      upgradeExistingJsLabs()
      normalizeFunctionSourceIds()
    })
    editor.on('storage:end:load', () => {
      upgradeExistingJsLabs()
      normalizeFunctionSourceIds()
    })
    editor.BlockManager.add(JS_LAB_BLOCK_ID, {
      label: 'JS Lab',
      category: 'Código',
      attributes: {
        title: 'Agrupa las operaciones JavaScript reutilizables de esta página.',
      },
      content: jsLabMarkup(),
    })
  }
}
