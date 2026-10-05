import { afterEach, describe, expect, it } from 'vitest'
import type { ExternalFunctionRegistration } from './external-function-registry'
import {
  createJsLabRuntimeInstallationSource,
  externalFunctionJavascriptName,
  installExternalJsLabRuntime,
  javascriptIdentifier,
  jsLabDeclaredVariableNames,
} from './js-lab-runtime'
import { RUNTIME_VALUE_STORE_PROPERTY } from '../values/runtime-value-contract'
import { createFunctionBlockRuntimeSource } from './function-block-runtime'

const doubleNumber: ExternalFunctionRegistration = {
  metadata: {
    description: 'Doubles a number.',
    id: 'double-number',
    inputs: [{ name: 'value', type: 'number' }],
    name: 'Double Number',
    output: { type: 'number' },
  },
  implementation: function doubleNumberImplementation(value: number) { return value * 2 },
}

function labMarkup(code: string) {
  return `<section data-builder-js-lab
    data-builder-js-lab-code="${code.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"
    data-builder-runtime-source-id="lab-1"
    data-builder-runtime-output-id="variables"
    data-builder-runtime-output-type="json">
    <textarea data-builder-js-lab-code-editor></textarea>
    <button data-builder-js-lab-run type="button">Run</button>
    <output data-builder-js-lab-result></output>
    <table><tbody data-builder-js-lab-variable-rows></tbody></table>
    <p data-builder-js-lab-status></p>
  </section>`
}

afterEach(() => {
  document.body.innerHTML = ''
  delete (window as unknown as Window & Record<string, unknown>)[RUNTIME_VALUE_STORE_PROPERTY]
})

describe('editable JS Lab runtime', () => {
  it('executes student code and publishes every declared variable as JSON', async () => {
    document.body.innerHTML = labMarkup('let x = doubleNumber(5);\nconst y = doubleNumber(x);')
    const dispose = installExternalJsLabRuntime(window, document, [doubleNumber])

    document.querySelector<HTMLButtonElement>('[data-builder-js-lab-run]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-builder-js-lab-result]')?.textContent)
      .toBe('{\n  "x": 10,\n  "y": 20\n}')
    expect(document.querySelector('[data-builder-js-lab-status]')?.textContent)
      .toBe('2 variable(s) publicada(s).')
    const store = (window as unknown as Window & Record<string, unknown>)[RUNTIME_VALUE_STORE_PROPERTY] as {
      read: (key: string) => { value: unknown } | undefined
    }
    expect(store.read('lab-1::variables')?.value).toEqual({ x: 10, y: 20 })
    expect(document.querySelector('[data-builder-js-lab-variable-rows]')?.textContent)
      .toContain('xnumber10')
    expect(document.querySelector('[data-builder-js-lab-variable-rows]')?.textContent)
      .toContain('ynumber20')
    dispose()
  })

  it('executes edited code rather than the original library-call text', async () => {
    document.body.innerHTML = labMarkup('let x = doubleNumber(5);')
    const dispose = installExternalJsLabRuntime(window, document, [doubleNumber])
    const editor = document.querySelector<HTMLTextAreaElement>('[data-builder-js-lab-code-editor]')!
    editor.value = 'let x = doubleNumber(5) + 5;'
    editor.dispatchEvent(new Event('input', { bubbles: true }))

    document.querySelector<HTMLButtonElement>('[data-builder-js-lab-run]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-builder-js-lab-result]')?.textContent).toBe('{\n  "x": 15\n}')
    expect(document.querySelector('[data-builder-js-lab]')?.getAttribute('data-builder-js-lab-code'))
      .toBe('let x = doubleNumber(5) + 5;')
    dispose()
  })

  it('loads an unchanged global library before JS Lab and exposes its constructor', async () => {
    document.body.innerHTML = labMarkup('let result = new ExampleLibrary(7).getValue();')
    const source = `(function () {
      "use strict";
      function ExampleLibrary(value) { this.getValue = function () { return value * 2; }; }
      var root = typeof self === "object" && self.self === self && self || this;
      root.ExampleLibrary = ExampleLibrary;
    }());`
    const dispose = installExternalJsLabRuntime(window, document, [], [{
      globalApis: [{ name: 'ExampleLibrary' }], id: 'example-library', source,
    }])

    document.querySelector<HTMLButtonElement>('[data-builder-js-lab-run]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-builder-js-lab-result]')?.textContent)
      .toBe('{\n  "result": 14\n}')
    dispose()
  })

  it('contains raw global source in the self-contained Preview/export runtime', async () => {
    document.body.innerHTML = labMarkup('let result = RawTool.value();')
    const source = createFunctionBlockRuntimeSource([], [{
      globalApis: [{ name: 'RawTool' }],
      id: 'raw-tool',
      source: 'this.RawTool = { value: function () { return 9; } };',
    }])
    Function('window', 'document', source)(window, document)

    document.querySelector<HTMLButtonElement>('[data-builder-js-lab-run]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-builder-js-lab-result]')?.textContent).toBe('{\n  "result": 9\n}')
  })

  it('provides cloned runtime producer values through readable runtimeValues aliases', async () => {
    document.body.innerHTML = `<section data-builder-runtime-source-id="input-1"
      data-builder-runtime-source-name="Input Number"
      data-builder-runtime-output-id="result"
      data-builder-runtime-output-name="Result"
      data-builder-runtime-output-type="number"></section>
      ${labMarkup('let x = doubleNumber(runtimeValues.inputNumber);')}`
    const dispose = installExternalJsLabRuntime(window, document, [doubleNumber])
    const store = (window as unknown as Window & Record<string, unknown>)[RUNTIME_VALUE_STORE_PROPERTY] as {
      publish: (detail: unknown) => boolean
    }
    expect(document.querySelector('[data-builder-js-lab-variable-rows]')?.textContent)
      .toContain('runtimeValues.inputNumbernumberEsperando datos…')
    store.publish({ sourceId: 'input-1', outputId: 'result', type: 'number', value: 7 })
    expect(document.querySelector('[data-builder-js-lab-variable-rows]')?.textContent)
      .toContain('runtimeValues.inputNumbernumber7')

    document.querySelector<HTMLButtonElement>('[data-builder-js-lab-run]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-builder-js-lab-result]')?.textContent).toBe('{\n  "x": 14\n}')
    dispose()
  })

  it('rejects declared variables that cannot be represented as finite JSON', async () => {
    document.body.innerHTML = labMarkup('let x = Number.POSITIVE_INFINITY;')
    const dispose = installExternalJsLabRuntime(window, document, [doubleNumber])

    document.querySelector<HTMLButtonElement>('[data-builder-js-lab-run]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-builder-js-lab-status]')?.textContent)
      .toContain('números finitos')
    dispose()
  })

  it('identifies a function reference that was not called', async () => {
    document.body.innerHTML = labMarkup('let result = doubleNumber;')
    const dispose = installExternalJsLabRuntime(window, document, [doubleNumber])

    document.querySelector<HTMLButtonElement>('[data-builder-js-lab-run]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-builder-js-lab-status]')?.textContent)
      .toContain('La variable “result” contiene una función')
    expect(document.querySelector('[data-builder-js-lab-status]')?.textContent)
      .toContain('Llámala con paréntesis')
    dispose()
  })

  it('uses deterministic JavaScript identifiers and emits a self-contained installation', () => {
    expect(externalFunctionJavascriptName('double-number')).toBe('doubleNumber')
    expect(javascriptIdentifier('Landmarks de referencia')).toBe('landmarksDeReferencia')
    expect(jsLabDeclaredVariableNames('let first = 1;\nconst second = 2;\nvar third = 3;'))
      .toEqual(['first', 'second', 'third'])
    const source = createJsLabRuntimeInstallationSource()
    expect(source).toContain('AsyncFunction')
    expect(source).toContain('externalFunctionRegistrations')
    expect(source).not.toContain('eval(')
  })

  it('executes from the same self-contained runtime source used by Preview and export', async () => {
    document.body.innerHTML = labMarkup('let x = doubleNumber(6);')
    const source = createFunctionBlockRuntimeSource([doubleNumber])
    Function('window', 'document', source)(window, document)

    document.querySelector<HTMLButtonElement>('[data-builder-js-lab-run]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-builder-js-lab-result]')?.textContent).toBe('{\n  "x": 12\n}')
  })
})
