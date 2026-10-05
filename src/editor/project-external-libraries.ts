import { externalLibraries as builtInExternalLibraries } from '../external-libraries/catalog'
import {
  normalizePersistedRawJavaScriptLibrary,
  restorePersistedImportedLibrary,
  type PersistedImportedLibrary,
  type RegisteredRawJavaScriptLibrary,
} from '../external-libraries/imported-library'
import { createExternalFunctionRegistry } from '../runtime/functions/external-function-registry'
import { externalFunctionJavascriptName } from '../runtime/functions/js-lab-runtime'
import {
  createExternalLibraryRegistry,
  type RegisteredExternalFunctionLibrary,
} from '../runtime/functions/external-library-registry'

export type ProjectExternalLibrariesResult =
  | { ok: true; value: ProjectExternalLibraries }
  | { error: string; ok: false }

export interface ProjectExternalLibraries {
  imported: PersistedImportedLibrary[]
  listFunctionRegistrations: ReturnType<typeof createExternalLibraryRegistry>['listFunctionRegistrations']
  listLibraries: () => Array<RegisteredExternalFunctionLibrary | RegisteredRawJavaScriptLibrary>
  listRawLibraries: () => RegisteredRawJavaScriptLibrary[]
}

export function createProjectExternalLibraries(
  imported: PersistedImportedLibrary[] = [],
): ProjectExternalLibrariesResult {
  const functionRegistry = createExternalFunctionRegistry()
  const libraryRegistry = createExternalLibraryRegistry(functionRegistry)
  const rawLibraries: RegisteredRawJavaScriptLibrary[] = []

  for (const library of builtInExternalLibraries) {
    const result = libraryRegistry.registerLibrary(library, 'built-in')
    if (!result.ok) return result
  }

  for (const persisted of imported) {
    if (persisted.kind === 'raw-global') {
      const restored = normalizePersistedRawJavaScriptLibrary(persisted)
      if (!restored.ok) return restored
      if (libraryRegistry.findLibrary(restored.value.id)
        || rawLibraries.some((library) => library.id === restored.value.id)) {
        return { error: `La biblioteca “${restored.value.id}” ya está registrada.`, ok: false }
      }
      rawLibraries.push(restored.value)
      continue
    }
    const restored = restorePersistedImportedLibrary(persisted)
    if (!restored.ok) return restored
    if (rawLibraries.some((library) => library.id === restored.value.id)) {
      return { error: `La biblioteca “${restored.value.id}” ya está registrada.`, ok: false }
    }
    const result = libraryRegistry.registerLibrary(restored.value, 'imported')
    if (!result.ok) return result
  }

  const runtimeNames = libraryRegistry.listFunctionRegistrations()
    .map(({ metadata }) => externalFunctionJavascriptName(metadata.id))
  for (const rawLibrary of rawLibraries) {
    for (const api of rawLibrary.globalApis) {
      if (runtimeNames.includes(api.name)) {
        return { error: `La API global “${api.name}” entra en conflicto con una función registrada.`, ok: false }
      }
      if (rawLibraries.some((candidate) => candidate !== rawLibrary
        && candidate.globalApis.some((candidateApi) => candidateApi.name === api.name))) {
        return { error: `La API global “${api.name}” ya está registrada.`, ok: false }
      }
    }
  }

  return {
    ok: true,
    value: {
      imported: imported.map((library) => ({
        ...library,
        ...(library.globalApis ? { globalApis: library.globalApis.map((api) => ({ ...api })) } : {}),
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
      listLibraries: () => [...libraryRegistry.listLibraries(), ...rawLibraries],
      listRawLibraries: () => rawLibraries.map((library) => ({
        ...library,
        globalApis: library.globalApis.map((api) => ({ ...api })),
      })),
    },
  }
}
