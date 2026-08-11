import type { ExternalFunctionMetadata } from '../../runtime/functions/external-function-registry'
import type { ExternalFunctionLibrary } from '../../runtime/functions/external-library-registry'

// Frozen from MediaPipe HAND_CONNECTIONS. The upstream Python constant is a
// frozenset, so this project records an explicit order for deterministic data.
export const MEDIAPIPE_HAND_CONNECTIONS = [
  [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
  [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [17, 18], [18, 19], [19, 20],
] as const

export const mediaPipeHandConnectionsMetadata: ExternalFunctionMetadata = {
  id: 'mediapipe-hand-connections',
  name: 'MediaPipe Hand Connections',
  description: 'Provides MediaPipe’s 21 hand landmark index pairs in the deterministic order documented by this project. It supplies connection data; it does not calculate vectors or angles.',
  inputs: [],
  output: { type: 'number[][]' },
}

export function mediaPipeHandConnections() {
  return [
    [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
    [1, 2], [2, 3], [3, 4],
    [5, 6], [6, 7], [7, 8],
    [9, 10], [10, 11], [11, 12],
    [13, 14], [14, 15], [15, 16],
    [17, 18], [18, 19], [19, 20],
  ]
}

export const mediaPipeDataLibrary: ExternalFunctionLibrary = {
  id: 'mediapipe-data',
  name: 'MediaPipe Data',
  description: 'Documented MediaPipe landmark topology exposed as reusable data sources; no comparison method is performed here.',
  functions: [{
    metadata: mediaPipeHandConnectionsMetadata,
    implementation: mediaPipeHandConnections,
  }],
}
