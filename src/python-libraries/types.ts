export interface PythonFunctionMetadata {
  description: string
  id: string
  inputs: string
  name: string
  outputType: 'number' | 'number[]' | 'number[][]' | 'json'
  usage: string
}

export interface RegisteredPythonLibrary {
  description: string
  functions: PythonFunctionMetadata[]
  id: string
  language: 'python'
  moduleName: string
  name: string
  provenance: 'built-in' | 'imported'
  source: string
}

export type PersistedPythonLibrary = RegisteredPythonLibrary

export type LibraryCatalogEntry =
  | (import('../runtime/functions/external-library-registry').RegisteredExternalFunctionLibrary & {
    language: 'javascript'
  })
  | RegisteredPythonLibrary
