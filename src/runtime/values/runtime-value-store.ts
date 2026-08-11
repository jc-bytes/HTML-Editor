import {
  RUNTIME_VALUE_EVENT,
  RUNTIME_VALUE_STORE_PROPERTY,
  type RuntimeValueEventDetail,
  type RuntimeValueStore,
  type StoredRuntimeValue,
} from './runtime-value-contract'

declare global {
  interface Window {
    __BUILDER_RUNTIME_VALUE_STORE__?: RuntimeValueStore
  }
}

export function installRuntimeValueStore(
  runtimeWindow: Window = window,
  runtimeDocument: Document = document,
  propertyName = RUNTIME_VALUE_STORE_PROPERTY,
  eventName = RUNTIME_VALUE_EVENT,
) {
  const host = runtimeWindow as Window & Record<string, unknown>
  const existing = host[propertyName] as (Partial<RuntimeValueStore> & { __document?: Document }) | undefined
  if (typeof existing?.publish === 'function' && typeof existing.read === 'function'
    && existing.__document === runtimeDocument) {
    return { dispose: () => undefined, store: existing as RuntimeValueStore }
  }

  const values = new Map<string, StoredRuntimeValue>()
  const cloneStructuredValue = (value: unknown) => {
    if (typeof runtimeWindow.structuredClone === 'function') return runtimeWindow.structuredClone(value)
    const active = new Set<object>()
    const clone = (current: unknown): unknown => {
      if (current === null || typeof current === 'string' || typeof current === 'boolean') return current
      if (typeof current === 'number') {
        if (!Number.isFinite(current)) throw new Error('Los datos contienen un número no finito.')
        return current
      }
      if (!current || typeof current !== 'object') throw new Error('Los datos no son compatibles con JSON.')
      if (active.has(current)) throw new Error('Los datos contienen una referencia circular.')
      active.add(current)
      let copied: unknown
      if (Array.isArray(current)) {
        copied = current.map((item) => clone(item))
      } else {
        const prototype = Object.getPrototypeOf(current)
        if (prototype !== Object.prototype && prototype !== null) {
          throw new Error('Los datos contienen un objeto no compatible con JSON.')
        }
        const record: Record<string, unknown> = {}
        Object.keys(current).forEach((key) => { record[key] = clone((current as Record<string, unknown>)[key]) })
        copied = record
      }
      active.delete(current)
      return copied
    }
    return clone(value)
  }
  const validDetail = (detail: unknown): detail is RuntimeValueEventDetail => Boolean(
    detail && typeof detail === 'object'
      && typeof (detail as RuntimeValueEventDetail).sourceId === 'string'
      && (detail as RuntimeValueEventDetail).sourceId
      && typeof (detail as RuntimeValueEventDetail).outputId === 'string'
      && (detail as RuntimeValueEventDetail).outputId
      && ['number', 'number[]', 'number[][]', 'json'].includes((detail as RuntimeValueEventDetail).type),
  )
  const retain = (detail: RuntimeValueEventDetail) => {
    if (!validDetail(detail)) return false
    values.set(`${detail.sourceId}::${detail.outputId}`, {
      outputId: detail.outputId,
      sourceId: detail.sourceId,
      type: detail.type,
      value: detail.value,
    })
    return true
  }
  const store: RuntimeValueStore = {
    has: (key) => values.has(key),
    list: () => [...values.values()].map(({ outputId, sourceId, type }) => ({ outputId, sourceId, type })),
    publish: (detail) => {
      if (!retain(detail)) return false
      runtimeDocument.dispatchEvent(new CustomEvent(eventName, { detail }))
      return true
    },
    read: (key) => {
      const retained = values.get(key)
      if (!retained) return undefined
      return { ...retained, value: cloneStructuredValue(retained.value) }
    },
  }
  Object.defineProperty(store, '__document', { value: runtimeDocument })
  const handleLegacyPublication = (event: Event) => {
    retain((event as CustomEvent<RuntimeValueEventDetail>).detail)
  }
  Object.defineProperty(host, propertyName, { configurable: true, value: store })
  runtimeDocument.addEventListener(eventName, handleLegacyPublication)
  return {
    store,
    dispose: () => {
      runtimeDocument.removeEventListener(eventName, handleLegacyPublication)
      if (host[propertyName] === store) delete host[propertyName]
    },
  }
}

export function createRuntimeValueStoreSource() {
  return `(${installRuntimeValueStore.toString()})(window, document, ${JSON.stringify(RUNTIME_VALUE_STORE_PROPERTY)}, ${JSON.stringify(RUNTIME_VALUE_EVENT)});`
}
