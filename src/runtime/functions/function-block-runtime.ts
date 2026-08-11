import { externalFunctionRegistrations } from '../../external-functions/catalog'
import {
  createExternalFunctionRegistry,
  type ExternalFunctionMetadata,
  type ExternalFunctionRegistration,
} from './external-function-registry'
import { serializeExternalFunctionImplementation } from './external-function-source'
import {
  FUNCTION_RESULT_OUTPUT_ID,
  FUNCTION_INPUT_SOURCE_ATTRIBUTE_PREFIX,
  RUNTIME_VALUE_EVENT,
  RUNTIME_OUTPUT_ID_ATTRIBUTE,
  RUNTIME_SOURCE_ID_ATTRIBUTE,
  RUNTIME_VALUE_STORE_PROPERTY,
} from '../values/runtime-value-contract'
import { installRuntimeValueStore } from '../values/runtime-value-store'
import {
  createJsLabRuntimeInstallationSource,
  installExternalJsLabRuntime,
} from './js-lab-runtime'

export const EXTERNAL_FUNCTION_ATTRIBUTE = 'data-builder-function-id'
export const EXTERNAL_FUNCTION_INPUT_ATTRIBUTE = 'data-builder-function-input'
export const EXTERNAL_FUNCTION_OUTPUT_ATTRIBUTE = 'data-builder-function-output'
export const EXTERNAL_FUNCTION_STATUS_ATTRIBUTE = 'data-builder-function-status'
// This limit applies only to human-edited JSON controls and displayed JSON.
// Programmatic runtime arrays use the much larger registry element limits.
export const MAX_EXTERNAL_FUNCTION_JSON_INPUT_CHARACTERS = 200_000

type ExternalFunctionRegistryFactory = typeof createExternalFunctionRegistry
type RuntimeValueStoreInstaller = typeof installRuntimeValueStore

function installFunctionBlockRuntime(
  runtimeWindow: Window,
  runtimeDocument: Document,
  registrations: ExternalFunctionRegistration[],
  registryFactory: ExternalFunctionRegistryFactory,
  runtimeValueStoreInstaller: RuntimeValueStoreInstaller,
  maxJsonCharacters: number,
  runtimeValueEventName: string,
  runtimeValueStoreProperty: string,
  functionInputSourceAttributePrefix: string,
  runtimeSourceIdAttribute: string,
  runtimeOutputIdAttribute: string,
  functionResultOutputId: string,
) {
  const registry = registryFactory()
  const registrationErrors = new Map<string, string>()
  registrations.forEach((registration) => {
    const result = registry.registerFunction(registration.metadata, registration.implementation)
    if (!result.ok) registrationErrors.set(registration.metadata?.id ?? '', result.error)
  })
  const runtimeValueStore = runtimeValueStoreInstaller(
    runtimeWindow,
    runtimeDocument,
    runtimeValueStoreProperty,
    runtimeValueEventName,
  )

  const setStatus = (root: HTMLElement, message: string, isError = false) => {
    const status = root.querySelector<HTMLElement>('[data-builder-function-status]')
    if (!status) return
    status.textContent = message
    status.setAttribute('role', isError ? 'alert' : 'status')
  }

  const readInputs = (root: HTMLElement, metadata: ExternalFunctionMetadata) => {
    const controls = [...root.querySelectorAll<HTMLElement>('[data-builder-function-input]')]
    const values: Record<string, unknown> = {}
    for (const input of metadata.inputs) {
      const sourceKey = root.getAttribute(`${functionInputSourceAttributePrefix}${input.name}`)?.trim()
      if (sourceKey) {
        let runtimeValue
        try {
          runtimeValue = runtimeValueStore.store.read(sourceKey)
        } catch (cause) {
          return {
            error: cause instanceof Error ? cause.message : `No se pudo copiar la entrada “${input.name}”.`,
            values,
          }
        }
        if (!runtimeValue) return { error: `Ejecuta primero la fuente seleccionada para “${input.name}”.`, values }
        if (runtimeValue.type !== input.type) {
          return { error: `La fuente de “${input.name}” produce ${runtimeValue.type}, no ${input.type}.`, values }
        }
        values[input.name] = runtimeValue.value
        continue
      }
      if (input.type === 'json') {
        return { error: `Selecciona una fuente de datos para “${input.name}”.`, values }
      }
      const control = controls.find((candidate) => (
        candidate.getAttribute('data-builder-function-input') === input.name
      ))
      if (!control) return { error: `Falta la entrada “${input.name}”.`, values }
      const editableControl = control as HTMLInputElement | HTMLTextAreaElement
      if (input.type === 'number') {
        const value = editableControl.value.trim() === '' ? Number.NaN : Number(editableControl.value)
        if (!Number.isFinite(value)) return { error: `La entrada “${input.name}” debe ser un número válido.`, values }
        values[input.name] = value
      } else {
        const rawSource = editableControl.value
        if (rawSource.length > maxJsonCharacters) {
          return {
            error: `La entrada “${input.name}” supera el límite manual de ${maxJsonCharacters} caracteres.`,
            values,
          }
        }
        const source = rawSource.trim()
        try {
          values[input.name] = JSON.parse(source)
        } catch {
          return { error: `La entrada “${input.name}” debe contener JSON válido.`, values }
        }
      }
    }
    return { values }
  }

  const execute = async (root: HTMLElement) => {
    const functionId = root.getAttribute('data-builder-function-id')?.trim() ?? ''
    const registrationError = registrationErrors.get(functionId)
    if (registrationError) {
      setStatus(root, registrationError, true)
      return
    }
    const metadata = registry.findFunction(functionId)
    if (!metadata) {
      setStatus(root, `No se encontró la función “${functionId}”.`, true)
      return
    }
    const inputs = readInputs(root, metadata)
    if (inputs.error) {
      setStatus(root, inputs.error, true)
      return
    }
    const result = await registry.executeRegisteredFunction(functionId, inputs.values)
    if (!result.ok) {
      setStatus(root, result.error, true)
      return
    }
    const sourceId = root.getAttribute(runtimeSourceIdAttribute)?.trim()
    if (sourceId) {
      runtimeValueStore.store.publish({
        sourceId,
        outputId: root.getAttribute(runtimeOutputIdAttribute)?.trim() || functionResultOutputId,
        type: metadata.output.type,
        value: result.value,
      })
    }
    const output = root.querySelector<HTMLElement>('[data-builder-function-output]')
    const displayValue = metadata.output.type === 'number'
      ? String(result.value)
      : JSON.stringify(result.value)
    if (displayValue.length > maxJsonCharacters) {
      if (output) output.textContent = 'Resultado disponible para otra función.'
      setStatus(root, `Función ejecutada. El resultado supera el límite gráfico de ${maxJsonCharacters} caracteres.`)
      return
    }
    if (output) output.textContent = displayValue
    setStatus(root, 'Función ejecutada correctamente.')
  }

  const handleSubmit = (event: Event) => {
    const target = event.target
    if (!target || typeof (target as Element).hasAttribute !== 'function') return
    const root = target as HTMLElement
    if (root.tagName !== 'FORM' || !root.hasAttribute('data-builder-function-id')) return
    event.preventDefault()
    event.stopPropagation()
    void execute(root)
  }

  runtimeDocument.addEventListener('submit', handleSubmit, true)
  return () => {
    runtimeDocument.removeEventListener('submit', handleSubmit, true)
    runtimeValueStore.dispose()
  }
}

export function installExternalFunctionBlockRuntime(
  runtimeWindow: Window = window,
  runtimeDocument: Document = document,
  registrations: ExternalFunctionRegistration[] = externalFunctionRegistrations,
) {
  const disposeFunctionBlocks = installFunctionBlockRuntime(
    runtimeWindow,
    runtimeDocument,
    registrations,
    createExternalFunctionRegistry,
    installRuntimeValueStore,
    MAX_EXTERNAL_FUNCTION_JSON_INPUT_CHARACTERS,
    RUNTIME_VALUE_EVENT,
    RUNTIME_VALUE_STORE_PROPERTY,
    FUNCTION_INPUT_SOURCE_ATTRIBUTE_PREFIX,
    RUNTIME_SOURCE_ID_ATTRIBUTE,
    RUNTIME_OUTPUT_ID_ATTRIBUTE,
    FUNCTION_RESULT_OUTPUT_ID,
  )
  const disposeJsLab = installExternalJsLabRuntime(runtimeWindow, runtimeDocument, registrations)
  return () => {
    disposeJsLab()
    disposeFunctionBlocks()
  }
}

export function createFunctionBlockRuntimeSource(
  registrations: ExternalFunctionRegistration[] = externalFunctionRegistrations,
) {
  const serializedRegistrations = registrations.map((registration) => {
    const serialized = serializeExternalFunctionImplementation(registration.implementation)
    if (!serialized.ok) throw new Error(`${registration.metadata.name}: ${serialized.error}`)
    return `{
    metadata: ${JSON.stringify(registration.metadata).replaceAll('<', '\\u003c')},
    implementation: (${serialized.value})
  }`
  }).join(',\n')
  return [
    `const createExternalFunctionRegistry = ${createExternalFunctionRegistry.toString()};`,
    `const installRuntimeValueStore = ${installRuntimeValueStore.toString()};`,
    `const externalFunctionRegistrations = [${serializedRegistrations}];`,
    `(${installFunctionBlockRuntime.toString()})(window, document, externalFunctionRegistrations, createExternalFunctionRegistry, installRuntimeValueStore, ${MAX_EXTERNAL_FUNCTION_JSON_INPUT_CHARACTERS}, ${JSON.stringify(RUNTIME_VALUE_EVENT)}, ${JSON.stringify(RUNTIME_VALUE_STORE_PROPERTY)}, ${JSON.stringify(FUNCTION_INPUT_SOURCE_ATTRIBUTE_PREFIX)}, ${JSON.stringify(RUNTIME_SOURCE_ID_ATTRIBUTE)}, ${JSON.stringify(RUNTIME_OUTPUT_ID_ATTRIBUTE)}, ${JSON.stringify(FUNCTION_RESULT_OUTPUT_ID)});`,
    createJsLabRuntimeInstallationSource(),
  ].join('\n')
}
