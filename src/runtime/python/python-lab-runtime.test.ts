import { describe, expect, it } from 'vitest'
import {
  createPythonLabConfigSource,
  createPythonLabRuntimeSource,
  createPythonWorkerSource,
  PYODIDE_ASSET_FILES,
  PYODIDE_VERSION,
} from './python-lab-runtime'

describe('Python Lab runtime', () => {
  it('uses a self-contained module worker with Pyodide, NumPy, progress, and JSON publication', () => {
    const worker = createPythonWorkerSource()
    expect(() => new Function(worker)).not.toThrow()
    expect(worker).toContain('loadPyodide')
    expect(worker).toContain('loadPackage("numpy")')
    expect(worker).toContain('Cargando Python')
    expect(worker).toContain('action === "prepare"')
    expect(worker).toContain('kind: "ready"')
    expect(worker).toContain('_builder_result_json')
    expect(worker).toContain('_builder_raw_runtime_values.items()')
    expect(worker).toContain('runtime_values[_builder_name] = _builder_converted')
    expect(worker).toContain('if not video_results:')
    expect(worker).toContain('except TypeError')
    expect(worker).not.toContain('cdn.jsdelivr.net')
    expect(createPythonLabRuntimeSource()).toContain('new Worker')
    expect(createPythonLabRuntimeSource()).toContain('action: "prepare"')
    expect(createPythonLabRuntimeSource()).not.toContain('límite de inicio')
    expect(createPythonLabRuntimeSource()).toContain('El código Python excedió el límite de ejecución de 30 segundos.')
  })

  it('ships pinned local runtime assets without preinstalling Python functions', () => {
    expect(PYODIDE_VERSION).toBe('314.0.3')
    expect(PYODIDE_ASSET_FILES).toContain('pyodide.asm.wasm')
    expect(PYODIDE_ASSET_FILES.some((file) => file.startsWith('numpy-2.4.3'))).toBe(true)
    const config = createPythonLabConfigSource('./pyodide/')
    expect(config).toContain('"libraries":[]')
    expect(config).not.toContain('landmark_to_array')
  })

  it('discovers published inputs that do not have annotated producer markup', () => {
    const source = createPythonLabRuntimeSource()

    expect(source).toContain('store.list().forEach')
    expect(source).toContain('sourceId === currentSourceId')
    expect(source).toContain('values[outputId] = stored.value')
  })

})
