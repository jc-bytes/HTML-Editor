import { describe, expect, it } from 'vitest'
import grapesjs from 'grapesjs'
import {
  createMotionAnalysisPlugin,
  motionAnalysisMarkup,
  MOTION_ANALYSIS_BLOCK_ID,
  MOTION_CAPTURE_REFERENCE_BLOCK_ID,
  MOTION_COMPARE_BLOCK_ID,
  MOTION_VIEW_REFERENCE_BLOCK_ID,
  motionComponentStyles,
  readMotionActivities,
  normalizeMotionActivity,
} from './motion-analysis'

function documentWith(markup: string) {
  return new DOMParser().parseFromString(markup, 'text/html')
}

describe('motion editor contract', () => {
  it('builds an editable composition instead of a fixed monolith', () => {
    const document = documentWith(motionAnalysisMarkup('analyze'))
    const root = document.querySelector('[data-motion-activity]')

    expect(root?.querySelector('[data-motion-part="input"]')).not.toBeNull()
    expect(root?.querySelector('[data-motion-part="controls"]')).not.toBeNull()
    expect(root?.querySelector('[data-motion-part="results"]')).toBeNull()
    expect(root?.querySelector('[data-motion-ready]')).not.toBeNull()
    expect(root?.querySelector('[data-motion-replay]')?.textContent).toBe('Ver análisis')
    expect(root?.querySelector('[data-motion-ready]')?.textContent).toContain('Revisa visualmente los puntos')
    expect(root?.querySelector('[data-motion-file]')).not.toBeNull()
    expect(root?.querySelector('[data-motion-segment-start]')).toBeNull()
    expect(root?.querySelector('[data-motion-crop-edit]')).toBeNull()
    expect(documentWith(motionAnalysisMarkup('compare')).querySelector('[data-motion-part="results"]')).not.toBeNull()
    expect(root?.getAttribute('style')).toBeNull()
  })

  it('offers only Analyze and presentation blocks', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true, plugins: [createMotionAnalysisPlugin()] })

    const motionBlockIds = [
      MOTION_VIEW_REFERENCE_BLOCK_ID,
      MOTION_ANALYSIS_BLOCK_ID,
    ]
    expect(motionBlockIds.map((id) => editor.BlockManager.get(id)?.get('label'))).toEqual([
      'Ver referencia',
      'Analizar video',
    ])
    const motionBlockMedia = motionBlockIds.map((id) => String(editor.BlockManager.get(id)?.get('media')))
    expect(new Set(motionBlockMedia).size).toBe(2)
    motionBlockMedia.forEach((media) => {
      expect(media).toContain('<svg')
      expect(media).toContain('currentColor')
    })
    expect(editor.BlockManager.get(MOTION_COMPARE_BLOCK_ID)).toBeUndefined()
    expect(editor.BlockManager.get(MOTION_CAPTURE_REFERENCE_BLOCK_ID)).toBeUndefined()
    expect(documentWith(motionAnalysisMarkup('reference-view')).querySelector('[data-motion-activity]')
      ?.getAttribute('data-motion-component-type')).toBe('reference-view')
    expect(documentWith(motionAnalysisMarkup('reference-view')).querySelector('[data-motion-reference-replay]'))
      .not.toBeNull()
    expect(documentWith(motionAnalysisMarkup('reference-capture')).querySelector('[data-motion-activity]')
      ?.getAttribute('data-motion-mode')).toBe('reference')
    expect(motionComponentStyles).toContain('[data-motion-component-type="reference-view"] .motion-input')
    expect(motionComponentStyles).toContain('object-fit:contain')
    expect(motionComponentStyles).toContain('aspect-ratio:4/3')
    expect(motionComponentStyles).toContain('.motion-input video{object-fit:cover')
    expect(motionComponentStyles).not.toContain('min-height:clamp(15rem,42vw,28rem)')
    expect(editor.getCss()).toContain('.motion-activity[data-motion-component-type="reference-view"]')
    expect(editor.getCss()).toContain('aspect-ratio:16/9')

    editor.destroy()
    container.remove()
  })

  it('removes obsolete Compare and Capture components when loading a saved project', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true, plugins: [createMotionAnalysisPlugin()] })
    editor.setComponents(`${motionAnalysisMarkup('compare')}${motionAnalysisMarkup('reference-capture')}${motionAnalysisMarkup('analyze')}`)

    editor.trigger('project:loaded', {
      initial: false,
      options: {},
      project: editor.getProjectData(),
    })

    const activities = editor.getWrapper()!.components().models.filter((component) =>
      component.getAttributes()['data-motion-activity'])
    expect(activities).toHaveLength(1)
    expect(activities[0].getAttributes()['data-motion-component-type']).toBe('analyze')

    editor.destroy()
    container.remove()
  })

  it('supports analyze and reference-authoring operations without requiring a comparison reference', () => {
    const activities = readMotionActivities(documentWith(`
      <section data-motion-activity="true" data-motion-mode="analyze" data-motion-input-source="url" data-motion-input-url="https://media.example/input.mp4"></section>
      <section data-motion-activity="true" data-motion-mode="reference" data-motion-input-source="element" data-motion-input-selector="#source-video" data-motion-duration="4000"></section>
    `), 'motion', [])

    expect(activities[0]).toEqual(expect.objectContaining({
      mode: 'analyze', input: { type: 'url', url: 'https://media.example/input.mp4' }, reference: { type: 'none' },
    }))
    expect(activities[1]).toEqual(expect.objectContaining({
      mode: 'reference', input: { type: 'element', selector: '#source-video', durationMs: 4000 }, reference: { type: 'none' },
      referenceOutput: { type: 'download' },
    }))
  })

  it('exports camera analysis as an explicit stoppable landmark capture', () => {
    const [activity] = readMotionActivities(documentWith(motionAnalysisMarkup('analyze')), 'motion', [])

    expect(activity).toEqual(expect.objectContaining({
      mode: 'analyze',
      runtimeSourceId: expect.any(String),
      input: { type: 'camera', durationMs: 10000, facingMode: 'user', continuous: true },
      evaluator: { type: 'quality' },
    }))
    const root = documentWith(motionAnalysisMarkup('analyze')).querySelector('[data-motion-activity]')!
    expect(root.getAttribute('data-builder-runtime-output-id')).toBe('landmark-frames')
    expect(root.getAttribute('data-builder-runtime-output-type')).toBe('json')
  })

  it('exports uploaded video analysis as a local runtime input', () => {
    const [activity] = readMotionActivities(documentWith(`
      <section data-motion-activity="true" data-motion-mode="analyze"
        data-motion-input-source="upload"></section>
    `), 'motion', [])

    expect(activity).toEqual(expect.objectContaining({
      mode: 'analyze',
      input: { type: 'upload' },
    }))
  })

  it('preserves stable Analyze source IDs and does not expose comparison blocks as producers', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(`${motionAnalysisMarkup('analyze')}${motionAnalysisMarkup('compare')}`)
    const analyze = editor.getWrapper()!.components().at(0)!
    const compare = editor.getWrapper()!.components().at(1)!
    normalizeMotionActivity(analyze)
    normalizeMotionActivity(compare)
    const sourceId = analyze.getAttributes()['data-builder-runtime-source-id']
    normalizeMotionActivity(analyze)
    expect(analyze.getAttributes()['data-builder-runtime-source-id']).toBe(sourceId)
    expect(compare.getAttributes()['data-builder-runtime-source-id']).toBeUndefined()
    editor.destroy()
    container.remove()
  })

  it('exports direct Supabase reference storage separately from comparison results', () => {
    const activities = readMotionActivities(documentWith(`
      <section data-motion-activity="true" data-motion-mode="reference"
        data-motion-reference-save="supabase"
        data-motion-reference-save-table="practices"
        data-motion-reference-save-context="record"
        data-motion-reference-save-record-mode="specific"
        data-motion-reference-save-record-id="practice-42"
        data-motion-reference-save-field="mediapipe_reference"></section>
    `), 'motion', [{ id: 'practices', name: 'practices', displayName: 'Practices', access: 'public_read', fields: [], relations: [] }])

    expect(activities[0]?.referenceOutput).toEqual({
      type: 'supabase',
      dataSourceId: 'supabase-practices',
      contextKey: 'record',
      recordMode: 'specific',
      recordId: 'practice-42',
      templateField: 'mediapipe_reference',
    })
  })

  it('exports the chosen reference-record strategy', () => {
    const activities = readMotionActivities(documentWith(`
      <section data-motion-activity="true" data-motion-mode="compare"
        data-motion-component-type="compare" data-motion-reference-source="data"
        data-motion-reference-table="practices" data-motion-reference-context="record"
        data-motion-reference-record-mode="specific" data-motion-reference-record-id="practice-42"
        data-motion-reference-video-field="media_url"
        data-motion-reference-template-field="mediapipe_reference"></section>
    `), 'motion', [{ id: 'practices', name: 'practices', displayName: 'Practices', access: 'public_read', fields: [], relations: [] }])

    expect(activities[0]?.reference).toEqual({
      type: 'data',
      dataSourceId: 'supabase-practices',
      contextKey: 'record',
      recordMode: 'specific',
      recordId: 'practice-42',
      videoField: 'media_url',
      templateField: 'mediapipe_reference',
    })
  })

  it('normalizes malformed compositions without leaving duplicate parts', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(`<section data-motion-activity="true" data-motion-component-type="analyze" data-motion-layout-version="3">
      <header data-motion-part="heading"></header>
      <div data-motion-part="input"><video></video><div data-motion-part="input"></div><div data-motion-part="results"></div></div>
      <div data-motion-part="controls"></div>
      <div data-motion-part="results"></div>
    </section>`)
    const component = editor.getWrapper()!.components().at(0)!

    expect(normalizeMotionActivity(component)).toBe(true)
    expect(component.components().models.map((child) => child.getAttributes()['data-motion-part']))
      .toEqual(['heading', 'input', 'controls'])
    const allParts: unknown[] = []
    const collect = (parent: typeof component) => parent.components().models.forEach((child) => {
      allParts.push(child.getAttributes()['data-motion-part'])
      collect(child)
    })
    collect(component)
    expect(allParts.filter((part) => part === 'input')).toHaveLength(1)
    expect(allParts.filter((part) => part === 'controls')).toHaveLength(1)
    expect(allParts.filter((part) => part === 'results')).toHaveLength(0)

    editor.destroy()
    container.remove()
  })

  it('removes a fixed height from existing reference viewers while retaining other styles', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(motionAnalysisMarkup('reference-view'))
    const component = editor.getWrapper()!.components().at(0)!
    component.setStyle({ height: '1100px', width: '90%', 'margin-left': '5vw' })

    expect(normalizeMotionActivity(component)).toBe(true)
    expect(component.getStyle()).toMatchObject({ height: 'auto', width: '90%', 'margin-left': '5vw' })

    editor.destroy()
    container.remove()
  })
})
