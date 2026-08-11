import { describe, expect, it } from 'vitest'
import {
  restoreExternalFunctionImplementation,
  serializeExternalFunctionImplementation,
} from './external-function-source'

describe('external function source', () => {
  it('round-trips standalone named and arrow functions', () => {
    function multiply(left: number, right: number) { return left * right }
    const subtract = (left: number, right: number) => left - right

    for (const implementation of [multiply, subtract]) {
      const serialized = serializeExternalFunctionImplementation(implementation)
      expect(serialized.ok).toBe(true)
      const restored = restoreExternalFunctionImplementation(String(serialized.ok && serialized.value))
      expect(restored.ok).toBe(true)
    }
  })

  it('rejects non-standalone method syntax and native functions', () => {
    const method = { multiply(left: number, right: number) { return left * right } }.multiply
    expect(serializeExternalFunctionImplementation(method)).toEqual(expect.objectContaining({ ok: false }))
    expect(restoreExternalFunctionImplementation('function max() { [native code] }'))
      .toEqual(expect.objectContaining({ ok: false }))
    expect(restoreExternalFunctionImplementation('class Multiply {}'))
      .toEqual(expect.objectContaining({ ok: false }))
    expect(restoreExternalFunctionImplementation('function* values() { yield 1 }'))
      .toEqual(expect.objectContaining({ ok: false }))
  })
})
