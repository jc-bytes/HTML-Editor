import type { ExternalFunctionImplementation, ExternalFunctionResult } from './external-function-registry'

const MAX_IMPLEMENTATION_SOURCE_LENGTH = 100_000

export function restoreExternalFunctionImplementation(source: string): ExternalFunctionResult {
  if (typeof source !== 'string' || !source.trim() || source.length > MAX_IMPLEMENTATION_SOURCE_LENGTH) {
    return { error: 'El código de la función no es válido.', ok: false }
  }
  if (source.includes('[native code]')) {
    return { error: 'La función debe contener código JavaScript independiente.', ok: false }
  }
  if (/^\s*class\b/.test(source) || /^\s*(?:async\s+)?function\s*\*/.test(source)) {
    return { error: 'La implementación debe ser una función normal o una función flecha.', ok: false }
  }

  try {
    const implementation = Function(`"use strict"; return (${source});`)() as unknown
    if (typeof implementation !== 'function') {
      return { error: 'La implementación reconstruida no es una función.', ok: false }
    }
    return { ok: true, value: implementation as ExternalFunctionImplementation }
  } catch {
    return {
      error: 'La función debe ser independiente y serializable como una función o función flecha.',
      ok: false,
    }
  }
}

export function serializeExternalFunctionImplementation(
  implementation: ExternalFunctionImplementation,
): ExternalFunctionResult {
  if (typeof implementation !== 'function') {
    return { error: 'La implementación de la función no es válida.', ok: false }
  }
  const source = Function.prototype.toString.call(implementation)
  const restored = restoreExternalFunctionImplementation(source)
  return restored.ok ? { ok: true, value: source } : restored
}
