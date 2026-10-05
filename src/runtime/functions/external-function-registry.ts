export type ExternalFunctionJsonValue =
  | null
  | boolean
  | string
  | number
  | ExternalFunctionJsonValue[]
  | { [key: string]: ExternalFunctionJsonValue }
export type ExternalFunctionValueType = 'number' | 'number[]' | 'number[][]' | 'json'
export type ExternalFunctionValue = number | number[] | number[][] | ExternalFunctionJsonValue
export type ExternalFunctionLibraryProvenance = 'built-in' | 'imported'

export interface ExternalFunctionLibraryIdentity {
  description: string
  id: string
  name: string
  provenance?: ExternalFunctionLibraryProvenance
}

export type ExternalFunctionInputMetadata =
  | { defaultValue?: number; name: string; type: 'number' }
  | { defaultValue?: number[]; name: string; type: 'number[]' }
  | { defaultValue?: number[][]; name: string; type: 'number[][]' }
  | { defaultValue?: ExternalFunctionJsonValue; name: string; type: 'json' }

export interface ExternalFunctionMetadata {
  description: string
  exposedFunction?: string
  id: string
  inputs: ExternalFunctionInputMetadata[]
  library?: ExternalFunctionLibraryIdentity
  name: string
  output: { type: ExternalFunctionValueType }
  source?: string
  usage?: string
}

export type ExternalFunctionImplementation = (...inputs: never[]) => unknown | Promise<unknown>

export interface ExternalFunctionRegistration {
  implementation: ExternalFunctionImplementation
  metadata: ExternalFunctionMetadata
}

export type ExternalFunctionResult =
  | { ok: true; value: unknown }
  | { error: string; ok: false }

export function createExternalFunctionRegistry() {
  const registrations = new Map<string, ExternalFunctionRegistration>()
  const identifier = /^[a-z][a-z0-9-]*$/
  // Runtime limits are intentionally much larger than the manual JSON control
  // limit. They must accommodate future programmatic landmark sequences.
  const MAX_NUMERIC_LEAVES = 2_000_000
  const MAX_MATRIX_ROWS = 20_000
  const MAX_NUMBERS_PER_ROW = 20_000
  const MAX_JSON_DEPTH = 64
  const MAX_JSON_NODES = 2_100_000

  const valueError = (type: ExternalFunctionValueType, value: unknown) => {
    if (type === 'number') {
      return typeof value === 'number' && Number.isFinite(value)
        ? undefined
        : 'debe ser un número finito.'
    }
    if (!Array.isArray(value)) {
      if (type === 'json') {
        const stack: Array<{ depth: number; value: unknown }> = [{ depth: 0, value }]
        const visited = new Set<object>()
        let nodes = 0
        while (stack.length) {
          const current = stack.pop()!
          nodes += 1
          if (nodes > MAX_JSON_NODES) return `supera el límite de ${MAX_JSON_NODES} valores JSON.`
          if (current.depth > MAX_JSON_DEPTH) return `supera la profundidad JSON máxima de ${MAX_JSON_DEPTH}.`
          if (current.value === null || typeof current.value === 'string' || typeof current.value === 'boolean') continue
          if (typeof current.value === 'number') {
            if (!Number.isFinite(current.value)) return 'debe contener solamente números finitos.'
            continue
          }
          if (!current.value || typeof current.value !== 'object') return 'debe ser un valor JSON válido.'
          if (visited.has(current.value)) return 'no puede contener referencias circulares.'
          visited.add(current.value)
          if (Array.isArray(current.value)) {
            for (let index = 0; index < current.value.length; index += 1) {
              if (!(index in current.value)) return 'no puede contener espacios vacíos.'
              stack.push({ depth: current.depth + 1, value: current.value[index] })
            }
            continue
          }
          const prototype = Object.getPrototypeOf(current.value)
          if (prototype !== Object.prototype && prototype !== null) return 'debe contener solamente objetos JSON simples.'
          Object.keys(current.value).forEach((key) => {
            stack.push({
              depth: current.depth + 1,
              value: (current.value as Record<string, unknown>)[key],
            })
          })
        }
        return undefined
      }
      return type === 'number[]'
        ? 'debe ser un arreglo de números finitos.'
        : 'debe ser una matriz de números finitos.'
    }
    if (type === 'json') {
      const stack: Array<{ depth: number; value: unknown }> = [{ depth: 0, value }]
      const visited = new Set<object>()
      let nodes = 0
      while (stack.length) {
        const current = stack.pop()!
        nodes += 1
        if (nodes > MAX_JSON_NODES) return `supera el límite de ${MAX_JSON_NODES} valores JSON.`
        if (current.depth > MAX_JSON_DEPTH) return `supera la profundidad JSON máxima de ${MAX_JSON_DEPTH}.`
        if (current.value === null || typeof current.value === 'string' || typeof current.value === 'boolean') continue
        if (typeof current.value === 'number') {
          if (!Number.isFinite(current.value)) return 'debe contener solamente números finitos.'
          continue
        }
        if (!current.value || typeof current.value !== 'object') return 'debe ser un valor JSON válido.'
        if (visited.has(current.value)) return 'no puede contener referencias circulares.'
        visited.add(current.value)
        if (Array.isArray(current.value)) {
          for (let index = 0; index < current.value.length; index += 1) {
            if (!(index in current.value)) return 'no puede contener espacios vacíos.'
            stack.push({ depth: current.depth + 1, value: current.value[index] })
          }
          continue
        }
        const prototype = Object.getPrototypeOf(current.value)
        if (prototype !== Object.prototype && prototype !== null) return 'debe contener solamente objetos JSON simples.'
        Object.keys(current.value).forEach((key) => {
          stack.push({ depth: current.depth + 1, value: (current.value as Record<string, unknown>)[key] })
        })
      }
      return undefined
    }
    if (type === 'number[]') {
      if (value.length > MAX_NUMERIC_LEAVES) {
        return `supera el límite de ${MAX_NUMERIC_LEAVES} números.`
      }
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value) || typeof value[index] !== 'number' || !Number.isFinite(value[index])) {
          return 'debe contener solamente números finitos y no puede tener espacios vacíos.'
        }
      }
      return undefined
    }
    if (value.length > MAX_MATRIX_ROWS) {
      return `supera el límite de ${MAX_MATRIX_ROWS} filas.`
    }
    let numericLeaves = 0
    for (let rowIndex = 0; rowIndex < value.length; rowIndex += 1) {
      if (!(rowIndex in value) || !Array.isArray(value[rowIndex])) {
        return 'debe contener solamente filas de números finitos.'
      }
      const row = value[rowIndex] as unknown[]
      if (row.length > MAX_NUMBERS_PER_ROW) {
        return `contiene una fila que supera ${MAX_NUMBERS_PER_ROW} números.`
      }
      numericLeaves += row.length
      if (numericLeaves > MAX_NUMERIC_LEAVES) {
        return `supera el límite total de ${MAX_NUMERIC_LEAVES} números.`
      }
      for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
        if (!(columnIndex in row)
          || typeof row[columnIndex] !== 'number'
          || !Number.isFinite(row[columnIndex])) {
          return 'debe contener solamente filas de números finitos y no puede tener espacios vacíos.'
        }
      }
    }
    return undefined
  }

  const registrationError = (
    metadata: ExternalFunctionMetadata,
    implementation: ExternalFunctionImplementation,
  ) => {
    if (!metadata || typeof metadata !== 'object') return 'La definición de la función no es válida.'
    if (typeof metadata.id !== 'string' || !identifier.test(metadata.id)) {
      return 'La función necesita un identificador válido.'
    }
    if (typeof metadata.name !== 'string' || !metadata.name.trim()) {
      return 'La función necesita un nombre.'
    }
    if (typeof metadata.description !== 'string') return 'La descripción de la función no es válida.'
    if (metadata.exposedFunction !== undefined
      && (typeof metadata.exposedFunction !== 'string' || !/^[A-Za-z_$][\w$]*$/.test(metadata.exposedFunction))) {
      return 'La función expuesta no es válida.'
    }
    if (metadata.source !== undefined && (typeof metadata.source !== 'string' || !metadata.source.trim())) {
      return 'El código fuente documentado no es válido.'
    }
    if (metadata.usage !== undefined && (typeof metadata.usage !== 'string' || !metadata.usage.trim())) {
      return 'El ejemplo de uso de la función no es válido.'
    }
    if (metadata.library && (
      typeof metadata.library !== 'object'
      || typeof metadata.library.id !== 'string' || !identifier.test(metadata.library.id)
      || typeof metadata.library.name !== 'string' || !metadata.library.name.trim()
      || typeof metadata.library.description !== 'string'
      || (metadata.library.provenance !== undefined
        && metadata.library.provenance !== 'built-in'
        && metadata.library.provenance !== 'imported')
    )) return 'La biblioteca de origen de la función no es válida.'
    if (!Array.isArray(metadata.inputs) || !metadata.inputs.every((input) => (
      input && typeof input === 'object'
      && typeof input.name === 'string' && identifier.test(input.name)
      && (input.type === 'number' || input.type === 'number[]' || input.type === 'number[][]' || input.type === 'json')
      && (input.defaultValue === undefined
        || !valueError(input.type, input.defaultValue))
    ))) return 'Las entradas de la función no son válidas.'
    if (new Set(metadata.inputs.map((input) => input.name)).size !== metadata.inputs.length) {
      return 'Las entradas de la función no pueden repetirse.'
    }
    if (!metadata.output || !['number', 'number[]', 'number[][]', 'json'].includes(metadata.output.type)) {
      return 'La salida de la función no es válida.'
    }
    if (typeof implementation !== 'function') return 'La implementación de la función no es válida.'
    if (registrations.has(metadata.id)) return `La función “${metadata.id}” ya está registrada.`
    return undefined
  }

  const registerFunction = (
    metadata: ExternalFunctionMetadata,
    implementation: ExternalFunctionImplementation,
  ): ExternalFunctionResult => {
    const error = registrationError(metadata, implementation)
    if (error) return { error, ok: false }
    registrations.set(metadata.id, { metadata, implementation })
    return { ok: true, value: metadata }
  }

  const findFunction = (id: string) => registrations.get(id)?.metadata

  const executeRegisteredFunction = async (
    id: string,
    inputs: Record<string, unknown>,
  ): Promise<ExternalFunctionResult> => {
    const registration = registrations.get(id)
    if (!registration) return { error: `No se encontró la función “${id}”.`, ok: false }
    const orderedInputs: unknown[] = []
    for (const input of registration.metadata.inputs) {
      const value = inputs[input.name]
      const error = valueError(input.type, value)
      if (error) return { error: `La entrada “${input.name}” ${error}`, ok: false }
      orderedInputs.push(value)
    }
    try {
      const implementation = registration.implementation as (...values: unknown[]) => unknown | Promise<unknown>
      const value = await implementation(...orderedInputs)
      const outputError = valueError(registration.metadata.output.type, value)
      if (outputError) return { error: `La salida de la función ${outputError}`, ok: false }
      return { ok: true, value }
    } catch (cause) {
      return {
        error: cause instanceof Error ? cause.message : 'La función no pudo ejecutarse.',
        ok: false,
      }
    }
  }

  return { executeRegisteredFunction, findFunction, registerFunction }
}
