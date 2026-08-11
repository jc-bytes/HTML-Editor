import { describe, expect, it } from 'vitest'
import { normalizeImportedLibrary } from '../external-libraries/imported-library'
import { createProjectExternalLibraries } from './project-external-libraries'

function importedLibrary(id = 'simple-tools', functionId = 'multiply') {
  return normalizeImportedLibrary(`${id}.js`, {
    id,
    name: 'Simple Tools',
    description: 'Imported proof.',
    functions: [{
      metadata: {
        id: functionId, name: 'Multiply', description: 'Multiplies.',
        inputs: [{ name: 'left', type: 'number' }, { name: 'right', type: 'number' }],
        output: { type: 'number' },
      },
      implementation: function multiply(left: number, right: number) { return left * right },
    }],
  })
}

describe('project external libraries', () => {
  it('combines built-in and persisted imported libraries through one registry', async () => {
    const imported = importedLibrary()
    expect(imported.ok).toBe(true)
    if (!imported.ok) return

    const restored = createProjectExternalLibraries(JSON.parse(JSON.stringify([imported.value])))
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.listLibraries().map((library) => [library.id, library.provenance]))
      .toEqual([
        ['math-tools', 'built-in'],
        ['array-tools', 'built-in'],
        ['sequence-tools', 'built-in'],
        ['sign-movement-tools', 'built-in'],
        ['mediapipe-data', 'built-in'],
        ['vector-tools', 'built-in'],
        ['time-series-tools', 'built-in'],
        ['simple-tools', 'imported'],
      ])
    const multiply = restored.value.listFunctionRegistrations()
      .find((registration) => registration.metadata.id === 'multiply')!
    expect(await multiply.implementation(6 as never, 7 as never)).toBe(42)
  })

  it('rejects duplicate library IDs and globally conflicting function IDs atomically', () => {
    const original = createProjectExternalLibraries()
    expect(original.ok).toBe(true)
    if (!original.ok) return

    const first = importedLibrary()
    if (!first.ok) return
    expect(createProjectExternalLibraries([first.value, first.value]))
      .toEqual(expect.objectContaining({ ok: false }))

    const conflict = importedLibrary('other-tools', 'average')
    if (!conflict.ok) return
    expect(createProjectExternalLibraries([conflict.value]))
      .toEqual(expect.objectContaining({ ok: false }))
    expect(original.value.listLibraries()).toHaveLength(7)
    expect(original.value.listLibraries()[0].id).toBe('math-tools')
    expect(original.value.listLibraries()[1].id).toBe('array-tools')
    expect(original.value.listLibraries()[2].id).toBe('sequence-tools')
    expect(original.value.listLibraries()[3].id).toBe('sign-movement-tools')
    expect(original.value.listLibraries()[4].id).toBe('mediapipe-data')
    expect(original.value.listLibraries()[5].id).toBe('vector-tools')
    expect(original.value.listLibraries()[6].id).toBe('time-series-tools')
  })

  it('preserves imported array metadata and implementations across project serialization', async () => {
    const imported = normalizeImportedLibrary('matrix-tools.js', {
      id: 'matrix-tools', name: 'Matrix Tools', description: 'Imported array proof.',
      functions: [{
        metadata: {
          id: 'take-first-row', name: 'Take First Row', description: 'Returns the first row.',
          inputs: [{ name: 'matrix', type: 'number[][]', defaultValue: [[1, 2], [3, 4]] }],
          output: { type: 'number[]' },
        },
        implementation: function takeFirstRow(matrix: number[][]) { return matrix[0] ?? [] },
      }],
    })
    expect(imported.ok).toBe(true)
    if (!imported.ok) return

    const restored = createProjectExternalLibraries(JSON.parse(JSON.stringify([imported.value])))
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    const registration = restored.value.listFunctionRegistrations()
      .find(({ metadata }) => metadata.id === 'take-first-row')!
    expect(registration.metadata.inputs[0]).toEqual({
      name: 'matrix', type: 'number[][]', defaultValue: [[1, 2], [3, 4]],
    })
    expect(registration.metadata.output.type).toBe('number[]')
    expect(await registration.implementation([[5, 6], [7, 8]] as never)).toEqual([5, 6])
  })
})
