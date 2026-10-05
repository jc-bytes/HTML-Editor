import grapesjs from 'grapesjs'
import { describe, expect, it } from 'vitest'
import { createExternalFunctionBlocksPlugin, jsLabMarkup, updateJsLabScript } from './external-function-blocks'
import { createVariableDisplayPlugin, variableDisplayMarkup, variableDisplayOptions } from './variable-display-block'

describe('variable display block', () => {
  it('offers declared JS Lab variables as selectable bindings', () => {
    const editor = grapesjs.init({ headless: true, storageManager: false, plugins: [
      createExternalFunctionBlocksPlugin(),
      createVariableDisplayPlugin(),
    ] })
    const root = editor.getWrapper()!
    const lab = root.append(jsLabMarkup())[0]!
    lab.addAttributes({
      'data-builder-runtime-source-id': 'js-lab',
      'data-builder-runtime-output-id': 'variables',
    })
    updateJsLabScript(lab, { code: 'function compare() {\n  const internal = 1;\n  return internal;\n}\nlet error_pose = 0.01;\nlet error_r = 0.004;' })
    root.append(variableDisplayMarkup())

    const labels = variableDisplayOptions(editor).map((option) => option.name)
    expect(labels).toContain('JS Lab · error_pose')
    expect(labels).toContain('JS Lab · error_r')
    expect(labels).not.toContain('JS Lab · internal')
    editor.destroy()
  })

  it('treats the display card as one selectable component', async () => {
    const editor = grapesjs.init({
      headless: true,
      storageManager: false,
      plugins: [createVariableDisplayPlugin()],
    })
    const card = editor.getWrapper()!.append(variableDisplayMarkup())[0]!
    const value = card.components().models[1]!

    expect(value.get('selectable')).toBe(false)
    expect(value.get('layerable')).toBe(false)
    expect(value.getStyle()['pointer-events']).toBe('none')

    editor.select(card)
    expect(editor.getSelected()).toBe(card)
    editor.destroy()
  })
})
