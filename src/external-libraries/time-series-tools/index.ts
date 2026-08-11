import type { ExternalFunctionMetadata } from '../../runtime/functions/external-function-registry'
import type { ExternalFunctionLibrary } from '../../runtime/functions/external-library-registry'

export const DTW_COMPONENT_COMPARISON_LIMIT = 25_000_000

export const dtwDistanceMetadata: ExternalFunctionMetadata = {
  id: 'dtw-distance',
  name: 'DTW Distance',
  description: 'Exact Dynamic Time Warping using Manhattan/L1 distance between vector frames. Returns the accumulated alignment cost without normalization.',
  inputs: [
    { defaultValue: [[0], [1]], name: 'sequence-a', type: 'number[][]' },
    { defaultValue: [[0], [1]], name: 'sequence-b', type: 'number[][]' },
  ],
  output: { type: 'number' },
}

/**
 * Exact Dynamic Time Warping recurrence adapted from dynamic-time-warping 1.0.0
 * (GordonLesti/dynamic-time-warping, MIT). Project-specific validation, the
 * work safeguard, and the Manhattan vector-frame metric are added here.
 */
export function dtwDistance(sequenceA: number[][], sequenceB: number[][]): number {
  const workLimit = 25_000_000
  if (!Array.isArray(sequenceA) || !Array.isArray(sequenceB)
    || sequenceA.length === 0 || sequenceB.length === 0) {
    throw new Error('DTW requires two nonempty sequences.')
  }

  const firstFrame = sequenceA[0]
  if (!Array.isArray(firstFrame) || firstFrame.length === 0) {
    throw new Error('DTW requires every frame to be a nonempty numeric vector.')
  }
  const dimension = firstFrame.length
  const validateSequence = (sequence: number[][], label: string) => {
    sequence.forEach((frame, index) => {
      if (!Array.isArray(frame) || frame.length === 0) {
        throw new Error(`DTW ${label} frame ${index + 1} must be a nonempty numeric vector.`)
      }
      if (frame.length !== dimension) {
        throw new Error(`DTW requires every frame in both sequences to have width ${dimension}.`)
      }
      if (frame.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
        throw new Error(`DTW ${label} frame ${index + 1} must contain only finite numbers.`)
      }
    })
  }
  validateSequence(sequenceA, 'sequence A')
  validateSequence(sequenceB, 'sequence B')

  const componentComparisons = sequenceA.length * sequenceB.length * dimension
  if (!Number.isSafeInteger(componentComparisons) || componentComparisons > workLimit) {
    throw new Error(`DTW exceeds the ${workLimit.toLocaleString('en-US')} component-comparison safeguard.`)
  }

  const matrix = Array.from({ length: sequenceA.length }, () => (
    Array<number>(sequenceB.length).fill(Number.POSITIVE_INFINITY)
  ))
  for (let i = 0; i < sequenceA.length; i += 1) {
    for (let j = 0; j < sequenceB.length; j += 1) {
      let localCost = 0
      for (let component = 0; component < dimension; component += 1) {
        localCost += Math.abs(sequenceA[i][component] - sequenceB[j][component])
      }
      const predecessor = i === 0 && j === 0
        ? 0
        : Math.min(
          i > 0 ? matrix[i - 1][j] : Number.POSITIVE_INFINITY,
          j > 0 ? matrix[i][j - 1] : Number.POSITIVE_INFINITY,
          i > 0 && j > 0 ? matrix[i - 1][j - 1] : Number.POSITIVE_INFINITY,
        )
      const accumulatedCost = localCost + predecessor
      if (!Number.isFinite(accumulatedCost)) {
        throw new Error('DTW accumulated cost is not finite.')
      }
      matrix[i][j] = accumulatedCost
    }
  }
  return matrix[sequenceA.length - 1][sequenceB.length - 1]
}

export const timeSeriesToolsLibrary: ExternalFunctionLibrary = {
  id: 'time-series-tools',
  name: 'Time Series Tools',
  description: 'Reusable operations for comparing ordered numeric sequences over time.',
  functions: [{ metadata: dtwDistanceMetadata, implementation: dtwDistance }],
}
