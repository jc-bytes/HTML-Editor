import { describe, expect, it, vi } from 'vitest'
import {
  loadPreparedImportedLibrary,
  normalizeImportedLibrary,
  prepareImportedLibraryFile,
  restorePersistedImportedLibrary,
} from './imported-library'

function simpleTools() {
  return {
    id: 'simple-tools',
    name: 'Simple Tools',
    description: 'Student scalar tools.',
    functions: [{
      metadata: {
        id: 'multiply', name: 'Multiply', description: 'Multiplies.',
        inputs: [{ name: 'left', type: 'number' }, { name: 'right', type: 'number' }],
        output: { type: 'number' },
      },
      implementation: function multiply(left: number, right: number) { return left * right },
    }, {
      metadata: {
        id: 'subtract', name: 'Subtract', description: 'Subtracts.',
        inputs: [{ name: 'left', type: 'number' }, { name: 'right', type: 'number' }],
        output: { type: 'number' },
      },
      implementation: function subtract(left: number, right: number) { return left - right },
    }],
  }
}

describe('imported library contract', () => {
  it('preflights a self-contained local JavaScript file without evaluating it', async () => {
    const file = new File(['export default { id: "simple-tools" }'], 'simple-tools.js', {
      type: 'text/javascript',
    })
    const result = await prepareImportedLibraryFile(file)
    expect(result).toEqual({
      ok: true,
      value: { fileName: 'simple-tools.js', source: 'export default { id: "simple-tools" }' },
    })
  })

  it('rejects malformed files and module dependencies before evaluation', async () => {
    await expect(prepareImportedLibraryFile(new File(['const value = 1'], 'tools.txt')))
      .resolves.toEqual(expect.objectContaining({ ok: false }))
    await expect(prepareImportedLibraryFile(new File([
      'import value from "./other.js"; export default value',
    ], 'tools.js'))).resolves.toEqual(expect.objectContaining({ ok: false }))
  })

  it('loads, validates, serializes, and restores multiple callable functions', async () => {
    const loader = vi.fn(async () => ({ default: simpleTools() }))
    const loaded = await loadPreparedImportedLibrary(
      { fileName: 'simple-tools.js', source: 'export default {}' },
      loader,
    )
    expect(loader).toHaveBeenCalledOnce()
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.value.functions.map((definition) => definition.metadata.id))
      .toEqual(['multiply', 'subtract'])

    const restored = restorePersistedImportedLibrary(JSON.parse(JSON.stringify(loaded.value)))
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(await restored.value.functions[0].implementation(6 as never, 7 as never)).toBe(42)
    expect(await restored.value.functions[1].implementation(9 as never, 4 as never)).toBe(5)
  })

  it('rejects malformed metadata and unserializable implementations', () => {
    expect(normalizeImportedLibrary('bad.js', { ...simpleTools(), id: 'Not valid' }))
      .toEqual(expect.objectContaining({ ok: false }))
    const methodLibrary = simpleTools()
    methodLibrary.functions[0].implementation = {
      multiply(left: number, right: number) { return left * right },
    }.multiply
    expect(normalizeImportedLibrary('method.js', methodLibrary))
      .toEqual(expect.objectContaining({ ok: false }))
  })

  it('accepts, serializes, restores, and executes imported array functions', async () => {
    const normalized = normalizeImportedLibrary('student-arrays.js', {
      id: 'student-arrays', name: 'Student Arrays', description: 'Imported array functions.',
      functions: [{
        metadata: {
          id: 'join-rows', name: 'Join Rows', description: 'Flattens a matrix.',
          inputs: [{ name: 'matrix', type: 'number[][]', defaultValue: [[1], [2, 3]] }],
          output: { type: 'number[]' },
        },
        implementation: function joinRows(matrix: number[][]) { return matrix.flat() },
      }],
    })
    expect(normalized.ok).toBe(true)
    if (!normalized.ok) return
    const restored = restorePersistedImportedLibrary(JSON.parse(JSON.stringify(normalized.value)))
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.functions[0].metadata.inputs[0]).toEqual({
      name: 'matrix', type: 'number[][]', defaultValue: [[1], [2, 3]],
    })
    expect(await restored.value.functions[0].implementation([[4, 5], [6]] as never))
      .toEqual([4, 5, 6])
  })

  it('rejects malformed array defaults during imported-library validation', () => {
    const candidate = simpleTools() as unknown as Record<string, unknown> & { functions: Array<Record<string, unknown>> }
    candidate.functions[0] = {
      metadata: {
        id: 'bad-vector', name: 'Bad Vector', description: 'Invalid default.',
        inputs: [{ name: 'values', type: 'number[]', defaultValue: [1, '2'] }],
        output: { type: 'number' },
      },
      implementation: function badVector(values: number[]) { return values.length },
    }
    expect(normalizeImportedLibrary('bad-vector.js', candidate))
      .toEqual(expect.objectContaining({ ok: false }))
  })

  it('persists imported functions that consume generic structured JSON values', async () => {
    const normalized = normalizeImportedLibrary('student-sequences.js', {
      id: 'student-sequences', name: 'Student Sequences', description: 'Structured data proof.',
      functions: [{
        metadata: {
          id: 'sequence-size', name: 'Sequence Size', description: 'Counts sequence values.',
          inputs: [{ name: 'sequence', type: 'json' }], output: { type: 'number' },
        },
        implementation: function sequenceSize(sequence: unknown) {
          if (!Array.isArray(sequence)) throw new Error('Expected an array.')
          return sequence.length
        },
      }],
    })
    expect(normalized.ok).toBe(true)
    if (!normalized.ok) return
    const restored = restorePersistedImportedLibrary(JSON.parse(JSON.stringify(normalized.value)))
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.functions[0].metadata.inputs[0].type).toBe('json')
    expect(await restored.value.functions[0].implementation([{}, {}, {}] as never)).toBe(3)
  })
})
