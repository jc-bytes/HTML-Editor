import { describe, expect, it } from 'vitest'
import { doubleNumber, doubleNumberMetadata } from '../../external-functions/double-number'
import { average, averageMetadata, mathToolsLibrary } from '../../external-libraries/math-tools'
import { createExternalFunctionRegistry } from './external-function-registry'
import { createExternalLibraryRegistry, type ExternalFunctionLibrary } from './external-library-registry'

describe('external library registry', () => {
  it('registers one library atomically and exposes all functions through the existing registry', async () => {
    const functionRegistry = createExternalFunctionRegistry()
    const libraries = createExternalLibraryRegistry(functionRegistry)

    const result = libraries.registerLibrary(mathToolsLibrary)

    expect(result).toEqual(expect.objectContaining({ ok: true }))
    expect(libraries.findLibrary('math-tools')?.functions).toHaveLength(3)
    expect(libraries.listFunctionRegistrations()).toHaveLength(3)
    expect(functionRegistry.findFunction('average')).toMatchObject({
      id: 'average',
      library: { id: 'math-tools', name: 'Math Tools' },
    })
    await expect(functionRegistry.executeRegisteredFunction('double-number', { value: 5 }))
      .resolves.toEqual({ ok: true, value: 10 })
    await expect(functionRegistry.executeRegisteredFunction('average', { left: 4, right: 8 }))
      .resolves.toEqual({ ok: true, value: 6 })
    await expect(functionRegistry.executeRegisteredFunction('maximum', { left: 4, right: 8 }))
      .resolves.toEqual({ ok: true, value: 8 })
  })

  it('rejects duplicate library IDs without silently replacing the first library', () => {
    const libraries = createExternalLibraryRegistry()
    expect(libraries.registerLibrary(mathToolsLibrary).ok).toBe(true)

    const duplicate = libraries.registerLibrary({ ...mathToolsLibrary, name: 'Replacement' })

    expect(duplicate).toEqual(expect.objectContaining({ ok: false }))
    expect(libraries.findLibrary('math-tools')?.name).toBe('Math Tools')
    expect(libraries.listLibraries()).toHaveLength(1)
  })

  it('rejects duplicate and pre-existing function IDs before registering any library functions', () => {
    const existingFunctions = createExternalFunctionRegistry()
    existingFunctions.registerFunction(doubleNumberMetadata, doubleNumber)
    const conflictingLibraries = createExternalLibraryRegistry(existingFunctions)

    expect(conflictingLibraries.registerLibrary(mathToolsLibrary)).toEqual(expect.objectContaining({ ok: false }))
    expect(conflictingLibraries.listLibraries()).toHaveLength(0)
    expect(existingFunctions.findFunction('average')).toBeUndefined()

    const duplicateFunctions: ExternalFunctionLibrary = {
      id: 'duplicate-tools',
      name: 'Duplicate Tools',
      description: 'Invalid duplicate function proof.',
      functions: [
        { metadata: averageMetadata, implementation: average },
        { metadata: { ...averageMetadata, name: 'Another Average' }, implementation: average },
      ],
    }
    const freshFunctions = createExternalFunctionRegistry()
    const freshLibraries = createExternalLibraryRegistry(freshFunctions)
    expect(freshLibraries.registerLibrary(duplicateFunctions)).toEqual(expect.objectContaining({ ok: false }))
    expect(freshFunctions.findFunction('average')).toBeUndefined()
  })

  it('preserves metadata without mutating the trusted library definition', () => {
    const libraries = createExternalLibraryRegistry()
    libraries.registerLibrary(mathToolsLibrary)

    const registered = libraries.findLibrary('math-tools')!
    expect(registered.description).toBe(mathToolsLibrary.description)
    expect(registered.functions[1].metadata).toMatchObject({
      description: averageMetadata.description,
      inputs: averageMetadata.inputs,
      library: {
        description: mathToolsLibrary.description,
        id: mathToolsLibrary.id,
        name: mathToolsLibrary.name,
      },
      output: averageMetadata.output,
    })
    expect(averageMetadata.library).toBeUndefined()
  })
})
