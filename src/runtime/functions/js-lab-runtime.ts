import {
  createExternalFunctionRegistry,
  type ExternalFunctionRegistration,
} from './external-function-registry'
import { installRuntimeValueStore } from '../values/runtime-value-store'
import {
  FUNCTION_RESULT_OUTPUT_ID,
  RUNTIME_OUTPUT_ID_ATTRIBUTE,
  RUNTIME_OUTPUT_NAME_ATTRIBUTE,
  RUNTIME_OUTPUT_TYPE_ATTRIBUTE,
  RUNTIME_SOURCE_ID_ATTRIBUTE,
  RUNTIME_SOURCE_NAME_ATTRIBUTE,
  RUNTIME_VALUE_EVENT,
  RUNTIME_VALUE_STORE_PROPERTY,
} from '../values/runtime-value-contract'

export const MAX_JS_LAB_CODE_CHARACTERS = 100_000

export interface RawJavaScriptRuntimeLibrary {
  globalApis: Array<{ name: string }>
  id: string
  source: string
}

export function jsLabDeclaredVariableNames(code: string) {
  const names: string[] = []
  const declaration = /(?:^|[;\n\r])\s*(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*(?==|;|,|\n|\r|$)/g
  let match: RegExpExecArray | null
  while ((match = declaration.exec(code))) {
    if (!names.includes(match[1])) names.push(match[1])
  }
  return names
}

export function javascriptIdentifier(value: string, fallback = 'value') {
  const words = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_$]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  const joined = words.map((word, index) => index === 0
    ? `${word.slice(0, 1).toLowerCase()}${word.slice(1)}`
    : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join('') || fallback
  const prefixed = /^[A-Za-z_$]/.test(joined) ? joined : `value${joined}`
  return /^(?:await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|return|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)$/.test(prefixed)
    ? `value${prefixed.slice(0, 1).toUpperCase()}${prefixed.slice(1)}`
    : prefixed
}

export function externalFunctionJavascriptName(functionId: string) {
  return javascriptIdentifier(functionId, 'externalFunction')
}

type ExternalFunctionRegistryFactory = typeof createExternalFunctionRegistry
type RuntimeValueStoreInstaller = typeof installRuntimeValueStore

function installJsLabRuntime(
  runtimeWindow: Window,
  runtimeDocument: Document,
  registrations: ExternalFunctionRegistration[],
  rawLibraries: RawJavaScriptRuntimeLibrary[],
  registryFactory: ExternalFunctionRegistryFactory,
  runtimeValueStoreInstaller: RuntimeValueStoreInstaller,
  maxCodeCharacters: number,
  runtimeValueStoreProperty: string,
  runtimeValueEventName: string,
  identifierFactory: typeof javascriptIdentifier,
  runtimeSourceIdAttribute: string,
  runtimeOutputIdAttribute: string,
  runtimeSourceNameAttribute: string,
  runtimeOutputNameAttribute: string,
  runtimeOutputTypeAttribute: string,
  functionResultOutputId: string,
  declaredVariableNames: typeof jsLabDeclaredVariableNames,
) {
  const runtimeValueStore = runtimeValueStoreInstaller(
    runtimeWindow,
    runtimeDocument,
    runtimeValueStoreProperty,
    runtimeValueEventName,
  )
  const functionBindings = registrations.map((registration) => ({
    implementation: registration.implementation as (...inputs: unknown[]) => unknown,
    name: identifierFactory(registration.metadata.id, 'externalFunction'),
  }))
  const rawBindings: Array<{ name: string; value: unknown }> = []
  const rawLibraryErrors: string[] = []
  rawLibraries.forEach((library) => {
    try {
      const loader = Function(library.source) as () => unknown
      loader.call(runtimeWindow)
      library.globalApis.forEach((api) => {
        const value = (runtimeWindow as unknown as Record<string, unknown>)[api.name]
        if (value === undefined) throw new Error(`no expuso “${api.name}”`)
        rawBindings.push({ name: api.name, value })
      })
    } catch (cause) {
      rawLibraryErrors.push(`${library.id}: ${cause instanceof Error ? cause.message : 'no se pudo cargar'}`)
    }
  })
  const allBindingNames = [...functionBindings.map((binding) => binding.name), ...rawBindings.map((binding) => binding.name)]
  const duplicateFunctionName = allBindingNames.find((name, index) => allBindingNames.indexOf(name) !== index)

  const setStatus = (root: HTMLElement, message: string, isError = false) => {
    const status = root.querySelector<HTMLElement>('[data-builder-js-lab-status]')
    if (!status) return
    status.textContent = message
    status.setAttribute('role', isError ? 'alert' : 'status')
  }

  const initialize = (root: HTMLElement) => {
    const code = root.getAttribute('data-builder-js-lab-code') ?? ''
    const codeEditor = root.querySelector<HTMLTextAreaElement>('[data-builder-js-lab-code-editor]')
    if (codeEditor) codeEditor.value = code
    renderVariables(root)
  }

  const runtimeSourcesFor = (root: HTMLElement) => {
    const sources: Array<{
      alias: string
      stored?: { type: string; value: unknown }
      type: string
    }> = []
    const aliases = new Set<string>()
    runtimeDocument.querySelectorAll<HTMLElement>(
      `[${runtimeSourceIdAttribute}][${runtimeOutputIdAttribute}]`,
    ).forEach((producer) => {
      if (producer === root) return
      const sourceId = producer.getAttribute(runtimeSourceIdAttribute)?.trim()
      const outputId = producer.getAttribute(runtimeOutputIdAttribute)?.trim()
      if (!sourceId || !outputId) return
      const sourceName = producer.getAttribute(runtimeSourceNameAttribute)
        || producer.getAttribute(runtimeOutputNameAttribute)
        || outputId
      const baseAlias = identifierFactory(sourceName, 'runtimeValue')
      let alias = baseAlias
      let suffix = 2
      while (aliases.has(alias)) {
        alias = `${baseAlias}${suffix}`
        suffix += 1
      }
      aliases.add(alias)
      const stored = runtimeValueStore.store.read(`${sourceId}::${outputId}`)
      sources.push({
        alias,
        ...(stored ? { stored: { type: stored.type, value: stored.value } } : {}),
        type: producer.getAttribute(runtimeOutputTypeAttribute) || stored?.type || 'json',
      })
    })
    return sources
  }

  const runtimeValuesFor = (root: HTMLElement) => Object.fromEntries(
    runtimeSourcesFor(root).flatMap((source) => (
      source.stored ? [[source.alias, source.stored.value]] : []
    )),
  )

  const valueType = (value: unknown) => {
    if (typeof value === 'number') return 'number'
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === 'number')) return 'number[]'
      if (value.every((item) => Array.isArray(item))) return 'number[][]'
    }
    return 'json'
  }

  const valuePreview = (value: unknown) => {
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value)
    if (typeof value === 'string') return value.length > 80 ? `${value.slice(0, 77)}…` : value
    if (Array.isArray(value)) {
      if (value.length <= 6 && !value.some(Array.isArray)) return JSON.stringify(value)
      if (value.every(Array.isArray)) {
        const width = value[0]?.length ?? 0
        return `${value.length} fila(s) × ${width} valor(es)`
      }
      return `${value.length} valor(es)`
    }
    if (value && typeof value === 'object') return `${Object.keys(value as object).length} campo(s)`
    return 'No compatible'
  }

  function renderVariables(root: HTMLElement) {
    const body = root.querySelector<HTMLTableSectionElement>('[data-builder-js-lab-variable-rows]')
    if (!body) return
    body.replaceChildren()
    const rows: Array<{ name: string; status: string; type: string }> = runtimeSourcesFor(root).map((source) => ({
      name: `runtimeValues.${source.alias}`,
      status: source.stored ? valuePreview(source.stored.value) : 'Esperando datos…',
      type: source.type,
    }))
    const sourceId = root.getAttribute(runtimeSourceIdAttribute)?.trim()
    const outputId = root.getAttribute(runtimeOutputIdAttribute)?.trim() || functionResultOutputId
    const published = sourceId ? runtimeValueStore.store.read(`${sourceId}::${outputId}`)?.value : undefined
    if (published && typeof published === 'object' && !Array.isArray(published)) {
      Object.entries(published as Record<string, unknown>).forEach(([name, value]) => rows.push({
        name,
        status: valuePreview(value),
        type: valueType(value),
      }))
    }
    if (!rows.length) rows.push({ name: '—', status: 'Ejecuta o analiza datos para ver variables.', type: '—' })
    rows.forEach((row) => {
      const tableRow = runtimeDocument.createElement('tr')
      ;[row.name, row.type, row.status].forEach((text, index) => {
        const cell = runtimeDocument.createElement('td')
        cell.textContent = text
        cell.style.padding = '.48rem .4rem'
        cell.style.borderBottom = '1px solid #202a34'
        if (index === 2 && text === 'Esperando datos…') cell.style.color = '#d7a95b'
        tableRow.append(cell)
      })
      body.append(tableRow)
    })
  }

  const execute = async (root: HTMLElement) => {
    if (rawLibraryErrors.length) {
      setStatus(root, `No se pudo cargar una biblioteca global: ${rawLibraryErrors[0]}.`, true)
      return
    }
    if (duplicateFunctionName) {
      setStatus(root, `Dos funciones producen el mismo nombre JavaScript: ${duplicateFunctionName}.`, true)
      return
    }
    const codeEditor = root.querySelector<HTMLTextAreaElement>('[data-builder-js-lab-code-editor]')
    const code = codeEditor?.value ?? root.getAttribute('data-builder-js-lab-code') ?? ''
    if (!code.trim()) {
      setStatus(root, 'JS Lab necesita código JavaScript.', true)
      return
    }
    if (code.length > maxCodeCharacters) {
      setStatus(root, `El código supera el límite de ${maxCodeCharacters} caracteres.`, true)
      return
    }
    const variableNames = declaredVariableNames(code)
    if (!variableNames.length) {
      setStatus(root, 'Declara al menos una variable con let, const o var para publicarla.', true)
      return
    }
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () { /* runtime constructor */ }).constructor as (
        new (...parameters: string[]) => (...values: unknown[]) => Promise<unknown>
      )
      const runtimeValues = runtimeValuesFor(root)
      const runner = new AsyncFunction(
        ...functionBindings.map((binding) => binding.name),
        ...rawBindings.map((binding) => binding.name),
        'runtimeValues',
        `"use strict";\n${code}\nreturn Object.fromEntries([${variableNames.map((name) => (
          `[${JSON.stringify(name)}, typeof ${name} === "undefined" ? undefined : ${name}]`
        )).join(',')}].filter((entry) => entry[1] !== undefined));`,
      )
      const value = await runner(
        ...functionBindings.map((binding) => binding.implementation),
        ...rawBindings.map((binding) => binding.value),
        runtimeValues,
      )
      const validator = registryFactory()
      const validation = validator.registerFunction({
        description: 'Validates a JS Lab result.',
        id: 'js-lab-result-validator',
        inputs: [{ name: 'value', type: 'json' }],
        name: 'JS Lab result validator',
        output: { type: 'json' },
      }, (candidate: unknown) => candidate)
      if (!validation.ok) {
        setStatus(root, validation.error, true)
        return
      }
      const validatedVariables: Record<string, unknown> = {}
      for (const [name, candidate] of Object.entries(value as Record<string, unknown>)) {
        if (typeof candidate === 'function') {
          setStatus(
            root,
            `La variable “${name}” contiene una función. Llámala con paréntesis, por ejemplo nombreFuncion(...), para publicar su resultado.`,
            true,
          )
          return
        }
        const validated = await validator.executeRegisteredFunction(
          'js-lab-result-validator',
          { value: candidate },
        )
        if (!validated.ok) {
          const detail = validated.error.replace(/^La entrada “value”\s*/, '')
          setStatus(root, `La variable “${name}” ${detail}`, true)
          return
        }
        validatedVariables[name] = validated.value
      }
      const sourceId = root.getAttribute(runtimeSourceIdAttribute)?.trim()
      if (sourceId) {
        runtimeValueStore.store.publish({
          sourceId,
          outputId: root.getAttribute(runtimeOutputIdAttribute)?.trim() || functionResultOutputId,
          type: 'json',
          value: validatedVariables,
        })
      }
      const output = root.querySelector<HTMLElement>('[data-builder-js-lab-result]')
      const display = JSON.stringify(validatedVariables, null, 2)
      if (output) output.textContent = display.length > 200_000
        ? 'Resultado publicado; es demasiado grande para mostrarlo aquí.'
        : display
      setStatus(root, `${Object.keys(validatedVariables).length} variable(s) publicada(s).`)
    } catch (cause) {
      setStatus(root, cause instanceof Error ? cause.message : 'JS Lab no pudo ejecutarse.', true)
    }
  }

  const handleClick = (event: Event) => {
    const target = event.target as Element | null
    const button = target?.closest?.('[data-builder-js-lab-run]')
    const root = button?.closest<HTMLElement>('[data-builder-js-lab]')
    if (!button || !root) return
    event.preventDefault()
    void execute(root)
  }
  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
    const root = target?.closest?.<HTMLElement>('[data-builder-js-lab]')
    if (!target || !root) return
    if (target.hasAttribute('data-builder-js-lab-code-editor')) {
      root.setAttribute('data-builder-js-lab-code', target.value)
    }
  }
  const handleRuntimeValue = () => {
    runtimeDocument.querySelectorAll<HTMLElement>('[data-builder-js-lab]').forEach(renderVariables)
  }

  runtimeDocument.querySelectorAll<HTMLElement>('[data-builder-js-lab]').forEach(initialize)
  runtimeDocument.addEventListener('click', handleClick, true)
  runtimeDocument.addEventListener('input', handleInput, true)
  runtimeDocument.addEventListener('change', handleInput, true)
  runtimeDocument.addEventListener(runtimeValueEventName, handleRuntimeValue)
  return () => {
    runtimeDocument.removeEventListener('click', handleClick, true)
    runtimeDocument.removeEventListener('input', handleInput, true)
    runtimeDocument.removeEventListener('change', handleInput, true)
    runtimeDocument.removeEventListener(runtimeValueEventName, handleRuntimeValue)
    runtimeValueStore.dispose()
  }
}

export function installExternalJsLabRuntime(
  runtimeWindow: Window = window,
  runtimeDocument: Document = document,
  registrations: ExternalFunctionRegistration[] = [],
  rawLibraries: RawJavaScriptRuntimeLibrary[] = [],
) {
  return installJsLabRuntime(
    runtimeWindow,
    runtimeDocument,
    registrations,
    rawLibraries,
    createExternalFunctionRegistry,
    installRuntimeValueStore,
    MAX_JS_LAB_CODE_CHARACTERS,
    RUNTIME_VALUE_STORE_PROPERTY,
    RUNTIME_VALUE_EVENT,
    javascriptIdentifier,
    RUNTIME_SOURCE_ID_ATTRIBUTE,
    RUNTIME_OUTPUT_ID_ATTRIBUTE,
    RUNTIME_SOURCE_NAME_ATTRIBUTE,
    RUNTIME_OUTPUT_NAME_ATTRIBUTE,
    RUNTIME_OUTPUT_TYPE_ATTRIBUTE,
    FUNCTION_RESULT_OUTPUT_ID,
    jsLabDeclaredVariableNames,
  )
}

export function createJsLabRuntimeInstallationSource() {
  return `(${installJsLabRuntime.toString()})(window, document, externalFunctionRegistrations, rawJavaScriptLibraries, createExternalFunctionRegistry, installRuntimeValueStore, ${MAX_JS_LAB_CODE_CHARACTERS}, ${JSON.stringify(RUNTIME_VALUE_STORE_PROPERTY)}, ${JSON.stringify(RUNTIME_VALUE_EVENT)}, ${javascriptIdentifier.toString()}, ${JSON.stringify(RUNTIME_SOURCE_ID_ATTRIBUTE)}, ${JSON.stringify(RUNTIME_OUTPUT_ID_ATTRIBUTE)}, ${JSON.stringify(RUNTIME_SOURCE_NAME_ATTRIBUTE)}, ${JSON.stringify(RUNTIME_OUTPUT_NAME_ATTRIBUTE)}, ${JSON.stringify(RUNTIME_OUTPUT_TYPE_ATTRIBUTE)}, ${JSON.stringify(FUNCTION_RESULT_OUTPUT_ID)}, ${jsLabDeclaredVariableNames.toString()});`
}
