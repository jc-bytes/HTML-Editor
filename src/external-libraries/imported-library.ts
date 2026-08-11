import {
  type ExternalFunctionImplementation,
  type ExternalFunctionMetadata,
} from '../runtime/functions/external-function-registry'
import {
  type ExternalFunctionLibrary,
  createExternalLibraryRegistry,
} from '../runtime/functions/external-library-registry'
import {
  restoreExternalFunctionImplementation,
  serializeExternalFunctionImplementation,
} from '../runtime/functions/external-function-source'

export const MAX_IMPORTED_LIBRARY_BYTES = 256 * 1024

export interface PreparedImportedLibraryFile {
  fileName: string
  source: string
}

export interface PersistedImportedFunction {
  implementationSource: string
  metadata: ExternalFunctionMetadata
}

export interface PersistedImportedLibrary {
  description: string
  fileName: string
  formatVersion: 1
  functions: PersistedImportedFunction[]
  id: string
  name: string
}

export type ImportedLibraryResult<T> =
  | { ok: true; value: T }
  | { error: string; ok: false }

export type ImportedLibraryModuleLoader = (source: string) => Promise<unknown>

export async function prepareImportedLibraryFile(
  file: File,
): Promise<ImportedLibraryResult<PreparedImportedLibraryFile>> {
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.js')) {
    return { error: 'Selecciona un archivo JavaScript con extensión .js.', ok: false }
  }
  if (file.size <= 0 || file.size > MAX_IMPORTED_LIBRARY_BYTES) {
    return {
      error: `La biblioteca debe pesar entre 1 byte y ${MAX_IMPORTED_LIBRARY_BYTES / 1024} KiB.`,
      ok: false,
    }
  }
  try {
    const source = await file.text()
    if (!/\bexport\s+default\b/.test(source)) {
      return { error: 'La biblioteca debe exportar una definición predeterminada.', ok: false }
    }
    if (/(?:^|[;\n\r])\s*import\s*(?:\(|["'{*]|[A-Za-z_$])/m.test(source)
      || /\bimport\s*\(/.test(source)) {
      return { error: 'La biblioteca debe ser independiente y no puede importar otros módulos.', ok: false }
    }
    return { ok: true, value: { fileName: file.name, source } }
  } catch {
    return { error: 'No se pudo leer el archivo JavaScript.', ok: false }
  }
}

async function browserModuleLoader(source: string) {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
  try {
    return await import(/* @vite-ignore */ url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function persistedMetadata(metadata: ExternalFunctionMetadata): ExternalFunctionMetadata {
  const { library: _library, ...definition } = metadata
  return {
    ...definition,
    inputs: definition.inputs.map((input) => ({ ...input })),
    output: { ...definition.output },
  }
}

export function normalizeImportedLibrary(
  fileName: string,
  candidate: unknown,
): ImportedLibraryResult<PersistedImportedLibrary> {
  const library = candidate as ExternalFunctionLibrary
  const validationRegistry = createExternalLibraryRegistry()
  const validation = validationRegistry.registerLibrary(library, 'imported')
  if (!validation.ok) return validation

  const registered = validationRegistry.findLibrary(library.id)!
  const functions: PersistedImportedFunction[] = []
  for (const registration of registered.functions) {
    const serialized = serializeExternalFunctionImplementation(registration.implementation)
    if (!serialized.ok) return { error: `${registration.metadata.name}: ${serialized.error}`, ok: false }
    functions.push({
      implementationSource: serialized.value as string,
      metadata: persistedMetadata(registration.metadata),
    })
  }

  return {
    ok: true,
    value: {
      description: registered.description,
      fileName,
      formatVersion: 1,
      functions,
      id: registered.id,
      name: registered.name,
    },
  }
}

export async function loadPreparedImportedLibrary(
  prepared: PreparedImportedLibraryFile,
  loader: ImportedLibraryModuleLoader = browserModuleLoader,
): Promise<ImportedLibraryResult<PersistedImportedLibrary>> {
  try {
    const loaded = await loader(prepared.source) as { default?: unknown } | null
    if (!loaded || !Object.prototype.hasOwnProperty.call(loaded, 'default')) {
      return { error: 'La biblioteca no proporcionó una exportación predeterminada.', ok: false }
    }
    return normalizeImportedLibrary(prepared.fileName, loaded.default)
  } catch (cause) {
    return {
      error: cause instanceof Error
        ? `No se pudo cargar la biblioteca: ${cause.message}`
        : 'No se pudo cargar la biblioteca.',
      ok: false,
    }
  }
}

export function restorePersistedImportedLibrary(
  persisted: PersistedImportedLibrary,
): ImportedLibraryResult<ExternalFunctionLibrary> {
  if (!persisted || typeof persisted !== 'object' || persisted.formatVersion !== 1
    || typeof persisted.fileName !== 'string' || !persisted.fileName
    || !Array.isArray(persisted.functions)) {
    return { error: 'La biblioteca guardada no tiene un formato compatible.', ok: false }
  }

  const functions: Array<{
    implementation: ExternalFunctionImplementation
    metadata: ExternalFunctionMetadata
  }> = []
  for (const definition of persisted.functions) {
    if (!definition || typeof definition !== 'object') {
      return { error: 'Una función guardada no es válida.', ok: false }
    }
    const restored = restoreExternalFunctionImplementation(definition.implementationSource)
    if (!restored.ok) return restored
    functions.push({
      implementation: restored.value as ExternalFunctionImplementation,
      metadata: definition.metadata,
    })
  }

  return {
    ok: true,
    value: {
      description: persisted.description,
      functions,
      id: persisted.id,
      name: persisted.name,
    },
  }
}
