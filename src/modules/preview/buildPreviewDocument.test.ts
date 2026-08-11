import { describe, expect, it } from 'vitest'
import type { ProjectBundle } from '../../core/project'
import { buildPreviewDocument, collectPreviewElementIds } from './buildPreviewDocument'
import { createFunctionBlockRuntimeSource } from '../../runtime/functions/function-block-runtime'
import type { ExternalFunctionRegistration } from '../../runtime/functions/external-function-registry'
import { dtwDistance, dtwDistanceMetadata } from '../../external-libraries/time-series-tools'

const encoder = new TextEncoder()

describe('buildPreviewDocument', () => {
  it('removes executable content while keeping responsive CSS', () => {
    const bundle: ProjectBundle = {
      manifest: {
        version: 2,
        elementOverrides: [],
        name: 'Preview fixture',
        startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }],
        connections: [],
      },
      files: [
        {
          path: 'pages/home.html',
          mediaType: 'text/html',
          bytes: encoder.encode(
            '<!doctype html><html><head></head><body><script>alert(1)</script><a href="next.html">Next</a></body></html>',
          ),
        },
        {
          path: 'styles/app.css',
          mediaType: 'text/css',
          bytes: encoder.encode('@media (max-width: 600px) { body { color: teal; } }'),
        },
      ],
    }

    const preview = buildPreviewDocument(bundle, bundle.manifest.pages[0])

    expect(preview).not.toContain('<script')
    expect(preview).toContain('@media (max-width: 600px)')
    expect(preview).toContain('data-builder-original-href="next.html"')
  })

  it('embeds local assets without mutating the project bundle', () => {
    const originalImage = new Uint8Array([1, 2, 3])
    const bundle: ProjectBundle = {
      manifest: {
        version: 2,
        elementOverrides: [],
        name: 'Asset fixture',
        startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }],
        connections: [],
      },
      files: [
        {
          path: 'pages/home.html',
          mediaType: 'text/html',
          bytes: encoder.encode('<!doctype html><html><head></head><body><img src="../assets/test.png"></body></html>'),
        },
        {
          path: 'assets/test.png',
          mediaType: 'image/png',
          bytes: originalImage,
        },
      ],
    }

    const preview = buildPreviewDocument(bundle, bundle.manifest.pages[0])

    expect(preview).toContain('data:image/png;base64,AQID')
    expect(bundle.files[1].bytes).toBe(originalImage)
  })

  it('preserves linked stylesheet order, media queries, fonts, and inline assets', () => {
    const bundle: ProjectBundle = {
      manifest: {
        version: 2,
        elementOverrides: [],
        name: 'Responsive design export',
        startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'index.html' }],
        connections: [],
      },
      files: [
        {
          path: 'index.html',
          mediaType: 'text/html',
          bytes: encoder.encode('<html><head><link rel="stylesheet" href="styles/app.css" media="screen"><style>.logo { background: url("assets/logo.svg") }</style></head><body><main>Home</main></body></html>'),
        },
        {
          path: 'styles/app.css',
          mediaType: 'text/css',
          bytes: encoder.encode('@font-face { font-family: Figma; src: url("../assets/figma.woff2") } @media (max-width: 640px) { main { display: block } }'),
        },
        { path: 'assets/logo.svg', mediaType: 'image/svg+xml', bytes: encoder.encode('<svg/>') },
        { path: 'assets/figma.woff2', mediaType: 'font/woff2', bytes: new Uint8Array([1, 2, 3]) },
        { path: 'styles/unrelated.css', mediaType: 'text/css', bytes: encoder.encode('.should-not-load {}') },
      ],
    }

    const preview = buildPreviewDocument(bundle, bundle.manifest.pages[0])

    expect(preview).toContain('data-builder-stylesheet="styles/app.css"')
    expect(preview).toContain('media="screen"')
    expect(preview).toContain('@media (max-width: 640px)')
    expect(preview).toContain('data:font/woff2;base64,AQID')
    expect(preview).toContain('data:image/svg+xml;base64,PHN2Zy8+')
    expect(preview).not.toContain('.should-not-load')
  })

  it('exposes the same stable identifiers used by the visual selector', () => {
    const bundle: ProjectBundle = {
      manifest: {
        version: 2,
        elementOverrides: [],
        name: 'Selection fixture',
        startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }],
        connections: [],
      },
      files: [{
        path: 'pages/home.html',
        mediaType: 'text/html',
        bytes: encoder.encode('<html><body><main><button>Continue</button></main></body></html>'),
      }],
    }

    expect(collectPreviewElementIds(bundle, bundle.manifest.pages[0])).toEqual(new Set([
      'home::main:1',
      'home::main:1/button:1',
    ]))
  })

  it('injects the standalone runtime only in test mode', () => {
    const bundle: ProjectBundle = {
      manifest: {
        version: 2,
        elementOverrides: [],
        name: 'Runtime fixture',
        startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }],
        connections: [],
      },
      files: [{
        path: 'pages/home.html',
        mediaType: 'text/html',
        bytes: encoder.encode('<html><body><button>Continue</button></body></html>'),
      }],
    }

    const editPreview = buildPreviewDocument(bundle, bundle.manifest.pages[0])
    const testPreview = buildPreviewDocument(bundle, bundle.manifest.pages[0], { mode: 'test' })

    expect(editPreview).not.toContain('data-builder-runtime')
    expect(editPreview).not.toContain('data-builder-function-runtime')
    expect(testPreview).toContain('data-builder-config="true"')
    expect(testPreview).toContain('data-builder-runtime="true"')
    expect(testPreview).not.toContain('data-builder-function-runtime')
    expect(testPreview).toContain('builder-navigation-runtime')
  })

  it('injects the external function runtime for function blocks in test mode', () => {
    const bundle: ProjectBundle = {
      manifest: {
        version: 2,
        elementOverrides: [],
        name: 'Function preview',
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

    const editPreview = buildPreviewDocument(bundle, bundle.manifest.pages[0])
    const testPreview = buildPreviewDocument(bundle, bundle.manifest.pages[0], { mode: 'test' })

    expect(editPreview).not.toContain('data-builder-function-runtime')
    expect(testPreview).toContain('data-builder-function-runtime="true"')
    expect(testPreview).toContain('double-number')
    expect(testPreview).toContain('average')
    expect(testPreview).toContain('maximum')
    expect(testPreview).toContain('executeRegisteredFunction')
  })

  it('executes the project-specific imported function runtime in Test Preview', async () => {
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'multiply', name: 'Multiply', description: 'Multiplies.',
        inputs: [{ name: 'left', type: 'number' }, { name: 'right', type: 'number' }],
        output: { type: 'number' },
      },
      implementation: function multiply(left: number, right: number) { return left * right },
    }]
    const customRuntime = createFunctionBlockRuntimeSource(registrations)
    const bundle: ProjectBundle = {
      manifest: {
        version: 2, elementOverrides: [], name: 'Imported function preview', startPage: 'home',
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

    const preview = buildPreviewDocument(bundle, bundle.manifest.pages[0], { mode: 'test' })
    expect(preview).toContain('multiply')
    expect(preview).not.toContain('double-number')
    const runtimeDocument = new DOMParser().parseFromString(preview, 'text/html')
    const source = runtimeDocument.querySelector<HTMLScriptElement>('[data-builder-function-runtime]')!.textContent!
    new Function('window', 'document', source)(window, runtimeDocument)
    runtimeDocument.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(runtimeDocument.querySelector('[data-builder-function-output]')?.textContent).toBe('42')
  })

  it('parses, executes, and displays an imported array function in Test Preview', async () => {
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'preview-flatten', name: 'Preview Flatten', description: 'Flattens a matrix.',
        inputs: [{ name: 'matrix', type: 'number[][]' }], output: { type: 'number[]' },
      },
      implementation: function previewFlatten(matrix: number[][]) { return matrix.flat() },
    }]
    const bundle: ProjectBundle = {
      manifest: {
        version: 2, elementOverrides: [], name: 'Array preview', startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }], connections: [],
      },
      files: [{
        path: 'pages/home.html', mediaType: 'text/html',
        bytes: encoder.encode(`<html><body><form data-builder-function-id="preview-flatten">
          <textarea data-builder-function-input="matrix" data-builder-function-value-type="number[][]">[[1,2],[3,4]]</textarea>
          <output data-builder-function-output></output><p data-builder-function-status></p>
        </form></body></html>`),
      }, {
        path: 'builder-runtime/functions.js', mediaType: 'text/javascript',
        bytes: encoder.encode(createFunctionBlockRuntimeSource(registrations)),
      }],
    }

    const preview = buildPreviewDocument(bundle, bundle.manifest.pages[0], { mode: 'test' })
    const runtimeDocument = new DOMParser().parseFromString(preview, 'text/html')
    const source = runtimeDocument.querySelector<HTMLScriptElement>('[data-builder-function-runtime]')!.textContent!
    new Function('window', 'document', source)(window, runtimeDocument)
    runtimeDocument.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(runtimeDocument.querySelector('[data-builder-function-output]')?.textContent).toBe('[1,2,3,4]')
  })

  it('runs the self-contained exact DTW operation in Test Preview without a network dependency', async () => {
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: dtwDistanceMetadata,
      implementation: dtwDistance,
    }]
    const bundle: ProjectBundle = {
      manifest: {
        version: 2, elementOverrides: [], name: 'DTW preview', startPage: 'home',
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
        bytes: encoder.encode(createFunctionBlockRuntimeSource(registrations)),
      }],
    }

    const preview = buildPreviewDocument(bundle, bundle.manifest.pages[0], { mode: 'test' })
    const runtimeDocument = new DOMParser().parseFromString(preview, 'text/html')
    const source = runtimeDocument.querySelector<HTMLScriptElement>('[data-builder-function-runtime]')!.textContent!
    expect(source).not.toMatch(/https?:\/\/|cdn\.|dynamic-time-warping\.js/)
    new Function('window', 'document', source)(window, runtimeDocument)
    runtimeDocument.dispatchEvent(new CustomEvent('builder:runtime-value', { detail: {
      sourceId: 'reference', outputId: 'result', type: 'number[][]', value: [[0], [1]],
    } }))
    runtimeDocument.dispatchEvent(new CustomEvent('builder:runtime-value', { detail: {
      sourceId: 'learner', outputId: 'result', type: 'number[][]', value: [[2], [3]],
    } }))
    const form = runtimeDocument.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('4')
  })

  it('preserves an explicit structured runtime-value binding in Test Preview', async () => {
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'preview-count-frames', name: 'Preview Count Frames', description: 'Counts frames.',
        inputs: [{ name: 'sequence', type: 'json' }], output: { type: 'number' },
      },
      implementation: function previewCountFrames(sequence: unknown) {
        if (!Array.isArray(sequence)) throw new Error('Expected frames.')
        return sequence.length
      },
    }]
    const bundle: ProjectBundle = {
      manifest: {
        version: 2, elementOverrides: [], name: 'Motion function preview', startPage: 'home',
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
          <form data-builder-function-id="preview-count-frames" data-builder-function-source-sequence="motion-source-1::landmark-frames">
            <div data-builder-function-input="sequence" data-builder-function-value-type="json"></div>
            <button type="submit">Run</button><output data-builder-function-output>—</output><p data-builder-function-status></p>
          </form></body></html>`),
      }, {
        path: 'builder-runtime/functions.js', mediaType: 'text/javascript',
        bytes: encoder.encode(createFunctionBlockRuntimeSource(registrations)),
      }],
    }
    const preview = buildPreviewDocument(bundle, bundle.manifest.pages[0], { mode: 'test' })
    const runtimeDocument = new DOMParser().parseFromString(preview, 'text/html')
    const functionScript = runtimeDocument.querySelector<HTMLScriptElement>('[data-builder-function-runtime]')!
    const motionScript = runtimeDocument.querySelector<HTMLScriptElement>('[data-motion-runtime]')!
    expect(functionScript.compareDocumentPosition(motionScript) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    new Function('window', 'document', functionScript.textContent!)(window, runtimeDocument)
    runtimeDocument.dispatchEvent(new CustomEvent('builder:runtime-value', { detail: {
      sourceId: 'motion-source-1', outputId: 'landmark-frames', type: 'json',
      value: [{ t: 0 }, { t: 100 }, { t: 200 }],
    } }))
    const form = runtimeDocument.querySelector('form')!
    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('—')
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('3')
  })

  it('supports explicit function-result chaining in Test Preview', async () => {
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'preview-produce-values', name: 'Produce Values', description: 'Produces values.',
        inputs: [], output: { type: 'number[]' },
      },
      implementation: function previewProduceValues() { return [2, 3, 4] },
    }, {
      metadata: {
        id: 'preview-sum-values', name: 'Sum Values', description: 'Sums values.',
        inputs: [{ name: 'values', type: 'number[]' }], output: { type: 'number' },
      },
      implementation: function previewSumValues(values: number[]) {
        return values.reduce((total, value) => total + value, 0)
      },
    }]
    const bundle: ProjectBundle = {
      manifest: {
        version: 2, elementOverrides: [], name: 'Chained preview', startPage: 'home',
        pages: [{ id: 'home', name: 'Home', file: 'pages/home.html' }], connections: [],
      },
      files: [{
        path: 'pages/home.html', mediaType: 'text/html',
        bytes: encoder.encode(`<html><body>
          <form data-builder-function-id="preview-produce-values" data-builder-runtime-source-id="preview-source" data-builder-runtime-output-id="result">
            <button type="submit">Produce</button><output data-builder-function-output>—</output><p data-builder-function-status></p>
          </form>
          <form data-builder-function-id="preview-sum-values" data-builder-function-source-values="preview-source::result">
            <textarea data-builder-function-input="values"></textarea><button type="submit">Sum</button>
            <output data-builder-function-output>—</output><p data-builder-function-status></p>
          </form></body></html>`),
      }, {
        path: 'builder-runtime/functions.js', mediaType: 'text/javascript',
        bytes: encoder.encode(createFunctionBlockRuntimeSource(registrations)),
      }],
    }
    const preview = buildPreviewDocument(bundle, bundle.manifest.pages[0], { mode: 'test' })
    const runtimeDocument = new DOMParser().parseFromString(preview, 'text/html')
    const source = runtimeDocument.querySelector<HTMLScriptElement>('[data-builder-function-runtime]')!.textContent!
    new Function('window', 'document', source)(window, runtimeDocument)
    const [producer, consumer] = [...runtimeDocument.querySelectorAll<HTMLFormElement>('form')]
    producer.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(consumer.querySelector('[data-builder-function-output]')?.textContent).toBe('—')
    consumer.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(consumer.querySelector('[data-builder-function-output]')?.textContent).toBe('9')
  })

  it('applies static record bindings for the active navigation context', () => {
    const bundle: ProjectBundle = {
      manifest: {
        version: 2,
        elementOverrides: [],
        name: 'Bound preview',
        startPage: 'detail',
        pages: [{ id: 'detail', name: 'Detail', file: 'detail.html' }],
        connections: [],
        dataSources: [{
          id: 'items',
          name: 'Items',
          type: 'static',
          records: [{ id: 'two', name: 'Second record' }],
        }],
        bindings: [{
          id: 'detail-title',
          pageId: 'detail',
          elementId: 'detail::main:1/h1:1',
          target: 'text',
          contextKey: 'selectedRecord',
          field: 'name',
        }],
      },
      files: [{
        path: 'detail.html',
        mediaType: 'text/html',
        bytes: encoder.encode('<html><body><main><h1>Default</h1></main></body></html>'),
      }],
    }

    const preview = buildPreviewDocument(bundle, bundle.manifest.pages[0], {
      context: { selectedRecord: { dataSourceId: 'items', recordId: 'two' } },
    })

    expect(preview).toContain('Second record')
    expect(preview).not.toContain('>Default<')
  })
})
