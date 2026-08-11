import { createExternalFunctionRegistry } from '../runtime/functions/external-function-registry'
import { createExternalLibraryRegistry } from '../runtime/functions/external-library-registry'
import { mathToolsLibrary } from './math-tools'
import { arrayToolsLibrary } from './array-tools'
import { sequenceToolsLibrary } from './sequence-tools'
import { signMovementToolsLibrary } from './sign-movement-tools'
import { mediaPipeDataLibrary } from './mediapipe-data'
import { vectorToolsLibrary } from './vector-tools'
import { timeSeriesToolsLibrary } from './time-series-tools'

export const externalLibraries = [
  mathToolsLibrary,
  arrayToolsLibrary,
  sequenceToolsLibrary,
  signMovementToolsLibrary,
  mediaPipeDataLibrary,
  vectorToolsLibrary,
  timeSeriesToolsLibrary,
]

const functionRegistry = createExternalFunctionRegistry()
const libraryRegistry = createExternalLibraryRegistry(functionRegistry)

externalLibraries.forEach((library) => {
  const result = libraryRegistry.registerLibrary(library)
  if (!result.ok) throw new Error(result.error)
})

export const registeredExternalLibraries = libraryRegistry.listLibraries()
export const externalLibraryFunctionRegistrations = libraryRegistry.listFunctionRegistrations()
