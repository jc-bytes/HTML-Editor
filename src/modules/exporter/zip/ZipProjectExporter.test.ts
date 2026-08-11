import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import type { ProjectBundle } from '../../../core/project'
import { createFunctionBlockRuntimeSource } from '../../../runtime/functions/function-block-runtime'
import type { ExternalFunctionRegistration } from '../../../runtime/functions/external-function-registry'
import { dtwDistance, dtwDistanceMetadata } from '../../../external-libraries/time-series-tools'
import { ZipProjectImporter } from '../../importer'
import { ZipProjectExporter } from './ZipProjectExporter'

const encoder = new TextEncoder()

const bundle: ProjectBundle = {
  manifest: {
    version: 2,
    elementOverrides: [{
      pageId: 'home',
      elementId: 'home::main:1/button:1',
      content: { text: 'Start practice' },
      styles: {
        desktop: {
          base: { backgroundColor: '#176f70' },
          hover: { transform: 'translateY(-2px)' },
        },
      },
    }],
    name: 'Export fixture',
    startPage: 'home',
    pages: [
      { id: 'home', name: 'Home', file: 'pages/home.html' },
      { id: 'practice', name: 'Practice', file: 'pages/practice.html' },
    ],
    connections: [{
      id: 'connection-1',
      sourcePage: 'home',
      elementId: 'home::main:1/button:1',
      event: 'click',
      action: 'navigate',
      targetPage: 'practice',
    }],
  },
  files: [
    {
      path: 'pages/home.html',
      mediaType: 'text/html',
      bytes: encoder.encode('<html><body><main><button>Practice</button></main></body></html>'),
    },
    {
      path: 'pages/practice.html',
      mediaType: 'text/html',
      bytes: encoder.encode('<html><body><button>Back</button></body></html>'),
    },
    {
      path: 'styles/app.css',
      mediaType: 'text/css',
      bytes: encoder.encode('button { color: teal; }'),
    },
  ],
}

describe('ZipProjectExporter', () => {
  it('creates a deployable ZIP with the manifest and standalone runtime', async () => {
    const originalHome = bundle.files[0].bytes
    const exported = await new ZipProjectExporter().export(bundle)
    const archive = await JSZip.loadAsync(await exported.arrayBuffer())
    const home = await archive.file('pages/home.html')!.async('string')
    const runtime = await archive.file('builder-runtime/navigation.js')!.async('string')
    const overrides = await archive.file('builder-runtime/overrides.css')!.async('string')
    const index = await archive.file('index.html')!.async('string')

    expect(home).toContain('data-builder-config="true"')
    expect(home).toContain('src="../builder-runtime/navigation.js"')
    expect(home).toContain('practice.html')
    expect(runtime).toContain('builderElementId')
    expect(home).toContain('Start practice')
    expect(home).toContain('data-builder-overrides="true"')
    expect(overrides).toContain('background-color:#176f70')
    expect(overrides).toContain(':hover')
    expect(index).toContain('pages/home.html')
    expect(bundle.files[0].bytes).toBe(originalHome)
  })

  it('can be reimported without losing connections or duplicating runtime tags', async () => {
    const exporter = new ZipProjectExporter()
    const importer = new ZipProjectImporter()
    const firstImport = await importer.import(await exporter.export(bundle))
    const secondArchive = await JSZip.loadAsync(
      await (await exporter.export(firstImport)).arrayBuffer(),
    )
    const home = await secondArchive.file('pages/home.html')!.async('string')

    expect(firstImport.manifest).toEqual(bundle.manifest)
    expect(home.match(/data-builder-config=/g)).toHaveLength(1)
    expect(home.match(/data-builder-runtime=/g)).toHaveLength(1)
  })

  it('uses an imported root index page instead of overwriting it with a redirect', async () => {
    const rootBundle: ProjectBundle = {
      manifest: {
        version: 2,
        elementOverrides: [],
        name: 'Root page fixture',
        startPage: 'index',
        pages: [{ id: 'index', name: 'Home', file: 'index.html' }],
        connections: [],
      },
      files: [{
        path: 'index.html',
        mediaType: 'text/html',
        bytes: encoder.encode('<html><body><main>Figma home</main></body></html>'),
      }],
    }
    const archive = await JSZip.loadAsync(
      await (await new ZipProjectExporter().export(rootBundle)).arrayBuffer(),
    )
    const index = await archive.file('index.html')!.async('string')

    expect(index).toContain('Figma home')
    expect(index).toContain('src="builder-runtime/navigation.js"')
    expect(index).not.toContain('window.location.replace')
    expect(archive.file('builder-runtime/functions.js')).toBeNull()
  })

  it('exports the standalone external function runtime only for function pages', async () => {
    const functionBundle: ProjectBundle = {
      manifest: {
        version: 2,
        elementOverrides: [],
        name: 'Function export',
        startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }],
        connections: [],
      },
      files: [{
        path: 'pages/home.html',
        mediaType: 'text/html',
        bytes: encoder.encode('<html><body><form data-builder-function-id="double-number"></form></body></html>'),
      }],
    }
    const archive = await JSZip.loadAsync(
      await (await new ZipProjectExporter().export(functionBundle)).arrayBuffer(),
    )
    const home = await archive.file('pages/home.html')!.async('string')
    const runtime = await archive.file('builder-runtime/functions.js')!.async('string')

    expect(home).toContain('data-builder-function-runtime="true"')
    expect(home).toContain('src="../builder-runtime/functions.js"')
    expect(runtime).toContain('double-number')
    expect(runtime).toContain('average')
    expect(runtime).toContain('maximum')
    expect(runtime).toContain('executeRegisteredFunction')
  })

  it('exports a bundled imported-function runtime without the editor or original file', async () => {
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'multiply', name: 'Multiply', description: 'Multiplies.',
        inputs: [{ name: 'left', type: 'number' }, { name: 'right', type: 'number' }],
        output: { type: 'number' },
      },
      implementation: function multiply(left: number, right: number) { return left * right },
    }]
    const customRuntime = createFunctionBlockRuntimeSource(registrations)
    const functionBundle: ProjectBundle = {
      manifest: {
        version: 2, elementOverrides: [], name: 'Imported function export', startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }], connections: [],
      },
      files: [{
        path: 'pages/home.html', mediaType: 'text/html',
        bytes: encoder.encode(`<html><body><form data-builder-function-id="multiply">
          <input data-builder-function-input="left" value="6">
          <input data-builder-function-input="right" value="7">
          <output data-builder-function-output></output><p data-builder-function-status></p>
        </form></body></html>`),
      }, {
        path: 'builder-runtime/functions.js', mediaType: 'text/javascript',
        bytes: encoder.encode(customRuntime),
      }],
    }
    const archive = await JSZip.loadAsync(
      await (await new ZipProjectExporter().export(functionBundle)).arrayBuffer(),
    )
    const runtime = await archive.file('builder-runtime/functions.js')!.async('string')
    const home = await archive.file('pages/home.html')!.async('string')

    expect(runtime).toContain('multiply')
    expect(runtime).not.toContain('double-number')
    expect(home).toContain('data-builder-function-runtime="true"')
    expect([...archive.file(/simple-tools\.js$/)]).toHaveLength(0)
    const exportedDocument = new DOMParser().parseFromString(home, 'text/html')
    new Function('window', 'document', runtime)(window, exportedDocument)
    exportedDocument.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(exportedDocument.querySelector('[data-builder-function-output]')?.textContent).toBe('42')
  })

  it('exports an imported array function that runs without the editor or original file', async () => {
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'export-first-row', name: 'Export First Row', description: 'Returns the first row.',
        inputs: [{ name: 'matrix', type: 'number[][]' }], output: { type: 'number[]' },
      },
      implementation: function exportFirstRow(matrix: number[][]) { return matrix[0] ?? [] },
    }]
    const functionBundle: ProjectBundle = {
      manifest: {
        version: 2, elementOverrides: [], name: 'Array function export', startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }], connections: [],
      },
      files: [{
        path: 'pages/home.html', mediaType: 'text/html',
        bytes: encoder.encode(`<html><body><form data-builder-function-id="export-first-row">
          <textarea data-builder-function-input="matrix" data-builder-function-value-type="number[][]">[[7,8],[9,10]]</textarea>
          <output data-builder-function-output></output><p data-builder-function-status></p>
        </form></body></html>`),
      }, {
        path: 'builder-runtime/functions.js', mediaType: 'text/javascript',
        bytes: encoder.encode(createFunctionBlockRuntimeSource(registrations)),
      }],
    }
    const archive = await JSZip.loadAsync(
      await (await new ZipProjectExporter().export(functionBundle)).arrayBuffer(),
    )
    const runtime = await archive.file('builder-runtime/functions.js')!.async('string')
    const home = await archive.file('pages/home.html')!.async('string')
    const exportedDocument = new DOMParser().parseFromString(home, 'text/html')
    new Function('window', 'document', runtime)(window, exportedDocument)
    exportedDocument.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(runtime).toContain('number[][]')
    expect(exportedDocument.querySelector('[data-builder-function-output]')?.textContent).toBe('[7,8]')
    expect([...archive.file(/student-arrays\.js$/)]).toHaveLength(0)
  })

  it('exports self-contained exact DTW with no CDN or runtime package dependency', async () => {
    const functionBundle: ProjectBundle = {
      manifest: {
        version: 2, elementOverrides: [], name: 'DTW export', startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }], connections: [],
      },
      files: [{
        path: 'pages/home.html', mediaType: 'text/html',
        bytes: encoder.encode(`<html><body><form data-builder-function-id="dtw-distance"
          data-builder-function-source-sequence-a="reference::result"
          data-builder-function-source-sequence-b="learner::result">
          <textarea data-builder-function-input="sequence-a"></textarea>
          <textarea data-builder-function-input="sequence-b"></textarea>
          <button type="submit">DTW</button><output data-builder-function-output>—</output><p data-builder-function-status></p>
        </form></body></html>`),
      }, {
        path: 'builder-runtime/functions.js', mediaType: 'text/javascript',
        bytes: encoder.encode(createFunctionBlockRuntimeSource([{
          metadata: dtwDistanceMetadata,
          implementation: dtwDistance,
        }])),
      }],
    }
    const archive = await JSZip.loadAsync(
      await (await new ZipProjectExporter().export(functionBundle)).arrayBuffer(),
    )
    const runtime = await archive.file('builder-runtime/functions.js')!.async('string')
    const home = await archive.file('pages/home.html')!.async('string')
    expect(runtime).toContain('dtw-distance')
    expect(runtime).not.toMatch(/https?:\/\/|cdn\.|require\(["']dynamic-time-warping/)
    expect([...archive.file(/dynamic-time-warping/i)]).toHaveLength(0)

    const exportedDocument = new DOMParser().parseFromString(home, 'text/html')
    new Function('window', 'document', runtime)(window, exportedDocument)
    exportedDocument.dispatchEvent(new CustomEvent('builder:runtime-value', { detail: {
      sourceId: 'reference', outputId: 'result', type: 'number[][]', value: [Array(441).fill(0)],
    } }))
    exportedDocument.dispatchEvent(new CustomEvent('builder:runtime-value', { detail: {
      sourceId: 'learner', outputId: 'result', type: 'number[][]', value: [Array(441).fill(1)],
    } }))
    const form = exportedDocument.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('441')
  })

  it('exports standalone explicit function-result chaining', async () => {
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'export-produce-values', name: 'Produce Values', description: 'Produces values.',
        inputs: [], output: { type: 'number[]' },
      },
      implementation: function exportProduceValues() { return [6, 7] },
    }, {
      metadata: {
        id: 'export-sum-values', name: 'Sum Values', description: 'Sums values.',
        inputs: [{ name: 'values', type: 'number[]' }], output: { type: 'number' },
      },
      implementation: function exportSumValues(values: number[]) {
        return values.reduce((total, value) => total + value, 0)
      },
    }]
    const functionBundle: ProjectBundle = {
      manifest: {
        version: 2, elementOverrides: [], name: 'Chained export', startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }], connections: [],
      },
      files: [{
        path: 'pages/home.html', mediaType: 'text/html',
        bytes: encoder.encode(`<html><body>
          <form data-builder-function-id="export-produce-values" data-builder-runtime-source-id="export-source" data-builder-runtime-output-id="result">
            <button type="submit">Produce</button><output data-builder-function-output>—</output><p data-builder-function-status></p>
          </form>
          <form data-builder-function-id="export-sum-values" data-builder-function-source-values="export-source::result">
            <textarea data-builder-function-input="values"></textarea><button type="submit">Sum</button>
            <output data-builder-function-output>—</output><p data-builder-function-status></p>
          </form></body></html>`),
      }, {
        path: 'builder-runtime/functions.js', mediaType: 'text/javascript',
        bytes: encoder.encode(createFunctionBlockRuntimeSource(registrations)),
      }],
    }
    const archive = await JSZip.loadAsync(
      await (await new ZipProjectExporter().export(functionBundle)).arrayBuffer(),
    )
    const runtime = await archive.file('builder-runtime/functions.js')!.async('string')
    const home = await archive.file('pages/home.html')!.async('string')
    const exportedDocument = new DOMParser().parseFromString(home, 'text/html')
    new Function('window', 'document', runtime)(window, exportedDocument)
    const [producer, consumer] = [...exportedDocument.querySelectorAll<HTMLFormElement>('form')]
    producer.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    consumer.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(consumer.querySelector('[data-builder-function-output]')?.textContent).toBe('13')
  })

  it('exports a standalone structured runtime-value binding beside the motion runtime', async () => {
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'export-count-frames', name: 'Export Count Frames', description: 'Counts frames.',
        inputs: [{ name: 'sequence', type: 'json' }], output: { type: 'number' },
      },
      implementation: function exportCountFrames(sequence: unknown) {
        if (!Array.isArray(sequence)) throw new Error('Expected frames.')
        return sequence.length
      },
    }]
    const functionBundle: ProjectBundle = {
      manifest: {
        version: 2, elementOverrides: [], name: 'Motion function export', startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }], connections: [],
        motionActivities: [{
          id: 'home-motion-1', runtimeSourceId: 'motion-source-1', pageId: 'home', elementId: 'motion',
          mode: 'analyze', componentType: 'analyze',
          input: { type: 'camera', durationMs: 3000, facingMode: 'user', continuous: true },
          reference: { type: 'none' }, presentation: { referenceDisplay: 'video-reference', showResults: false },
          detector: {
            provider: 'mediapipe', task: 'holistic-landmarker', modelUrl: 'https://example.com/model.task',
            delegate: 'auto', minConfidence: 0.5, landmarks: { hands: true, pose: true, face: false },
          },
          evaluator: { type: 'quality' }, processing: { checkpointReduction: true, smoothing: 3 },
          referenceOutput: { type: 'download' },
        }],
      },
      files: [{
        path: 'pages/home.html', mediaType: 'text/html',
        bytes: encoder.encode(`<html><body><section data-motion-activity="true"></section>
          <form data-builder-function-id="export-count-frames" data-builder-function-source-sequence="motion-source-1::landmark-frames">
            <div data-builder-function-input="sequence" data-builder-function-value-type="json"></div>
            <button type="submit">Run</button><output data-builder-function-output>—</output><p data-builder-function-status></p>
          </form></body></html>`),
      }, {
        path: 'builder-runtime/functions.js', mediaType: 'text/javascript',
        bytes: encoder.encode(createFunctionBlockRuntimeSource(registrations)),
      }],
    }
    const archive = await JSZip.loadAsync(
      await (await new ZipProjectExporter().export(functionBundle)).arrayBuffer(),
    )
    const runtime = await archive.file('builder-runtime/functions.js')!.async('string')
    const home = await archive.file('pages/home.html')!.async('string')
    expect(archive.file('motion-runtime/analysis.js')).not.toBeNull()
    expect(home.indexOf('builder-runtime/functions.js')).toBeLessThan(home.indexOf('motion-runtime/analysis.js'))
    const exportedDocument = new DOMParser().parseFromString(home, 'text/html')
    new Function('window', 'document', runtime)(window, exportedDocument)
    exportedDocument.dispatchEvent(new CustomEvent('builder:runtime-value', { detail: {
      sourceId: 'motion-source-1', outputId: 'landmark-frames', type: 'json',
      value: [{ t: 0 }, { t: 100 }],
    } }))
    const form = exportedDocument.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('2')
  })
})
