import { afterEach, describe, expect, it } from 'vitest'
import { externalFunctionRegistrations } from '../../external-functions/catalog'
import { doubleNumberMetadata } from '../../external-functions/double-number'
import type { ExternalFunctionRegistration } from './external-function-registry'
import {
  createFunctionBlockRuntimeSource,
  installExternalFunctionBlockRuntime,
  MAX_EXTERNAL_FUNCTION_JSON_INPUT_CHARACTERS,
} from './function-block-runtime'
import { RUNTIME_VALUE_EVENT } from '../values/runtime-value-contract'

function functionForm(functionId = 'double-number') {
  document.body.innerHTML = `<form data-builder-function-id="${functionId}">
    <input data-builder-function-input="value" type="number" value="5">
    <button type="submit">Run</button>
    <output data-builder-function-output>—</output>
    <p data-builder-function-status></p>
  </form>`
  return document.querySelector('form')!
}

function twoInputFunctionForm(functionId: 'average' | 'maximum') {
  document.body.innerHTML = `<form data-builder-function-id="${functionId}">
    <input data-builder-function-input="left" type="number" value="4">
    <input data-builder-function-input="right" type="number" value="8">
    <button type="submit">Run</button>
    <output data-builder-function-output>—</output>
    <p data-builder-function-status></p>
  </form>`
  return document.querySelector('form')!
}

function arrayFunctionForm(functionId: string, inputName: string, value: string) {
  document.body.innerHTML = `<form data-builder-function-id="${functionId}">
    <textarea data-builder-function-input="${inputName}">${value}</textarea>
    <button type="submit">Run</button>
    <output data-builder-function-output>—</output>
    <p data-builder-function-status></p>
  </form>`
  return document.querySelector('form')!
}

async function submit(form: HTMLFormElement) {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('external function block runtime', () => {
  afterEach(() => { document.body.replaceChildren() })

  it('passes a graphical numeric value through the registered function', async () => {
    const form = functionForm()
    const dispose = installExternalFunctionBlockRuntime(window, document)

    await submit(form)
    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('10')
    const input = form.querySelector<HTMLInputElement>('[data-builder-function-input]')!
    input.value = '8'
    await submit(form)
    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('16')
    dispose()
  })

  it('shows execution failures without throwing from the runtime event', async () => {
    const form = functionForm('throwing-number')
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: { ...doubleNumberMetadata, id: 'throwing-number', name: 'Throwing Number' },
      implementation: () => { throw new Error('Expected failure') },
    }]
    const dispose = installExternalFunctionBlockRuntime(window, document, registrations)

    await expect(submit(form)).resolves.toBeUndefined()
    expect(form.querySelector('[data-builder-function-status]')?.textContent).toBe('Expected failure')
    expect(form.querySelector('[data-builder-function-status]')?.getAttribute('role')).toBe('alert')
    dispose()
  })

  it('executes multiple functions from the same library through generic metadata', async () => {
    const averageForm = twoInputFunctionForm('average')
    const disposeAverage = installExternalFunctionBlockRuntime(window, document)
    await submit(averageForm)
    expect(averageForm.querySelector('[data-builder-function-output]')?.textContent).toBe('6')
    disposeAverage()

    const maximumForm = twoInputFunctionForm('maximum')
    const disposeMaximum = installExternalFunctionBlockRuntime(window, document)
    await submit(maximumForm)
    expect(maximumForm.querySelector('[data-builder-function-output]')?.textContent).toBe('8')
    disposeMaximum()
  })

  it('safely parses and displays vector and matrix values according to metadata', async () => {
    const flattenForm = arrayFunctionForm('flatten', 'matrix', '[[1,2],[3,4]]')
    const disposeFlatten = installExternalFunctionBlockRuntime(window, document)
    await submit(flattenForm)
    expect(flattenForm.querySelector('[data-builder-function-output]')?.textContent).toBe('[1,2,3,4]')
    disposeFlatten()

    const sumForm = arrayFunctionForm('sum', 'values', '[1,2,3,4]')
    const disposeSum = installExternalFunctionBlockRuntime(window, document)
    await submit(sumForm)
    expect(sumForm.querySelector('[data-builder-function-output]')?.textContent).toBe('10')
    disposeSum()

    const matrixForm = arrayFunctionForm('return-matrix', 'values', '[1,2,3]')
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'return-matrix', name: 'Return Matrix', description: 'Returns a matrix.',
        inputs: [{ name: 'values', type: 'number[]' }], output: { type: 'number[][]' },
      },
      implementation: (values: number[]) => [values],
    }]
    const disposeMatrix = installExternalFunctionBlockRuntime(window, document, registrations)
    await submit(matrixForm)
    expect(matrixForm.querySelector('[data-builder-function-output]')?.textContent).toBe('[[1,2,3]]')
    disposeMatrix()
  })

  it('rejects malformed JSON and parsed values without eval or silent conversion', async () => {
    const malformed = arrayFunctionForm('sum', 'values', '[1,2,]')
    const disposeMalformed = installExternalFunctionBlockRuntime(window, document)
    await submit(malformed)
    expect(malformed.querySelector('[data-builder-function-status]')?.textContent).toContain('JSON válido')
    disposeMalformed()

    const mixed = arrayFunctionForm('sum', 'values', '[1,"2",3]')
    const disposeMixed = installExternalFunctionBlockRuntime(window, document)
    await submit(mixed)
    expect(mixed.querySelector('[data-builder-function-status]')?.getAttribute('role')).toBe('alert')
    disposeMixed()

    const source = createFunctionBlockRuntimeSource(externalFunctionRegistrations)
    expect(source).toContain('JSON.parse')
    expect(source).not.toMatch(/\beval\s*\(/)
  })

  it('applies a conservative manual JSON limit independently from runtime array limits', async () => {
    const form = arrayFunctionForm(
      'sum',
      'values',
      ' '.repeat(MAX_EXTERNAL_FUNCTION_JSON_INPUT_CHARACTERS + 1),
    )
    const dispose = installExternalFunctionBlockRuntime(window, document)
    await submit(form)
    expect(form.querySelector('[data-builder-function-status]')?.textContent).toContain('límite manual')
    dispose()
  })

  it('serializes an executable runtime with registrations rather than ID-specific execution', async () => {
    const source = createFunctionBlockRuntimeSource(externalFunctionRegistrations)

    expect(source).toContain('double-number')
    expect(source).toContain('average')
    expect(source).toContain('maximum')
    expect(source).toContain('flatten')
    expect(source).toContain('number[][]')
    expect(source).toContain('implementation: (')
    expect(source).toContain('executeRegisteredFunction')
    expect(source).not.toContain('functionId === "double-number"')
    expect(source).not.toContain('functionId === "average"')
    expect(source).not.toContain('functionId === "maximum"')
    expect(() => new Function(source)).not.toThrow()

    const runtimeDocument = document.implementation.createHTMLDocument('Function runtime')
    runtimeDocument.body.innerHTML = `<form data-builder-function-id="double-number">
      <input data-builder-function-input="value" type="number" value="5">
      <output data-builder-function-output>—</output>
      <p data-builder-function-status></p>
    </form>`
    new Function('window', 'document', source)(window, runtimeDocument)
    const form = runtimeDocument.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('10')
  })

  it('uses an explicitly selected runtime value only on submit and isolates producer-owned data', async () => {
    const producerFrames = [{
      t: 0, width: 640, height: 480, replaySampled: true,
      poseLandmarks: [[{ x: 0.5, y: 0.25, z: -0.1 }]],
      leftHandLandmarks: [[]], rightHandLandmarks: [[]], faceLandmarks: [[]],
    }, {
      t: 100, width: 640, height: 480, replaySampled: true,
      poseLandmarks: [[]], leftHandLandmarks: [[]], rightHandLandmarks: [[]], faceLandmarks: [[]],
    }]
    document.body.innerHTML = `<form data-builder-function-id="mutating-count"
      data-builder-function-source-sequence="analyze-source::landmark-frames">
      <div data-builder-function-input="sequence" data-builder-function-value-type="json"></div>
      <button type="submit">Run</button><output data-builder-function-output>—</output>
      <p data-builder-function-status></p></form>`
    const form = document.querySelector('form')!
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'mutating-count', name: 'Mutating Count', description: 'Mutation isolation proof.',
        inputs: [{ name: 'sequence', type: 'json' }], output: { type: 'number' },
      },
      implementation: (sequence: unknown) => {
        const frames = sequence as Array<Record<string, unknown>>
        frames[0].t = 999
        frames.pop()
        return frames.length
      },
    }]
    const dispose = installExternalFunctionBlockRuntime(window, document, registrations)
    document.dispatchEvent(new CustomEvent(RUNTIME_VALUE_EVENT, { detail: {
      sourceId: 'analyze-source', outputId: 'landmark-frames', type: 'json', value: producerFrames,
    } }))

    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('—')
    await submit(form)
    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('1')
    expect(producerFrames).toHaveLength(2)
    expect(producerFrames[0].t).toBe(0)
    await submit(form)
    expect(form.querySelector('[data-builder-function-output]')?.textContent).toBe('1')
    expect(producerFrames).toHaveLength(2)
    dispose()
  })

  it('reports a safe error when structured runtime data has not been produced', async () => {
    document.body.innerHTML = `<form data-builder-function-id="count-frames"
      data-builder-function-source-sequence="missing::landmark-frames">
      <div data-builder-function-input="sequence" data-builder-function-value-type="json"></div>
      <button type="submit">Run</button><output data-builder-function-output>—</output>
      <p data-builder-function-status></p></form>`
    const form = document.querySelector('form')!
    const dispose = installExternalFunctionBlockRuntime(window, document)
    await submit(form)
    expect(form.querySelector('[data-builder-function-status]')?.textContent).toContain('Ejecuta primero')
    expect(form.querySelector('[data-builder-function-status]')?.getAttribute('role')).toBe('alert')
    dispose()
  })

  it('publishes a successful function result for explicit typed downstream execution', async () => {
    document.body.innerHTML = `<form data-builder-function-id="produce-matrix"
      data-builder-runtime-source-id="function-source-a"
      data-builder-runtime-output-id="result" data-builder-runtime-output-type="number[][]">
      <button type="submit">Run producer</button><output data-builder-function-output>—</output>
      <p data-builder-function-status></p></form>
      <form data-builder-function-id="mutating-first-value"
        data-builder-function-source-matrix="function-source-a::result">
        <textarea data-builder-function-input="matrix"></textarea>
        <button type="submit">Run consumer</button><output data-builder-function-output>—</output>
        <p data-builder-function-status></p></form>`
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'produce-matrix', name: 'Produce Matrix', description: 'Produces a matrix.',
        inputs: [], output: { type: 'number[][]' },
      },
      implementation: () => [[1, 2], [3, 4]],
    }, {
      metadata: {
        id: 'mutating-first-value', name: 'Mutating First Value', description: 'Clone proof.',
        inputs: [{ name: 'matrix', type: 'number[][]' }], output: { type: 'number' },
      },
      implementation: (matrix: number[][]) => {
        const original = matrix[0][0]
        matrix[0][0] = 999
        return original
      },
    }]
    const dispose = installExternalFunctionBlockRuntime(window, document, registrations)
    const [producer, consumer] = [...document.querySelectorAll<HTMLFormElement>('form')]

    await submit(producer)
    expect(consumer.querySelector('[data-builder-function-output]')?.textContent).toBe('—')
    await submit(consumer)
    expect(consumer.querySelector('[data-builder-function-output]')?.textContent).toBe('1')
    await submit(consumer)
    expect(consumer.querySelector('[data-builder-function-output]')?.textContent).toBe('1')
    dispose()
  })

  it('rejects a selected function source whose published type is incompatible', async () => {
    document.body.innerHTML = `<form data-builder-function-id="sum"
      data-builder-function-source-values="number-source::result">
      <textarea data-builder-function-input="values"></textarea>
      <button type="submit">Run</button><output data-builder-function-output>—</output>
      <p data-builder-function-status></p></form>`
    const form = document.querySelector('form')!
    const dispose = installExternalFunctionBlockRuntime(window, document)
    document.dispatchEvent(new CustomEvent(RUNTIME_VALUE_EVENT, { detail: {
      sourceId: 'number-source', outputId: 'result', type: 'number', value: 3,
    } }))

    await submit(form)
    expect(form.querySelector('[data-builder-function-status]')?.textContent)
      .toContain('produce number, no number[]')
    expect(form.querySelector('[data-builder-function-status]')?.getAttribute('role')).toBe('alert')
    dispose()
  })

  it('moves real-shaped landmark data through the composable preparation pipeline without manual JSON', async () => {
    document.body.innerHTML = `
      <form data-builder-function-id="extract-left-hand-xyz" data-builder-runtime-source-id="extract-source"
        data-builder-runtime-output-id="result" data-builder-function-source-landmark-frames="motion-source::landmark-frames">
        <div data-builder-function-input="landmark-frames"></div><button type="submit">Extract</button>
        <output data-builder-function-output>—</output><p data-builder-function-status></p>
      </form>
      <form data-builder-function-id="remove-zero-sum-rows" data-builder-runtime-source-id="filtered-source"
        data-builder-runtime-output-id="result" data-builder-function-source-matrix="extract-source::result">
        <textarea data-builder-function-input="matrix"></textarea><button type="submit">Filter</button>
        <output data-builder-function-output>—</output><p data-builder-function-status></p>
      </form>
      <form data-builder-function-id="mediapipe-hand-connections" data-builder-runtime-source-id="connections-source"
        data-builder-runtime-output-id="result"><button type="submit">Connections</button>
        <output data-builder-function-output>—</output><p data-builder-function-status></p>
      </form>
      <form data-builder-function-id="connection-vectors" data-builder-runtime-source-id="vectors-source"
        data-builder-runtime-output-id="result" data-builder-function-source-point-frames="filtered-source::result"
        data-builder-function-source-connections="connections-source::result">
        <textarea data-builder-function-input="point-frames"></textarea><textarea data-builder-function-input="connections"></textarea>
        <button type="submit">Vectors</button><output data-builder-function-output>—</output><p data-builder-function-status></p>
      </form>
      <form data-builder-function-id="ordered-pairwise-angles"
        data-builder-function-source-vector-frames="vectors-source::result">
        <div data-builder-function-input="vector-frames"></div><button type="submit">Angles</button>
        <output data-builder-function-output>—</output><p data-builder-function-status></p>
      </form>`
    const landmarks = Array.from({ length: 21 }, (_, index) => ({ x: index, y: 0, z: 0, visibility: 0.5 }))
    const frames = [
      { leftHandLandmarks: [[]] },
      { leftHandLandmarks: [landmarks] },
    ]
    const dispose = installExternalFunctionBlockRuntime(window, document)
    document.dispatchEvent(new CustomEvent(RUNTIME_VALUE_EVENT, { detail: {
      sourceId: 'motion-source', outputId: 'landmark-frames', type: 'json', value: frames,
    } }))
    const forms = [...document.querySelectorAll<HTMLFormElement>('form')]
    for (const form of forms) await submit(form)

    const result = JSON.parse(forms.at(-1)!.querySelector('[data-builder-function-output]')!.textContent!)
    expect(result).toEqual([Array(441).fill(0)])
    expect(frames[1].leftHandLandmarks[0][0].visibility).toBe(0.5)
    dispose()
  })

  it('feeds two independent M6 angle outputs into explicit exact DTW execution', async () => {
    document.body.innerHTML = `
      <form data-builder-function-id="ordered-pairwise-angles" data-builder-runtime-source-id="reference-angles"
        data-builder-runtime-output-id="result" data-builder-runtime-output-type="number[][]"
        data-builder-function-source-vector-frames="reference-vectors::result">
        <div data-builder-function-input="vector-frames"></div><button type="submit">Reference angles</button>
        <output data-builder-function-output>—</output><p data-builder-function-status></p>
      </form>
      <form data-builder-function-id="ordered-pairwise-angles" data-builder-runtime-source-id="learner-angles"
        data-builder-runtime-output-id="result" data-builder-runtime-output-type="number[][]"
        data-builder-function-source-vector-frames="learner-vectors::result">
        <div data-builder-function-input="vector-frames"></div><button type="submit">Learner angles</button>
        <output data-builder-function-output>—</output><p data-builder-function-status></p>
      </form>
      <form data-builder-function-id="dtw-distance"
        data-builder-function-source-sequence-a="reference-angles::result"
        data-builder-function-source-sequence-b="learner-angles::result">
        <textarea data-builder-function-input="sequence-a"></textarea>
        <textarea data-builder-function-input="sequence-b"></textarea>
        <button type="submit">DTW</button><output data-builder-function-output>—</output><p data-builder-function-status></p>
      </form>`
    const referenceVectors = [[[1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 1, 0]]]
    const learnerVectors = [[[1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 1, 0]]]
    const originalReference = structuredClone(referenceVectors)
    const originalLearner = structuredClone(learnerVectors)
    const dispose = installExternalFunctionBlockRuntime(window, document)
    document.dispatchEvent(new CustomEvent(RUNTIME_VALUE_EVENT, { detail: {
      sourceId: 'reference-vectors', outputId: 'result', type: 'json', value: referenceVectors,
    } }))
    document.dispatchEvent(new CustomEvent(RUNTIME_VALUE_EVENT, { detail: {
      sourceId: 'learner-vectors', outputId: 'result', type: 'json', value: learnerVectors,
    } }))
    const [reference, learner, dtw] = [...document.querySelectorAll<HTMLFormElement>('form')]

    await submit(reference)
    await submit(learner)
    expect(dtw.querySelector('[data-builder-function-output]')?.textContent).toBe('—')
    await submit(dtw)
    expect(dtw.querySelector('[data-builder-function-output]')?.textContent).toBe('0')
    expect(referenceVectors).toEqual(originalReference)
    expect(learnerVectors).toEqual(originalLearner)
    dispose()
  })
})
