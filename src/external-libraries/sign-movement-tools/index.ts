import type { ExternalFunctionMetadata } from '../../runtime/functions/external-function-registry'
import type { ExternalFunctionLibrary } from '../../runtime/functions/external-library-registry'

const REFERENCE_DESCRIPTION = 'Adapted from gabguerin/Sign-Language-Recognition--MediaPipe-DTW at commit 68948d87b1e57c3af41f5116728b3d264d6830d0.'

export const extractLeftHandXyzMetadata: ExternalFunctionMetadata = {
  id: 'extract-left-hand-xyz',
  name: 'Extract Left Hand XYZ',
  description: `Selects left-hand x, y, and z coordinates from every landmark frame; an absent hand becomes 63 zeros. ${REFERENCE_DESCRIPTION}`,
  inputs: [{ name: 'landmark-frames', type: 'json' }],
  output: { type: 'number[][]' },
}

export function extractLeftHandXyz(landmarkFrames: unknown): number[][] {
  if (!Array.isArray(landmarkFrames)) throw new Error('Expected an array of landmark frames.')
  return landmarkFrames.map((frame, frameIndex) => {
    if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
      throw new Error(`Frame ${frameIndex + 1} is not a valid landmark frame.`)
    }
    const groups = (frame as Record<string, unknown>).leftHandLandmarks
    if (!Array.isArray(groups)) throw new Error(`Frame ${frameIndex + 1} has invalid left-hand landmarks.`)
    if (groups.length === 0) return Array(63).fill(0)
    if (groups.length !== 1 || !Array.isArray(groups[0])) {
      throw new Error(`Frame ${frameIndex + 1} has an invalid left-hand landmark group.`)
    }
    const hand = groups[0]
    if (hand.length === 0) return Array(63).fill(0)
    if (hand.length !== 21) throw new Error(`Frame ${frameIndex + 1} must contain exactly 21 left-hand landmarks.`)
    const coordinates: number[] = []
    hand.forEach((landmark, landmarkIndex) => {
      if (!landmark || typeof landmark !== 'object' || Array.isArray(landmark)) {
        throw new Error(`Frame ${frameIndex + 1}, left landmark ${landmarkIndex} is invalid.`)
      }
      const point = landmark as Record<string, unknown>
      if (typeof point.x !== 'number' || !Number.isFinite(point.x)
        || typeof point.y !== 'number' || !Number.isFinite(point.y)
        || typeof point.z !== 'number' || !Number.isFinite(point.z)) {
        throw new Error(`Frame ${frameIndex + 1}, left landmark ${landmarkIndex} requires finite x, y, and z values.`)
      }
      coordinates.push(point.x, point.y, point.z)
    })
    return coordinates
  })
}

export const extractRightHandXyzMetadata: ExternalFunctionMetadata = {
  id: 'extract-right-hand-xyz',
  name: 'Extract Right Hand XYZ',
  description: `Selects right-hand x, y, and z coordinates from every landmark frame; an absent hand becomes 63 zeros. ${REFERENCE_DESCRIPTION}`,
  inputs: [{ name: 'landmark-frames', type: 'json' }],
  output: { type: 'number[][]' },
}

export function extractRightHandXyz(landmarkFrames: unknown): number[][] {
  if (!Array.isArray(landmarkFrames)) throw new Error('Expected an array of landmark frames.')
  return landmarkFrames.map((frame, frameIndex) => {
    if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
      throw new Error(`Frame ${frameIndex + 1} is not a valid landmark frame.`)
    }
    const groups = (frame as Record<string, unknown>).rightHandLandmarks
    if (!Array.isArray(groups)) throw new Error(`Frame ${frameIndex + 1} has invalid right-hand landmarks.`)
    if (groups.length === 0) return Array(63).fill(0)
    if (groups.length !== 1 || !Array.isArray(groups[0])) {
      throw new Error(`Frame ${frameIndex + 1} has an invalid right-hand landmark group.`)
    }
    const hand = groups[0]
    if (hand.length === 0) return Array(63).fill(0)
    if (hand.length !== 21) throw new Error(`Frame ${frameIndex + 1} must contain exactly 21 right-hand landmarks.`)
    const coordinates: number[] = []
    hand.forEach((landmark, landmarkIndex) => {
      if (!landmark || typeof landmark !== 'object' || Array.isArray(landmark)) {
        throw new Error(`Frame ${frameIndex + 1}, right landmark ${landmarkIndex} is invalid.`)
      }
      const point = landmark as Record<string, unknown>
      if (typeof point.x !== 'number' || !Number.isFinite(point.x)
        || typeof point.y !== 'number' || !Number.isFinite(point.y)
        || typeof point.z !== 'number' || !Number.isFinite(point.z)) {
        throw new Error(`Frame ${frameIndex + 1}, right landmark ${landmarkIndex} requires finite x, y, and z values.`)
      }
      coordinates.push(point.x, point.y, point.z)
    })
    return coordinates
  })
}

export const signMovementToolsLibrary: ExternalFunctionLibrary = {
  id: 'sign-movement-tools',
  name: 'Sign Movement Tools',
  description: 'Prepares MediaPipe hand landmarks as transparent movement features adapted from the referenced MIT-licensed project; it does not evaluate sign correctness.',
  functions: [
    { metadata: extractLeftHandXyzMetadata, implementation: extractLeftHandXyz },
    { metadata: extractRightHandXyzMetadata, implementation: extractRightHandXyz },
  ],
}
