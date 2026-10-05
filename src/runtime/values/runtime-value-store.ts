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

export function installRuntimeValueDisplays(
  runtimeWindow: Window = window,
  runtimeDocument: Document = document,
  propertyName = RUNTIME_VALUE_STORE_PROPERTY,
  eventName = RUNTIME_VALUE_EVENT,
) {
  const bindingAttribute = 'data-builder-variable-binding'
  const labelAttribute = 'data-builder-variable-label'
  const formatAttribute = 'data-builder-variable-format'
  const maxAttribute = 'data-builder-variable-max'
  const roots = [...runtimeDocument.querySelectorAll<HTMLElement>('[data-builder-variable-display]')]
  const store = (runtimeWindow as Window & Record<string, unknown>)[propertyName] as RuntimeValueStore | undefined
  const parseBinding = (value: string) => {
    try {
      const parsed = JSON.parse(value) as { key?: unknown; path?: unknown }
      return typeof parsed.key === 'string' && Array.isArray(parsed.path)
        ? { key: parsed.key, path: parsed.path.filter((part): part is string => typeof part === 'string') }
        : undefined
    } catch {
      return undefined
    }
  }
  const nestedValue = (value: unknown, path: string[]) => path.reduce<unknown>((current, part) => (
    current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined
  ), value)
  const numberText = (value: number) => new Intl.NumberFormat('es-PA', {
    maximumFractionDigits: 4,
  }).format(value)
  const displayText = (value: unknown, format: string) => {
    if (format === 'number' || typeof value === 'number') {
      const number = Number(value)
      return Number.isFinite(number) ? numberText(number) : '—'
    }
    if (format === 'json') {
      const serialized = JSON.stringify(value, null, 2)
      return serialized && serialized.length > 1_200 ? `${serialized.slice(0, 1_200)}…` : serialized || '—'
    }
    if (typeof value === 'string') return value
    if (typeof value === 'boolean') return value ? 'Sí' : 'No'
    if (Array.isArray(value)) return `${value.length} valor(es)`
    if (value && typeof value === 'object') return `${Object.keys(value).length} campo(s)`
    return value == null ? '—' : String(value)
  }
  const render = (root: HTMLElement) => {
    const label = root.querySelector<HTMLElement>('[data-builder-variable-display-label]')
    const output = root.querySelector<HTMLElement>('[data-builder-variable-display-value]')
    const progress = root.querySelector<HTMLProgressElement>('[data-builder-variable-display-progress]')
    const status = root.querySelector<HTMLElement>('[data-builder-variable-display-status]')
    if (label) label.textContent = root.getAttribute(labelAttribute)?.trim() || 'Variable'
    const binding = parseBinding(root.getAttribute(bindingAttribute) || '')
    if (!binding) {
      if (output) output.textContent = 'Selecciona una variable'
      if (progress) progress.hidden = true
      if (status) status.textContent = 'Configura esta tarjeta en el editor.'
      return
    }
    const stored = store?.read(binding.key)
    if (!stored) {
      if (output) output.textContent = 'Esperando datos…'
      if (progress) progress.hidden = true
      if (status) status.textContent = 'La fuente todavía no ha publicado un valor.'
      return
    }
    const value = nestedValue(stored.value, binding.path)
    const format = root.getAttribute(formatAttribute) || 'auto'
    if (output) output.textContent = displayText(value, format)
    if (progress) {
      const maximum = Number(root.getAttribute(maxAttribute) || 1)
      const number = Number(value)
      progress.hidden = format !== 'progress' || !Number.isFinite(number)
      progress.max = Number.isFinite(maximum) && maximum > 0 ? maximum : 1
      progress.value = Number.isFinite(number) ? Math.max(0, number) : 0
    }
    if (status) status.textContent = value === undefined
      ? 'La variable seleccionada no existe en la salida.'
      : 'Actualizado en vivo.'
  }
  const renderAll = () => roots.forEach(render)
  const handleValue = () => renderAll()
  runtimeDocument.addEventListener(eventName, handleValue)
  renderAll()
  return { dispose: () => runtimeDocument.removeEventListener(eventName, handleValue), renderAll }
}

export function createRuntimeValueStoreSource() {
  return `(${installRuntimeValueStore.toString()})(window, document, ${JSON.stringify(RUNTIME_VALUE_STORE_PROPERTY)}, ${JSON.stringify(RUNTIME_VALUE_EVENT)});\n(${installRuntimeValueDisplays.toString()})(window, document, ${JSON.stringify(RUNTIME_VALUE_STORE_PROPERTY)}, ${JSON.stringify(RUNTIME_VALUE_EVENT)});`
}
