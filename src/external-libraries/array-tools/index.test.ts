import { describe, expect, it } from 'vitest'
import { createExternalFunctionRegistry } from '../../runtime/functions/external-function-registry'
import { createExternalLibraryRegistry } from '../../runtime/functions/external-library-registry'
import { arrayToolsLibrary } from '.'

describe('Array Tools', () => {
  it('registers and executes transparent array operations through the generic registry', async () => {
    const functions = createExternalFunctionRegistry()
    const libraries = createExternalLibraryRegistry(functions)
    expect(libraries.registerLibrary(arrayToolsLibrary).ok).toBe(true)

    await expect(functions.executeRegisteredFunction('flatten', { matrix: [[1, 2], [3, 4]] }))
      .resolves.toEqual({ ok: true, value: [1, 2, 3, 4] })
    await expect(functions.executeRegisteredFunction('sum', { values: [1, 2, 3, 4] }))
      .resolves.toEqual({ ok: true, value: 10 })
    await expect(functions.executeRegisteredFunction('first-row', { matrix: [[1, 2], [3, 4]] }))
      .resolves.toEqual({ ok: true, value: [1, 2] })
  })
})
