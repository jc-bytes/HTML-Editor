import { afterEach, describe, expect, it } from 'vitest'
import {
  RUNTIME_VALUE_EVENT,
  RUNTIME_VALUE_STORE_PROPERTY,
} from './runtime-value-contract'
import { createRuntimeValueStoreSource, installRuntimeValueStore } from './runtime-value-store'

describe('runtime value store', () => {
  afterEach(() => { delete window.__BUILDER_RUNTIME_VALUE_STORE__ })

  it('retains generic producer values without an external-function runtime', () => {
    const { store, dispose } = installRuntimeValueStore(window, document)
    const value = [{ leftHandLandmarks: [[{ x: 1, y: 2, z: 3 }]] }]
    expect(store.publish({ sourceId: 'analyze-reference', outputId: 'landmark-frames', type: 'json', value })).toBe(true)
    expect(store.has('analyze-reference::landmark-frames')).toBe(true)
    expect(store.list()).toEqual([{
      sourceId: 'analyze-reference', outputId: 'landmark-frames', type: 'json',
    }])
    dispose()
  })

  it('clones values at the consumer boundary and replaces repeated publications', () => {
    const { store, dispose } = installRuntimeValueStore(window, document)
    const producerValue = [[1, 2], [3, 4]]
    store.publish({ sourceId: 'source', outputId: 'result', type: 'number[][]', value: producerValue })
    const first = store.read('source::result')!
    ;(first.value as number[][])[0][0] = 999
    expect(producerValue[0][0]).toBe(1)
    expect(store.read('source::result')?.value).toEqual([[1, 2], [3, 4]])
    store.publish({ sourceId: 'source', outputId: 'result', type: 'number[][]', value: [[8]] })
    expect(store.read('source::result')?.value).toEqual([[8]])
    dispose()
  })

  it('accepts legacy runtime-value events and serializes standalone installation', () => {
    const { store, dispose } = installRuntimeValueStore(window, document)
    document.dispatchEvent(new CustomEvent(RUNTIME_VALUE_EVENT, { detail: {
      sourceId: 'legacy', outputId: 'landmark-frames', type: 'json', value: [{ t: 0 }],
    } }))
    expect(store.read('legacy::landmark-frames')?.value).toEqual([{ t: 0 }])
    dispose()

    const runtimeWindow = {} as Window
    const runtimeDocument = document.implementation.createHTMLDocument('Runtime values')
    expect(() => new Function('window', 'document', createRuntimeValueStoreSource())(
      runtimeWindow,
      runtimeDocument,
    )).not.toThrow()
    expect((runtimeWindow as Window & Record<string, unknown>)[RUNTIME_VALUE_STORE_PROPERTY]).toBeTruthy()
  })
})
