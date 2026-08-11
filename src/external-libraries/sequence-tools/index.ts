import type {
  ExternalFunctionJsonValue,
  ExternalFunctionMetadata,
} from '../../runtime/functions/external-function-registry'
import type { ExternalFunctionLibrary } from '../../runtime/functions/external-library-registry'

export const countFramesMetadata: ExternalFunctionMetadata = {
  id: 'count-frames',
  name: 'Count Frames',
  description: 'Returns the number of frames in a structured sequence.',
  inputs: [{ name: 'sequence', type: 'json' }],
  output: { type: 'number' },
}

export function countFrames(sequence: ExternalFunctionJsonValue) {
  if (!Array.isArray(sequence)) throw new Error('Expected a sequence of frames.')
  return sequence.length
}

export const sequenceToolsLibrary: ExternalFunctionLibrary = {
  id: 'sequence-tools',
  name: 'Sequence Tools',
  description: 'Transparent operations for structured runtime sequences.',
  functions: [{ metadata: countFramesMetadata, implementation: countFrames }],
}
