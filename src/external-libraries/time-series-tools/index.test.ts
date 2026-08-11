import { describe, expect, it } from 'vitest'
import { createExternalFunctionRegistry } from '../../runtime/functions/external-function-registry'
import { manhattanVectorDistance } from '../vector-tools'
import {
  DTW_COMPONENT_COMPARISON_LIMIT,
  dtwDistance,
  dtwDistanceMetadata,
} from './index'

describe('Time Series Tools', () => {
  it('calculates Manhattan/L1 distance between equal-width vectors', () => {
    expect(manhattanVectorDistance([1, -2, 3], [4, 2, 1])).toBe(9)
    expect(() => manhattanVectorDistance([1], [1, 2])).toThrow('same length')
    expect(() => manhattanVectorDistance([], [])).toThrow('nonempty')
  })

  it('returns zero for identical and speed-stretched equivalent sequences', () => {
    expect(dtwDistance([[0], [1], [2]], [[0], [1], [2]])).toBe(0)
    expect(dtwDistance([[0], [1], [2]], [[0], [1], [1], [2]])).toBe(0)
  })

  it('uses the exact accumulated recurrence with Manhattan local cost', () => {
    expect(dtwDistance([[0], [1]], [[2], [3]])).toBe(4)
    expect(dtwDistance([[0], [1], [2]], [[0], [2]])).toBe(1)
    expect(dtwDistance([[0], [0]], [[3], [3], [3]])).toBe(9)
  })

  it('supports 441-dimensional M6 frames without normalization', () => {
    expect(dtwDistance([Array(441).fill(0)], [Array(441).fill(1)])).toBe(441)
  })

  it('is deterministic across repeated calls', () => {
    const left = [[0, 2], [1, 3], [4, 5]]
    const right = [[0, 1], [3, 4]]
    expect(dtwDistance(left, right)).toBe(dtwDistance(left, right))
  })

  it('rejects empty sequences, empty frames, ragged widths, and cross-sequence width mismatches', () => {
    expect(() => dtwDistance([], [[0]])).toThrow('two nonempty sequences')
    expect(() => dtwDistance([[0]], [])).toThrow('two nonempty sequences')
    expect(() => dtwDistance([[]], [[]])).toThrow('nonempty numeric vector')
    expect(() => dtwDistance([[0, 1], [2]], [[0, 1]])).toThrow('width 2')
    expect(() => dtwDistance([[0, 1]], [[0]])).toThrow('width 2')
  })

  it('rejects non-finite values', () => {
    expect(() => dtwDistance([[Number.NaN]], [[0]])).toThrow('finite numbers')
    expect(() => dtwDistance([[0]], [[Number.POSITIVE_INFINITY]])).toThrow('finite numbers')
  })

  it('enforces the approved work-based safeguard before constructing the cost matrix', () => {
    const row = Array(441).fill(0)
    const sequenceA = Array(240).fill(row)
    const sequenceB = Array(240).fill(row)
    expect(sequenceA.length * sequenceB.length * row.length).toBeGreaterThan(DTW_COMPONENT_COMPARISON_LIMIT)
    expect(() => dtwDistance(sequenceA, sequenceB)).toThrow('25,000,000 component-comparison safeguard')
  })

  it('returns a structured registry error rather than Infinity for impossible comparison', async () => {
    const registry = createExternalFunctionRegistry()
    expect(registry.registerFunction(dtwDistanceMetadata, dtwDistance).ok).toBe(true)
    const result = await registry.executeRegisteredFunction('dtw-distance', {
      'sequence-a': [],
      'sequence-b': [[0]],
    })
    expect(result).toEqual(expect.objectContaining({ ok: false }))
    if (!result.ok) expect(result.error).toContain('two nonempty sequences')
  })
})
