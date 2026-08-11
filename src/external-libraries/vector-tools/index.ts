import type { ExternalFunctionMetadata } from '../../runtime/functions/external-function-registry'
import type { ExternalFunctionLibrary } from '../../runtime/functions/external-library-registry'

export const connectionVectorsMetadata: ExternalFunctionMetadata = {
  id: 'connection-vectors',
  name: 'Connection Vectors',
  description: 'Groups each flat coordinate row into points, then subtracts point a from point b for every supplied connection [a,b]. For XYZ points, each result is [bx-ax, by-ay, bz-az].',
  inputs: [
    { defaultValue: [[0, 0, 0, 1, 0, 0]], name: 'point-frames', type: 'number[][]' },
    { defaultValue: [[0, 1]], name: 'connections', type: 'number[][]' },
  ],
  output: { type: 'json' },
}

export function connectionVectors(pointFrames: number[][], connections: number[][]) {
  if (!Array.isArray(pointFrames) || !Array.isArray(connections)) {
    throw new Error('Point frames and connections must be matrices.')
  }
  connections.forEach((connection, index) => {
    if (!Array.isArray(connection) || connection.length !== 2
      || !Number.isInteger(connection[0]) || connection[0] < 0
      || !Number.isInteger(connection[1]) || connection[1] < 0) {
      throw new Error(`Connection ${index + 1} must contain two non-negative integer indexes.`)
    }
  })
  return pointFrames.map((frame, frameIndex) => {
    if (!Array.isArray(frame) || frame.length === 0 || frame.length % 3 !== 0
      || frame.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error(`Point frame ${frameIndex + 1} must contain finite XYZ triples.`)
    }
    const points = Array.from({ length: frame.length / 3 }, (_, index) => frame.slice(index * 3, index * 3 + 3))
    return connections.map(([from, to], connectionIndex) => {
      if (!points[from] || !points[to]) {
        throw new Error(`Connection ${connectionIndex + 1} is outside point frame ${frameIndex + 1}.`)
      }
      return [
        points[to][0] - points[from][0],
        points[to][1] - points[from][1],
        points[to][2] - points[from][2],
      ]
    })
  })
}

export const orderedPairwiseAnglesMetadata: ExternalFunctionMetadata = {
  id: 'ordered-pairwise-angles',
  name: 'Ordered Pairwise Angles',
  description: 'For every vector frame, calculates the radian angle of every vector with every vector in row-major order. It uses dot product divided by both vector magnitudes, then Math.acos; equal or non-finite cases become 0.',
  inputs: [{ name: 'vector-frames', type: 'json' }],
  output: { type: 'number[][]' },
}

export function orderedPairwiseAngles(vectorFrames: unknown): number[][] {
  if (!Array.isArray(vectorFrames)) throw new Error('Expected an array of vector frames.')
  return vectorFrames.map((frame, frameIndex) => {
    if (!Array.isArray(frame)) throw new Error(`Vector frame ${frameIndex + 1} is invalid.`)
    let dimension: number | undefined
    const vectors = frame.map((vector, vectorIndex) => {
      if (!Array.isArray(vector) || vector.length === 0
        || vector.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
        throw new Error(`Vector ${vectorIndex + 1} in frame ${frameIndex + 1} is invalid.`)
      }
      dimension ??= vector.length
      if (vector.length !== dimension) throw new Error(`Vectors in frame ${frameIndex + 1} must have equal dimensions.`)
      return vector as number[]
    })
    const features: number[] = []
    vectors.forEach((from) => {
      vectors.forEach((to) => {
        if (from.every((value, index) => value === to[index])) {
          features.push(0)
          return
        }
        const dot = from.reduce((total, value, index) => total + value * to[index], 0)
        const denominator = Math.hypot(...from) * Math.hypot(...to)
        const angle = Math.acos(dot / denominator)
        features.push(Number.isFinite(angle) ? angle : 0)
      })
    })
    return features
  })
}

export const manhattanVectorDistanceMetadata: ExternalFunctionMetadata = {
  id: 'manhattan-vector-distance',
  name: 'Manhattan Vector Distance',
  description: 'Adds the absolute differences between corresponding values in two equal-length vectors. This is also called L1 distance.',
  inputs: [
    { defaultValue: [1, 2, 3], name: 'left', type: 'number[]' },
    { defaultValue: [4, 2, 1], name: 'right', type: 'number[]' },
  ],
  output: { type: 'number' },
}

export function manhattanVectorDistance(left: number[], right: number[]): number {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || right.length === 0) {
    throw new Error('Manhattan distance requires two nonempty vectors.')
  }
  if (left.length !== right.length) {
    throw new Error('Manhattan distance requires vectors with the same length.')
  }
  return left.reduce((total, value, index) => {
    const other = right[index]
    if (!Number.isFinite(value) || !Number.isFinite(other)) {
      throw new Error('Manhattan distance requires finite numeric vectors.')
    }
    return total + Math.abs(value - other)
  }, 0)
}

export const vectorToolsLibrary: ExternalFunctionLibrary = {
  id: 'vector-tools',
  name: 'Vector Tools',
  description: 'Reusable vector and collection operations. They do not know whether their numbers represent hand landmarks or another dataset.',
  functions: [
    { metadata: connectionVectorsMetadata, implementation: connectionVectors },
    { metadata: orderedPairwiseAnglesMetadata, implementation: orderedPairwiseAngles },
    { metadata: manhattanVectorDistanceMetadata, implementation: manhattanVectorDistance },
  ],
}
