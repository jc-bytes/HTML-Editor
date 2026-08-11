import { describe, expect, it } from 'vitest'
import { doubleNumber, doubleNumberMetadata } from '../../external-functions/double-number'
import {
  createExternalFunctionRegistry,
  type ExternalFunctionMetadata,
} from './external-function-registry'

describe('external function registry', () => {
  it('registers, finds, and repeatedly executes an external function', async () => {
    const registry = createExternalFunctionRegistry()

    expect(registry.registerFunction(doubleNumberMetadata, doubleNumber)).toEqual({
      ok: true,
      value: doubleNumberMetadata,
    })
    expect(registry.findFunction('double-number')).toBe(doubleNumberMetadata)
    await expect(registry.executeRegisteredFunction('double-number', { value: 5 }))
      .resolves.toEqual({ ok: true, value: 10 })
    await expect(registry.executeRegisteredFunction('double-number', { value: 7 }))
      .resolves.toEqual({ ok: true, value: 14 })
  })

  it('contains missing functions, invalid registration, invalid input, and execution exceptions', async () => {
    const registry = createExternalFunctionRegistry()
    const invalid = { ...doubleNumberMetadata, id: 'Not valid' } as ExternalFunctionMetadata
    expect(registry.registerFunction(invalid, doubleNumber)).toEqual(expect.objectContaining({ ok: false }))
    await expect(registry.executeRegisteredFunction('missing', { value: 5 }))
      .resolves.toEqual(expect.objectContaining({ ok: false }))

    const throwingMetadata: ExternalFunctionMetadata = {
      ...doubleNumberMetadata,
      id: 'throwing-number',
      name: 'Throwing Number',
    }
    registry.registerFunction(throwingMetadata, () => { throw new Error('Expected failure') })
    await expect(registry.executeRegisteredFunction('throwing-number', { value: 5 }))
      .resolves.toEqual({ error: 'Expected failure', ok: false })

    registry.registerFunction(doubleNumberMetadata, doubleNumber)
    await expect(registry.executeRegisteredFunction('double-number', { value: 'five' }))
      .resolves.toEqual(expect.objectContaining({ ok: false }))
  })

  it('validates optional graphical defaults while preserving library provenance', () => {
    const registry = createExternalFunctionRegistry()
    const metadata: ExternalFunctionMetadata = {
      ...doubleNumberMetadata,
      library: { id: 'math-tools', name: 'Math Tools', description: 'Scalar tools.' },
    }
    expect(registry.registerFunction(metadata, doubleNumber)).toEqual({ ok: true, value: metadata })
    expect(registry.findFunction('double-number')?.library?.id).toBe('math-tools')

    const invalidDefault: ExternalFunctionMetadata = {
      ...metadata,
      id: 'invalid-default',
      inputs: [{ defaultValue: Number.NaN, name: 'value', type: 'number' }],
    }
    expect(registry.registerFunction(invalidDefault, doubleNumber)).toEqual(expect.objectContaining({ ok: false }))
  })

  it('validates and executes number arrays and ragged numeric matrices generically', async () => {
    const registry = createExternalFunctionRegistry()
    const flattenMetadata: ExternalFunctionMetadata = {
      id: 'test-flatten', name: 'Test Flatten', description: 'Flattens.',
      inputs: [{ name: 'matrix', type: 'number[][]', defaultValue: [[1], [2, 3]] }],
      output: { type: 'number[]' },
    }
    expect(registry.registerFunction(flattenMetadata, (matrix: number[][]) => matrix.flat()).ok).toBe(true)
    await expect(registry.executeRegisteredFunction('test-flatten', { matrix: [[1], [2, 3]] }))
      .resolves.toEqual({ ok: true, value: [1, 2, 3] })

    const sumMetadata: ExternalFunctionMetadata = {
      id: 'test-sum', name: 'Test Sum', description: 'Sums.',
      inputs: [{ name: 'values', type: 'number[]', defaultValue: [1, 2, 3] }],
      output: { type: 'number' },
    }
    registry.registerFunction(sumMetadata, (values: number[]) => values.reduce((total, value) => total + value, 0))
    await expect(registry.executeRegisteredFunction('test-sum', { values: [1, 2, 3, 4] }))
      .resolves.toEqual({ ok: true, value: 10 })

    const matrixMetadata: ExternalFunctionMetadata = {
      id: 'test-matrix', name: 'Test Matrix', description: 'Returns a matrix.',
      inputs: [{ name: 'value', type: 'number' }], output: { type: 'number[][]' },
    }
    registry.registerFunction(matrixMetadata, () => [[1, 2], [3, 4]])
    await expect(registry.executeRegisteredFunction('test-matrix', { value: 1 }))
      .resolves.toEqual({ ok: true, value: [[1, 2], [3, 4]] })
  })

  it('rejects malformed nesting, non-finite values, objects, strings, and sparse arrays', async () => {
    const registry = createExternalFunctionRegistry()
    const vectorMetadata: ExternalFunctionMetadata = {
      id: 'vector-input', name: 'Vector Input', description: 'Vector.',
      inputs: [{ name: 'values', type: 'number[]' }], output: { type: 'number' },
    }
    const matrixMetadata: ExternalFunctionMetadata = {
      id: 'matrix-input', name: 'Matrix Input', description: 'Matrix.',
      inputs: [{ name: 'matrix', type: 'number[][]' }], output: { type: 'number' },
    }
    registry.registerFunction(vectorMetadata, () => 1)
    registry.registerFunction(matrixMetadata, () => 1)

    for (const value of [[1, '2'], [1, Number.NaN], [1, Number.POSITIVE_INFINITY], { 0: 1 }, [[1]]]) {
      await expect(registry.executeRegisteredFunction('vector-input', { values: value }))
        .resolves.toEqual(expect.objectContaining({ ok: false }))
    }
    const sparseVector = new Array(3)
    sparseVector[0] = 1
    await expect(registry.executeRegisteredFunction('vector-input', { values: sparseVector }))
      .resolves.toEqual(expect.objectContaining({ ok: false }))

    for (const value of [[1, 2], [[1, '2']], [[1, Number.NaN]], [[[1]]], { rows: [[1]] }]) {
      await expect(registry.executeRegisteredFunction('matrix-input', { matrix: value }))
        .resolves.toEqual(expect.objectContaining({ ok: false }))
    }
  })

  it('allows the documented runtime budget and rejects excessive arrays before execution', async () => {
    const registry = createExternalFunctionRegistry()
    const metadata: ExternalFunctionMetadata = {
      id: 'large-vector', name: 'Large Vector', description: 'Checks size.',
      inputs: [{ name: 'values', type: 'number[]' }], output: { type: 'number' },
    }
    registry.registerFunction(metadata, () => 1)
    const supported = new Array(2_000_000).fill(0)
    await expect(registry.executeRegisteredFunction('large-vector', { values: supported }))
      .resolves.toEqual({ ok: true, value: 1 })
    const excessive = new Array(2_000_001)
    await expect(registry.executeRegisteredFunction('large-vector', { values: excessive }))
      .resolves.toEqual(expect.objectContaining({ ok: false }))
  })

  it('rejects outputs that do not match their declared array shape', async () => {
    const registry = createExternalFunctionRegistry()
    const vectorOutput: ExternalFunctionMetadata = {
      id: 'bad-vector-output', name: 'Bad Vector', description: 'Bad.',
      inputs: [{ name: 'value', type: 'number' }], output: { type: 'number[]' },
    }
    const matrixOutput: ExternalFunctionMetadata = {
      id: 'bad-matrix-output', name: 'Bad Matrix', description: 'Bad.',
      inputs: [{ name: 'value', type: 'number' }], output: { type: 'number[][]' },
    }
    registry.registerFunction(vectorOutput, () => [1, Number.NaN])
    registry.registerFunction(matrixOutput, () => [[1], ['2']])
    await expect(registry.executeRegisteredFunction('bad-vector-output', { value: 1 }))
      .resolves.toEqual(expect.objectContaining({ ok: false }))
    await expect(registry.executeRegisteredFunction('bad-matrix-output', { value: 1 }))
      .resolves.toEqual(expect.objectContaining({ ok: false }))
  })

  it('validates JSON-compatible structured values without landmark-specific logic', async () => {
    const registry = createExternalFunctionRegistry()
    const metadata: ExternalFunctionMetadata = {
      id: 'count-json-items', name: 'Count JSON Items', description: 'Counts.',
      inputs: [{ name: 'value', type: 'json' }], output: { type: 'number' },
    }
    registry.registerFunction(metadata, (value: unknown) => Array.isArray(value) ? value.length : 0)
    const landmarks = [{
      t: 0, width: 640, height: 480, replaySampled: true,
      poseLandmarks: [[{ x: 0.5, y: 0.25, z: -0.1, visibility: 0.99 }]],
      leftHandLandmarks: [[]], rightHandLandmarks: [[]], faceLandmarks: [[]],
    }]
    await expect(registry.executeRegisteredFunction('count-json-items', { value: landmarks }))
      .resolves.toEqual({ ok: true, value: 1 })

    const circular: Record<string, unknown> = {}
    circular.self = circular
    for (const value of [
      { coordinate: Number.NaN },
      { coordinate: Number.POSITIVE_INFINITY },
      { unsupported: () => 1 },
      new Date(),
      circular,
    ]) {
      await expect(registry.executeRegisteredFunction('count-json-items', { value }))
        .resolves.toEqual(expect.objectContaining({ ok: false }))
    }
  })
})
