import { describe, expect, it } from 'vitest'
import { createExternalFunctionRegistry } from '../../runtime/functions/external-function-registry'
import { createExternalLibraryRegistry } from '../../runtime/functions/external-library-registry'
import { sequenceToolsLibrary } from '.'

describe('Sequence Tools library', () => {
  it('counts structured frames through the generic library registry', async () => {
    const functions = createExternalFunctionRegistry()
    const libraries = createExternalLibraryRegistry(functions)
    expect(libraries.registerLibrary(sequenceToolsLibrary).ok).toBe(true)
    await expect(functions.executeRegisteredFunction('count-frames', {
      sequence: [{ t: 0, poseLandmarks: [] }, { t: 100, poseLandmarks: [] }],
    })).resolves.toEqual({ ok: true, value: 2 })
  })
})
