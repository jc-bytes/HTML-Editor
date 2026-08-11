import { externalLibraries as builtInExternalLibraries } from '../external-libraries/catalog'
import {
  restorePersistedImportedLibrary,
  type PersistedImportedLibrary,
} from '../external-libraries/imported-library'
import { createExternalFunctionRegistry } from '../runtime/functions/external-function-registry'
import { createExternalLibraryRegistry } from '../runtime/functions/external-library-registry'

export type ProjectExternalLibrariesResult =
  | { ok: true; value: ProjectExternalLibraries }
  | { error: string; ok: false }

export interface ProjectExternalLibraries {
  imported: PersistedImportedLibrary[]
  listFunctionRegistrations: ReturnType<typeof createExternalLibraryRegistry>['listFunctionRegistrations']
  listLibraries: ReturnType<typeof createExternalLibraryRegistry>['listLibraries']
}

export function createProjectExternalLibraries(
  imported: PersistedImportedLibrary[] = [],
): ProjectExternalLibrariesResult {
  const functionRegistry = createExternalFunctionRegistry()
  const libraryRegistry = createExternalLibraryRegistry(functionRegistry)

  for (const library of builtInExternalLibraries) {
    const result = libraryRegistry.registerLibrary(library, 'built-in')
    if (!result.ok) return result
  }

  for (const persisted of imported) {
    const restored = restorePersistedImportedLibrary(persisted)
    if (!restored.ok) return restored
    const result = libraryRegistry.registerLibrary(restored.value, 'imported')
    if (!result.ok) return result
  }

  return {
    ok: true,
    value: {
      imported: imported.map((library) => ({
        ...library,
        functions: library.functions.map((definition) => ({
          ...definition,
          metadata: {
            ...definition.metadata,
            inputs: definition.metadata.inputs.map((input) => ({ ...input })),
            output: { ...definition.metadata.output },
          },
        })),
      })),
      listFunctionRegistrations: libraryRegistry.listFunctionRegistrations,
      listLibraries: libraryRegistry.listLibraries,
    },
  }
}
