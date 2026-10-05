import type { RegisteredPythonLibrary } from '../../python-libraries/types'
import {
  RUNTIME_OUTPUT_ID_ATTRIBUTE,
  RUNTIME_SOURCE_ID_ATTRIBUTE,
  RUNTIME_VALUE_EVENT,
  RUNTIME_VALUE_STORE_PROPERTY,
} from '../values/runtime-value-contract'

export const PYODIDE_VERSION = '314.0.3'
export const PYODIDE_NUMPY_WHEEL = 'numpy-2.4.3-cp314-cp314-pyemscripten_2026_0_wasm32.whl'
export const PYODIDE_ASSET_FILES = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
  PYODIDE_NUMPY_WHEEL,
] as const
export const MAX_PYTHON_LAB_CODE_CHARACTERS = 100_000
export const PYTHON_LAB_TIMEOUT_MS = 30_000

declare global {
  interface Window {
    __BUILDER_PYTHON_LAB__?: {
      assetsBase: string
      libraries: RegisteredPythonLibrary[]
    }
  }
}

export function createPythonWorkerSource() {
  const adapterSource = String.raw`
import json
from types import SimpleNamespace

def _builder_landmark_list(groups):
    points = groups[0] if isinstance(groups, list) and groups and isinstance(groups[0], list) else groups
    if not points:
        return None
    return SimpleNamespace(landmark=[SimpleNamespace(
        x=point.get("x"), y=point.get("y"), z=point.get("z", 0)
    ) for point in points])

def _builder_video_results(frames):
    return [SimpleNamespace(
        pose_landmarks=_builder_landmark_list(frame.get("poseLandmarks")),
        left_hand_landmarks=_builder_landmark_list(frame.get("leftHandLandmarks")),
        right_hand_landmarks=_builder_landmark_list(frame.get("rightHandLandmarks"))
    ) for frame in frames]

_builder_raw_runtime_values = json.loads(__builder_runtime_values_json)
runtime_values = {}
video_results = []
for _builder_name, _builder_value in _builder_raw_runtime_values.items():
    if isinstance(_builder_value, list) and (_builder_value == [] or isinstance(_builder_value[0], dict)):
        if _builder_value == [] or "poseLandmarks" in _builder_value[0]:
            _builder_converted = _builder_video_results(_builder_value)
            runtime_values[_builder_name] = _builder_converted
            if not video_results:
                video_results = _builder_converted
            continue
    runtime_values[_builder_name] = _builder_value
`
  const collectSource = String.raw`
import inspect as _builder_inspect
import json as _builder_json
import math as _builder_math

def _builder_jsonable(value):
    if hasattr(value, "tolist"):
        value = value.tolist()
    if value is None or isinstance(value, (str, bool)):
        return value
    if isinstance(value, (int, float)):
        if not _builder_math.isfinite(value):
            raise ValueError("Las variables contienen un número no finito.")
        return value
    if isinstance(value, (list, tuple)):
        return [_builder_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _builder_jsonable(item) for key, item in value.items()}
    raise TypeError(f"La variable contiene un valor no publicable: {type(value).__name__}.")

_builder_published = {}
for _builder_name, _builder_value in list(globals().items()):
    if _builder_name.startswith("_") or _builder_name in {"runtime_values", "video_results"}:
        continue
    if _builder_inspect.ismodule(_builder_value) or _builder_inspect.isfunction(_builder_value) or _builder_inspect.isclass(_builder_value):
        continue
    try:
        _builder_published[_builder_name] = _builder_jsonable(_builder_value)
    except TypeError:
        # Loop variables such as MediaPipe SimpleNamespace objects are useful
        # while executing but are not truthful JSON outputs. Publish the
        # student's JSON-compatible values instead of failing the whole lab.
        continue
_builder_result_json = _builder_json.dumps(_builder_published, allow_nan=False)
`
  return String.raw`
let pyodide;
const postStatus = (message) => self.postMessage({ kind: "status", message });
const adapter = ${JSON.stringify(adapterSource)};
const collect = ${JSON.stringify(collectSource)};
self.onmessage = async (event) => {
  const { action, assetsBase, code, libraries = [], runtimeValues = {} } = event.data;
  try {
    if (!pyodide) {
      postStatus("Cargando Python…");
      const module = await import(new URL("pyodide.mjs", assetsBase).href);
      pyodide = await module.loadPyodide({ indexURL: assetsBase });
      postStatus("Cargando NumPy…");
      await pyodide.loadPackage("numpy");
    }
    if (action === "prepare") {
      self.postMessage({ kind: "ready" });
      return;
    }
    libraries.forEach((library) => {
      pyodide.FS.writeFile("/home/pyodide/" + library.moduleName + ".py", library.source);
    });
    pyodide.globals.set("__builder_runtime_values_json", JSON.stringify(runtimeValues));
    postStatus("Preparando datos…");
    pyodide.runPython(adapter);
    postStatus("Ejecutando Python…");
    for (const library of libraries) {
      await pyodide.runPythonAsync(library.source);
    }
    await pyodide.runPythonAsync(code);
    postStatus("Publicando variables…");
    pyodide.runPython(collect);
    const result = JSON.parse(pyodide.globals.get("_builder_result_json"));
    self.postMessage({ kind: "result", value: result });
  } catch (error) {
    self.postMessage({ kind: "error", message: error instanceof Error ? error.message : String(error) });
  }
};`
}

function installPythonLabRuntime(
  runtimeWindow: Window,
  runtimeDocument: Document,
  workerSource: string,
  maxCodeCharacters: number,
  timeoutMs: number,
  runtimeValueStoreProperty: string,
  runtimeValueEventName: string,
  runtimeSourceIdAttribute: string,
  runtimeOutputIdAttribute: string,
) {
  const config = runtimeWindow.__BUILDER_PYTHON_LAB__
  if (!config) return () => undefined
  const store = (runtimeWindow as Window & Record<string, unknown>)[runtimeValueStoreProperty] as {
    list(): Array<{ outputId: string; sourceId: string; type: string }>
    publish(detail: { outputId: string; sourceId: string; type: 'json'; value: unknown }): boolean
    read(key: string): { type: string; value: unknown } | undefined
  } | undefined
  const workers = new Map<HTMLElement, {
    announce: boolean
    ready: boolean
    running: boolean
    timer?: number
    url: string
    worker: Worker
  }>()

  const setStatus = (root: HTMLElement, message: string, error = false) => {
    const status = root.querySelector<HTMLElement>('[data-builder-python-lab-status]')
    if (status) {
      status.textContent = message
      status.setAttribute('role', error ? 'alert' : 'status')
    }
  }
  const preview = (value: unknown) => Array.isArray(value)
    ? `${value.length} valor(es)`
    : value && typeof value === 'object' ? `${Object.keys(value).length} campo(s)` : String(value)
  const renderVariables = (root: HTMLElement) => {
    const body = root.querySelector<HTMLTableSectionElement>('[data-builder-python-lab-variable-rows]')
    if (!body || !store) return
    const rows: Array<[string, string, string]> = []
    runtimeDocument.querySelectorAll<HTMLElement>(`[${runtimeSourceIdAttribute}][${runtimeOutputIdAttribute}]`).forEach((producer) => {
      if (producer === root) return
      const sourceId = producer.getAttribute(runtimeSourceIdAttribute)
      const outputId = producer.getAttribute(runtimeOutputIdAttribute)
      if (!sourceId || !outputId) return
      const stored = store.read(`${sourceId}::${outputId}`)
      rows.push([`runtime_values[${JSON.stringify(outputId)}]`, stored?.type ?? 'json', stored ? preview(stored.value) : 'Esperando datos…'])
    })
    const currentSourceId = root.getAttribute(runtimeSourceIdAttribute)
    store.list().forEach(({ outputId, sourceId, type }) => {
      if (sourceId === currentSourceId
        || rows.some(([name]) => name === `runtime_values[${JSON.stringify(outputId)}]`)) return
      const stored = store.read(`${sourceId}::${outputId}`)
      if (stored) rows.push([`runtime_values[${JSON.stringify(outputId)}]`, type, preview(stored.value)])
    })
    const sourceId = currentSourceId
    const outputId = root.getAttribute(runtimeOutputIdAttribute) || 'variables'
    const published = sourceId ? store.read(`${sourceId}::${outputId}`)?.value : undefined
    if (published && typeof published === 'object' && !Array.isArray(published)) {
      Object.entries(published as Record<string, unknown>).forEach(([name, value]) => rows.push([name, Array.isArray(value) ? 'array' : typeof value, preview(value)]))
    }
    body.replaceChildren()
    ;(rows.length ? rows : [['—', '—', 'Ejecuta o analiza datos para ver variables.']]).forEach((row) => {
      const tr = runtimeDocument.createElement('tr')
      row.forEach((text) => { const td = runtimeDocument.createElement('td'); td.textContent = text; td.style.padding = '.48rem .4rem'; tr.append(td) })
      body.append(tr)
    })
  }
  const runtimeValuesFor = (root: HTMLElement) => {
    if (!store) return {}
    const values: Record<string, unknown> = {}
    runtimeDocument.querySelectorAll<HTMLElement>(`[${runtimeSourceIdAttribute}][${runtimeOutputIdAttribute}]`).forEach((producer) => {
      if (producer === root) return
      const sourceId = producer.getAttribute(runtimeSourceIdAttribute)
      const outputId = producer.getAttribute(runtimeOutputIdAttribute)
      if (!sourceId || !outputId) return
      const stored = store.read(`${sourceId}::${outputId}`)
      if (stored) values[outputId] = stored.value
    })
    const currentSourceId = root.getAttribute(runtimeSourceIdAttribute)
    store.list().forEach(({ outputId, sourceId }) => {
      if (sourceId === currentSourceId || outputId in values) return
      const stored = store.read(`${sourceId}::${outputId}`)
      if (stored) values[outputId] = stored.value
    })
    return values
  }
  const setRunButton = (root: HTMLElement, label: string, disabled: boolean) => {
    const button = root.querySelector<HTMLButtonElement>('[data-builder-python-lab-run]')
    if (!button) return
    button.textContent = label
    button.disabled = disabled
  }
  const disposeWorker = (root: HTMLElement) => {
    const active = workers.get(root)
    active?.worker.terminate()
    if (active?.timer !== undefined) runtimeWindow.clearTimeout(active.timer)
    if (active) URL.revokeObjectURL(active.url)
    workers.delete(root)
  }
  const prepare = (root: HTMLElement, announce = true) => {
    if (workers.has(root)) return
    const blob = new Blob([workerSource], { type: 'text/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    const worker = new Worker(workerUrl, { type: 'module' })
    const state = { announce, ready: false, running: false, url: workerUrl, worker }
    workers.set(root, state)
    setRunButton(root, 'Preparando Python…', true)
    root.querySelector<HTMLButtonElement>('[data-builder-python-lab-cancel]')?.removeAttribute('hidden')
    if (announce) setStatus(root, 'Iniciando Python y NumPy…')
    worker.onmessage = (event: MessageEvent<{ kind: string; message?: string; value?: unknown }>) => {
      const active = workers.get(root)
      if (!active || active.worker !== worker) return
      if (event.data.kind === 'status') {
        if (event.data.message === 'Ejecutando Python…') {
          if (active.timer !== undefined) runtimeWindow.clearTimeout(active.timer)
          active.timer = runtimeWindow.setTimeout(
            () => stop(root, 'El código Python excedió el límite de ejecución de 30 segundos.'),
            timeoutMs,
          )
        }
        if (active.announce || active.running) setStatus(root, event.data.message ?? '')
        return
      }
      if (event.data.kind === 'ready') {
        active.ready = true
        setRunButton(root, 'Ejecutar Python Lab →', false)
        root.querySelector<HTMLButtonElement>('[data-builder-python-lab-cancel]')?.setAttribute('hidden', '')
        if (active.announce) setStatus(root, 'Python y NumPy listos.')
        return
      }
      if (active.timer !== undefined) runtimeWindow.clearTimeout(active.timer)
      const wasRunning = active.running
      disposeWorker(root)
      setRunButton(root, 'Ejecutar Python Lab →', false)
      root.querySelector<HTMLButtonElement>('[data-builder-python-lab-cancel]')?.setAttribute('hidden', '')
      if (event.data.kind === 'error') {
        setStatus(root, event.data.message ?? 'Python no pudo ejecutarse.', true)
      } else if (wasRunning) {
        const sourceId = root.getAttribute(runtimeSourceIdAttribute)
        if (sourceId && store) store.publish({ sourceId, outputId: root.getAttribute(runtimeOutputIdAttribute) || 'variables', type: 'json', value: event.data.value })
        renderVariables(root)
        setStatus(root, 'Variables Python publicadas.')
      }
      if (wasRunning) prepare(root, false)
    }
    worker.postMessage({ action: 'prepare', assetsBase: config.assetsBase })
  }
  const stop = (root: HTMLElement, message = 'Ejecución cancelada.') => {
    disposeWorker(root)
    root.querySelector<HTMLButtonElement>('[data-builder-python-lab-cancel]')?.setAttribute('hidden', '')
    setRunButton(root, 'Preparar Python', false)
    setStatus(root, message)
  }
  const execute = (root: HTMLElement) => {
    const editor = root.querySelector<HTMLTextAreaElement>('[data-builder-python-lab-code-editor]')
    const code = editor?.value ?? root.getAttribute('data-builder-python-lab-code') ?? ''
    if (!code.trim()) return setStatus(root, 'Python Lab necesita código.', true)
    if (code.length > maxCodeCharacters) return setStatus(root, `El código supera ${maxCodeCharacters} caracteres.`, true)
    let pageLibraries = []
    try {
      const parsed = JSON.parse(root.getAttribute('data-builder-python-lab-libraries') || '[]')
      if (Array.isArray(parsed)) pageLibraries = parsed
    } catch {
      return setStatus(root, 'Las dependencias de Python Lab están dañadas.', true)
    }
    const active = workers.get(root)
    if (!active) {
      prepare(root)
      return
    }
    if (!active.ready) return setStatus(root, 'Python y NumPy todavía se están preparando…')
    if (active.running) return
    active.running = true
    active.announce = true
    setRunButton(root, 'Ejecutando Python…', true)
    root.querySelector<HTMLButtonElement>('[data-builder-python-lab-cancel]')?.removeAttribute('hidden')
    const libraries = [...config.libraries, ...pageLibraries].filter((library, index, all) => (
      all.findIndex((candidate) => candidate.id === library.id) === index
    ))
    active.worker.postMessage({ action: 'execute', assetsBase: config.assetsBase, code, libraries, runtimeValues: runtimeValuesFor(root) })
  }
  const click = (event: Event) => {
    const target = event.target as Element | null
    const root = target?.closest<HTMLElement>('[data-builder-python-lab]')
    if (!root) return
    if (target?.closest('[data-builder-python-lab-run]')) { event.preventDefault(); execute(root) }
    if (target?.closest('[data-builder-python-lab-cancel]')) { event.preventDefault(); stop(root) }
  }
  const input = (event: Event) => {
    const target = event.target as HTMLTextAreaElement | null
    const root = target?.closest<HTMLElement>('[data-builder-python-lab]')
    if (root && target?.hasAttribute('data-builder-python-lab-code-editor')) root.setAttribute('data-builder-python-lab-code', target.value)
  }
  runtimeDocument.querySelectorAll<HTMLElement>('[data-builder-python-lab]').forEach((root) => {
    const editor = root.querySelector<HTMLTextAreaElement>('[data-builder-python-lab-code-editor]')
    if (editor) editor.value = root.getAttribute('data-builder-python-lab-code') ?? ''
    renderVariables(root)
    prepare(root)
  })
  runtimeDocument.addEventListener('click', click, true)
  runtimeDocument.addEventListener('input', input, true)
  runtimeDocument.addEventListener(runtimeValueEventName, () => runtimeDocument.querySelectorAll<HTMLElement>('[data-builder-python-lab]').forEach(renderVariables))
  return () => { runtimeDocument.removeEventListener('click', click, true); runtimeDocument.removeEventListener('input', input, true); workers.forEach(({ timer, url, worker }) => { if (timer !== undefined) runtimeWindow.clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(url) }) }
}

export function createPythonLabConfigSource(assetsBase: string, libraries: RegisteredPythonLibrary[] = []) {
  return `window.__BUILDER_PYTHON_LAB__=${JSON.stringify({ assetsBase, libraries }).replaceAll('<', '\\u003c')};`
}

export function createPythonLabRuntimeSource() {
  return `(${installPythonLabRuntime.toString()})(window,document,${JSON.stringify(createPythonWorkerSource())},${MAX_PYTHON_LAB_CODE_CHARACTERS},${PYTHON_LAB_TIMEOUT_MS},${JSON.stringify(RUNTIME_VALUE_STORE_PROPERTY)},${JSON.stringify(RUNTIME_VALUE_EVENT)},${JSON.stringify(RUNTIME_SOURCE_ID_ATTRIBUTE)},${JSON.stringify(RUNTIME_OUTPUT_ID_ATTRIBUTE)});`
}
