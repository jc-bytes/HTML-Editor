import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProjectBundle } from '../core/project'
import { addProjectFunctionRuntime } from '../editor/export-project'
import { buildPreviewDocument } from '../modules/preview/buildPreviewDocument'
import { ZipProjectExporter } from '../modules/exporter'
import { PYODIDE_ASSET_FILES } from '../runtime/python/python-lab-runtime'

const encoder = new TextEncoder()

function fixture(): ProjectBundle {
  return addProjectFunctionRuntime({
    manifest: {
      connections: [], elementOverrides: [], name: 'Python fixture', startPage: 'home', version: 2,
      pages: [{ file: 'pages/home.html', id: 'home', name: 'Home' }],
    },
    files: [{
      mediaType: 'text/html', path: 'pages/home.html', bytes: encoder.encode(`<!doctype html><html><body>
        <section data-builder-python-lab data-builder-python-lab-code="result = 42"
          data-builder-runtime-source-id="python-lab-source" data-builder-runtime-output-id="variables">
          <textarea data-builder-python-lab-code-editor></textarea><button data-builder-python-lab-run>Run</button>
          <button data-builder-python-lab-cancel></button><tbody data-builder-python-lab-variable-rows></tbody>
          <p data-builder-python-lab-status></p>
        </section></body></html>`),
    }],
  }, [])
}

afterEach(() => vi.unstubAllGlobals())

describe('Python Lab preview and export', () => {
  it('injects a local Pyodide configuration and Python runtime into Test Preview', () => {
    const bundle = fixture()
    const preview = buildPreviewDocument(bundle, bundle.manifest.pages[0], { mode: 'test' })
    expect(preview).toContain('data-builder-python-config="true"')
    expect(preview).toContain('data-builder-python-runtime="true"')
    expect(preview).toContain('/pyodide/')
    expect(preview).not.toContain('cdn.jsdelivr.net')
  })

  it('exports the worker runtime and every local Pyodide/NumPy asset', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })))
    const archive = await JSZip.loadAsync(await (await new ZipProjectExporter().export(fixture())).arrayBuffer())
    expect(archive.file('builder-runtime/python.js')).not.toBeNull()
    PYODIDE_ASSET_FILES.forEach((asset) => expect(archive.file(`pyodide/${asset}`)).not.toBeNull())
    const page = await archive.file('pages/home.html')!.async('string')
    expect(page).toContain('builder-runtime/python.js')
    expect(page).toContain('new URL("../pyodide/",document.baseURI).href')
  })
})
