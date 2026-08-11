import {
  createExternalFunctionRegistry,
  type ExternalFunctionLibraryIdentity,
  type ExternalFunctionLibraryProvenance,
  type ExternalFunctionRegistration,
  type ExternalFunctionResult,
} from './external-function-registry'

export interface ExternalFunctionLibrary extends ExternalFunctionLibraryIdentity {
  functions: ExternalFunctionRegistration[]
}

export interface RegisteredExternalFunctionLibrary extends ExternalFunctionLibraryIdentity {
  functions: ExternalFunctionRegistration[]
  provenance: ExternalFunctionLibraryProvenance
}

type ExternalFunctionRegistry = ReturnType<typeof createExternalFunctionRegistry>

export function createExternalLibraryRegistry(
  functionRegistry: ExternalFunctionRegistry = createExternalFunctionRegistry(),
) {
  const libraries = new Map<string, RegisteredExternalFunctionLibrary>()
  const identifier = /^[a-z][a-z0-9-]*$/

  const registerLibrary = (
    library: ExternalFunctionLibrary,
    provenance: ExternalFunctionLibraryProvenance = 'built-in',
  ): ExternalFunctionResult => {
    if (!library || typeof library !== 'object') {
      return { error: 'La definición de la biblioteca no es válida.', ok: false }
    }
    if (typeof library.id !== 'string' || !identifier.test(library.id)) {
      return { error: 'La biblioteca necesita un identificador válido.', ok: false }
    }
    if (typeof library.name !== 'string' || !library.name.trim()) {
      return { error: 'La biblioteca necesita un nombre.', ok: false }
    }
    if (typeof library.description !== 'string') {
      return { error: 'La descripción de la biblioteca no es válida.', ok: false }
    }
    if (!Array.isArray(library.functions) || library.functions.length === 0) {
      return { error: 'La biblioteca necesita al menos una función.', ok: false }
    }
    if (libraries.has(library.id)) {
      return { error: `La biblioteca “${library.id}” ya está registrada.`, ok: false }
    }

    const libraryIdentity: ExternalFunctionLibraryIdentity = {
      description: library.description,
      id: library.id,
      name: library.name,
      provenance,
    }
    const registrations = library.functions.map((registration) => ({
      implementation: registration?.implementation,
      metadata: registration?.metadata && {
        ...registration.metadata,
        inputs: registration.metadata.inputs?.map((input) => ({ ...input })),
        library: libraryIdentity,
        output: registration.metadata.output && { ...registration.metadata.output },
      },
    })) as ExternalFunctionRegistration[]

    const preflightRegistry = createExternalFunctionRegistry()
    for (const registration of registrations) {
      if (functionRegistry.findFunction(registration.metadata?.id ?? '')) {
        return {
          error: `La función “${registration.metadata.id}” ya está registrada.`,
          ok: false,
        }
      }
      const result = preflightRegistry.registerFunction(
        registration.metadata,
        registration.implementation,
      )
      if (!result.ok) return result
    }

    for (const registration of registrations) {
      const result = functionRegistry.registerFunction(
        registration.metadata,
        registration.implementation,
      )
      if (!result.ok) return result
    }

    const registeredLibrary: RegisteredExternalFunctionLibrary = {
      ...libraryIdentity,
      functions: registrations,
      provenance,
    }
    libraries.set(library.id, registeredLibrary)
    return { ok: true, value: registeredLibrary }
  }

  const findLibrary = (id: string) => libraries.get(id)
  const listLibraries = () => [...libraries.values()]
  const listFunctionRegistrations = () => listLibraries().flatMap((library) => library.functions)

  return {
    findLibrary,
    functionRegistry,
    listFunctionRegistrations,
    listLibraries,
    registerLibrary,
  }
}
