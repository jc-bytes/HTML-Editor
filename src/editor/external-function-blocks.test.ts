import { describe, expect, it } from 'vitest'
import grapesjs from 'grapesjs'
import { registeredExternalLibraries } from '../external-libraries/catalog'
import {
  createExternalFunctionBlocksPlugin,
  DEFAULT_JS_LAB_CODE,
  ensureJsLab,
  externalFunctionCallStatement,
  findJsLab,
  jsLabRuntimeSourceOptions,
  readJsLabSettings,
  updateJsLabScript,
  JS_LAB_BLOCK_ID,
  JS_LAB_COMPONENT_TYPE,
  JS_LAB_PUBLIC_ATTRIBUTE,
} from './external-function-blocks'

function createEditor() {
  const container = document.createElement('div')
  document.body.append(container)
  const editor = grapesjs.init({
    container,
    headless: true,
    plugins: [createExternalFunctionBlocksPlugin()],
  })
  return { container, editor }
}

function registration(libraryId: string, functionId: string) {
  return registeredExternalLibraries.find((library) => library.id === libraryId)!
    .functions.find(({ metadata }) => metadata.id === functionId)!
}

describe('editable JS Lab function experience', () => {
  it('keeps functions out of Add and exposes one generic JS Lab block', () => {
    const { container, editor } = createEditor()

    expect(editor.BlockManager.get(JS_LAB_BLOCK_ID)?.get('label')).toBe('JS Lab')
    expect(editor.BlockManager.getAll().models.some((block) => (
      String(block.get('category')).includes('Funciones ·')
    ))).toBe(false)
    expect(editor.BlockManager.getAll().models.some((block) => block.get('label') === 'Double Number')).toBe(false)

    editor.destroy()
    container.remove()
  })

  it('creates one editable lab per page with persisted code/output metadata', () => {
    const { container, editor } = createEditor()
    const first = ensureJsLab(editor)
    const second = ensureJsLab(editor)

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.component).toBe(first.component)
    expect(findJsLab(editor)?.get('type')).toBe(JS_LAB_COMPONENT_TYPE)
    expect(first.component.getAttributes()[JS_LAB_PUBLIC_ATTRIBUTE]).toBe('true')
    expect(readJsLabSettings(first.component)).toEqual({
      code: DEFAULT_JS_LAB_CODE,
      outputExpression: 'result',
      outputType: 'number',
    })
    expect(editor.getHtml()).toContain('data-builder-js-lab-code-editor')
    expect(editor.getHtml()).toContain('data-builder-js-lab-run')

    updateJsLabScript(first.component, {
      code: 'let x = doubleNumber(5);',
      outputExpression: 'x',
      outputType: 'number',
    })
    expect(readJsLabSettings(first.component).code).toBe('let x = doubleNumber(5);')
    expect(editor.getHtml()).toContain('data-builder-js-lab-output-expression="x"')
    expect(editor.getHtml()).toContain('let x = doubleNumber(5);</textarea>')

    editor.destroy()
    container.remove()
  })

  it('round-trips edited JS Lab code through GrapesJS project data', () => {
    const first = createEditor()
    const lab = ensureJsLab(first.editor).component
    updateJsLabScript(lab, {
      code: 'let first = doubleNumber(5);\nlet second = doubleNumber(first);',
      outputExpression: 'second',
      outputType: 'number',
    })
    const project = first.editor.getProjectData()

    const restored = createEditor()
    restored.editor.loadProjectData(project)

    expect(readJsLabSettings(findJsLab(restored.editor)!)).toEqual({
      code: 'let first = doubleNumber(5);\nlet second = doubleNumber(first);',
      outputExpression: 'second',
      outputType: 'number',
    })
    expect(findJsLab(restored.editor)).toBeDefined()
    expect(restored.editor.getHtml()).toContain('let first = doubleNumber(5);')
    expect(restored.editor.getHtml()).toContain('let second = doubleNumber(first);</textarea>')

    first.editor.destroy()
    first.container.remove()
    restored.editor.destroy()
    restored.container.remove()
  })

  it('turns shared function metadata into editable calls instead of function definitions', () => {
    const double = externalFunctionCallStatement(
      registration('math-tools', 'double-number').metadata,
      '',
    )
    expect(double).toEqual({
      functionName: 'doubleNumber',
      statement: 'let doubleNumberResult = doubleNumber(5);',
      variable: 'doubleNumberResult',
    })
    expect(double.statement).not.toContain('function doubleNumber')

    const repeated = externalFunctionCallStatement(
      registration('math-tools', 'double-number').metadata,
      double.statement,
    )
    expect(repeated.variable).toBe('doubleNumberResult2')
  })

  it('inserts compatible runtime producer variables into generated calls', () => {
    const { container, editor } = createEditor()
    editor.setComponents(`<section data-builder-runtime-source-id="reference-video"
      data-builder-runtime-source-name="Landmarks de referencia"
      data-builder-runtime-output-id="landmark-frames"
      data-builder-runtime-output-name="Landmark frames"
      data-builder-runtime-output-type="json"></section>`)
    const sources = jsLabRuntimeSourceOptions(editor)
    const call = externalFunctionCallStatement(
      {
        description: 'Consumes landmark JSON.', id: 'extract-landmarks',
        inputs: [{ name: 'landmark-frames', type: 'json' }], name: 'Extract landmarks', output: { type: 'number[][]' },
      },
      '',
      sources,
    )

    expect(sources).toEqual([expect.objectContaining({
      alias: 'landmarksDeReferencia',
      key: 'reference-video::landmark-frames',
      type: 'json',
    })])
    expect(call.statement).toContain('extractLandmarks(runtimeValues.landmarksDeReferencia)')
    editor.destroy()
    container.remove()
  })

  it('generates imported-function calls through the same metadata-only mechanism', () => {
    const call = externalFunctionCallStatement({
      description: 'Multiplies.',
      id: 'multiply',
      inputs: [{ name: 'left', type: 'number' }, { name: 'right', type: 'number' }],
      name: 'Multiply',
      output: { type: 'number' },
    }, '')
    expect(call.statement).toBe('let multiplyResult = multiply(0, 0);')
  })
})
