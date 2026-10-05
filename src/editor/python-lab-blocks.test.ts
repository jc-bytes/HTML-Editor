import grapesjs from 'grapesjs'
import { describe, expect, it } from 'vitest'
import {
  appendPythonUsage,
  appendPythonCodeItem,
  createPythonLabPlugin,
  ensurePythonLab,
  findPythonLab,
  PYTHON_LAB_BLOCK_ID,
  readPythonLabCode,
  readPythonLabItems,
  usePythonLibrary,
  updatePythonLabCode,
} from './python-lab-blocks'

function createEditor() {
  const container = document.createElement('div')
  document.body.append(container)
  const editor = grapesjs.init({ container, headless: true, plugins: [createPythonLabPlugin()] })
  return { container, editor }
}

describe('Python Lab block', () => {
  it('is available in the Code block category', () => {
    const fixture = createEditor()
    const block = fixture.editor.BlockManager.get(PYTHON_LAB_BLOCK_ID)
    expect(block?.get('label')).toBe('Python Lab')
    expect(block?.getCategoryLabel()).toBe('Código')
    expect(block?.getContent()).toContain('data-builder-python-lab')
    fixture.editor.destroy(); fixture.container.remove()
  })

  it('creates one editable Python Lab per page and persists its code', () => {
    const first = createEditor()
    const lab = ensurePythonLab(first.editor)
    expect(lab.created).toBe(true)
    expect(ensurePythonLab(first.editor).component).toBe(lab.component)
    updatePythonLabCode(lab.component, 'result = 42')
    const project = first.editor.getProjectData()

    const restored = createEditor()
    restored.editor.loadProjectData(project)
    expect(readPythonLabCode(findPythonLab(restored.editor)!)).toBe('result = 42')
    expect(restored.editor.getHtml()).toContain('data-builder-python-lab-run')
    first.editor.destroy(); first.container.remove()
    restored.editor.destroy(); restored.container.remove()
  })

  it('adds Python usage to the matching lab without copying library definitions into it', () => {
    const fixture = createEditor()
    const lab = ensurePythonLab(fixture.editor).component
    const usage = 'def double(value):\n    return value * 2\n\nresult = double(5)'
    appendPythonUsage(lab, usage)
    expect(readPythonLabCode(lab)).toContain('def double(value):')
    expect(readPythonLabCode(lab)).toContain('result = double(5)')
    fixture.editor.destroy(); fixture.container.remove()
  })

  it('stores documentation metadata separately from the exact imported source', () => {
    const fixture = createEditor()
    const lab = ensurePythonLab(fixture.editor).component
    appendPythonCodeItem(lab, {
      description: 'Doubles a value.', inputs: 'value: number', name: 'Double',
      outputType: 'number', source: 'def double(value):\n    return value * 2',
    })
    expect(readPythonLabCode(lab)).toBe('def double(value):\n    return value * 2')
    expect(readPythonLabItems(lab)).toEqual([expect.objectContaining({
      description: 'Doubles a value.', inputs: 'value: number', name: 'Double', outputType: 'number',
    })])
    fixture.editor.destroy(); fixture.container.remove()
  })

  it('keeps reusable definitions hidden and inserts only the usage example into Python Lab', () => {
    const fixture = createEditor()
    const lab = ensurePythonLab(fixture.editor).component
    usePythonLibrary(lab, {
      description: 'Helpers.',
      functions: [{
        description: 'Doubles.', id: 'source', inputs: 'value: number', name: 'Double',
        outputType: 'number', usage: 'result = double(5)',
      }],
      id: 'python-double', language: 'python', moduleName: 'python_double', name: 'Double helpers',
      provenance: 'imported', source: 'def double(value):\n    return value * 2',
    }, 'source')
    expect(readPythonLabCode(lab)).toBe('result = double(5)')
    expect(readPythonLabCode(lab)).not.toContain('def double')
    expect(fixture.editor.getHtml()).toContain('data-builder-python-lab-libraries')
    fixture.editor.destroy(); fixture.container.remove()
  })
})
