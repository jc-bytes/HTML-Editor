import { describe, expect, it } from 'vitest'
import { createExternalFunctionRegistry } from '../../runtime/functions/external-function-registry'
import { removeZeroSumRows } from '../array-tools'
import { MEDIAPIPE_HAND_CONNECTIONS, mediaPipeHandConnections } from '../mediapipe-data'
import { connectionVectors, orderedPairwiseAngles } from '../vector-tools'
import {
  extractLeftHandXyz,
  extractRightHandXyz,
  signMovementToolsLibrary,
} from './index'

function flatLandmarks(points: number[][]) {
  return points.flat()
}

describe('composable reference hand preparation', () => {
  it('uses the approved deterministic set and order of 21 MediaPipe hand connections', () => {
    const expected = [
      [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
      [1, 2], [2, 3], [3, 4],
      [5, 6], [6, 7], [7, 8],
      [9, 10], [10, 11], [11, 12],
      [13, 14], [14, 15], [15, 16],
      [17, 18], [18, 19], [19, 20],
    ]
    expect(MEDIAPIPE_HAND_CONNECTIONS).toEqual(expected)
    expect(mediaPipeHandConnections()).toEqual(expected)
    expect(MEDIAPIPE_HAND_CONNECTIONS).toHaveLength(21)
  })

  it('extracts finite XYZ in landmark order, keeps sides separate, and ignores visibility', () => {
    const left = Array.from({ length: 21 }, (_, index) => ({
      x: index + 0.1, y: index + 0.2, z: index + 0.3, visibility: 0,
    }))
    const right = Array.from({ length: 21 }, (_, index) => ({
      x: -index - 0.1, y: -index - 0.2, z: -index - 0.3, visibility: 1,
    }))
    const frames = [{ leftHandLandmarks: [left], rightHandLandmarks: [right] }]

    expect(extractLeftHandXyz(frames)).toEqual([left.flatMap(({ x, y, z }) => [x, y, z])])
    expect(extractRightHandXyz(frames)).toEqual([right.flatMap(({ x, y, z }) => [x, y, z])])
    expect(extractLeftHandXyz(frames)[0]).toHaveLength(63)
  })

  it('represents an absent hand with 63 zeros and rejects partial or malformed hands', () => {
    expect(extractLeftHandXyz([{ leftHandLandmarks: [[]] }])).toEqual([Array(63).fill(0)])
    expect(extractRightHandXyz([{ rightHandLandmarks: [] }])).toEqual([Array(63).fill(0)])
    expect(() => extractLeftHandXyz([{
      leftHandLandmarks: [[{ x: 0, y: 0, z: 0 }]],
    }])).toThrow('exactly 21')
    const missingZ = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }))
    expect(() => extractRightHandXyz([{ rightHandLandmarks: [missingZ] }])).toThrow('finite x, y, and z')
  })

  it('makes reference missing-frame omission a separate generic array operation', () => {
    expect(removeZeroSumRows([
      Array(63).fill(0),
      [1, 2, 3],
      [-1, 1],
    ])).toEqual([[1, 2, 3]])
  })

  it('subtracts connected points in the approved b-minus-a direction', () => {
    expect(connectionVectors([[0, 0, 0, 2, 3, 4]], [[0, 1]])).toEqual([[[2, 3, 4]]])
    expect(connectionVectors([[0, 0, 0, 2, 3, 4]], [[1, 0]])).toEqual([[[-2, -3, -4]]])
  })

  it('calculates full row-major ordered pair angles in radians', () => {
    const features = orderedPairwiseAngles([[
      [1, 0, 0],
      [0, 1, 0],
      [-1, 0, 0],
    ]])[0]
    expect(features).toHaveLength(9)
    expect(features).toEqual([
      0, Math.PI / 2, Math.PI,
      Math.PI / 2, 0, Math.PI / 2,
      Math.PI, Math.PI / 2, 0,
    ])
  })

  it('returns zero for equal vectors and non-finite zero-vector angle cases', () => {
    expect(orderedPairwiseAngles([[[1, 0, 0], [1, 0, 0]]])).toEqual([[0, 0, 0, 0]])
    expect(orderedPairwiseAngles([[[0, 0, 0], [1, 0, 0]]])).toEqual([[0, 0, 0, 0]])
  })

  it('assembles the reference 21 by 21 feature sequence from visible generic operations', () => {
    const collinearFixture = flatLandmarks(Array.from({ length: 21 }, (_, index) => [index, 0, 0]))
    const selectedRows = removeZeroSumRows([Array(63).fill(0), collinearFixture])
    const vectors = connectionVectors(selectedRows, mediaPipeHandConnections())
    const first = orderedPairwiseAngles(vectors)
    const second = orderedPairwiseAngles(connectionVectors(selectedRows, mediaPipeHandConnections()))

    expect(first).toEqual(second)
    expect(first).toHaveLength(1)
    expect(first[0]).toHaveLength(441)
    // Manually verifiable reference fixture: all 21 connection vectors point
    // along positive X, so all 441 pairwise radian angles are exactly zero.
    expect(first[0]).toEqual(Array(441).fill(0))
  })

  it('keeps independently assembled left/right sequences at different lengths', () => {
    const left = orderedPairwiseAngles(connectionVectors([
      flatLandmarks(Array.from({ length: 21 }, (_, index) => [index, 0, 0])),
      flatLandmarks(Array.from({ length: 21 }, (_, index) => [index, index, 0])),
    ], mediaPipeHandConnections()))
    const right = orderedPairwiseAngles(connectionVectors([
      flatLandmarks(Array.from({ length: 21 }, (_, index) => [index, 0, 0])),
    ], mediaPipeHandConnections()))
    expect(left).toHaveLength(2)
    expect(right).toHaveLength(1)
    expect(left.every((row) => row.length === 441)).toBe(true)
    expect(right.every((row) => row.length === 441)).toBe(true)
  })

  it('registers and executes hand selection through the generic registry', async () => {
    const registry = createExternalFunctionRegistry()
    signMovementToolsLibrary.functions.forEach(({ metadata, implementation }) => {
      expect(registry.registerFunction(metadata, implementation).ok).toBe(true)
    })
    const frames = [{
      leftHandLandmarks: [Array.from({ length: 21 }, (_, index) => ({ x: index, y: 0, z: 0 }))],
      rightHandLandmarks: [[]],
    }]
    const extracted = await registry.executeRegisteredFunction('extract-left-hand-xyz', {
      'landmark-frames': frames,
    })
    expect(extracted).toEqual(expect.objectContaining({ ok: true }))
    if (extracted.ok) expect(extracted.value).toEqual([flatLandmarks(Array.from({ length: 21 }, (_, index) => [index, 0, 0]))])
  })
})
