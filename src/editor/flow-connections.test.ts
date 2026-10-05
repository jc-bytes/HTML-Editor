import { describe, expect, it, vi } from 'vitest'
import {
  FLOW_ACTION_ATTRIBUTE,
  FLOW_TARGET_ATTRIBUTE,
  FLOW_DATA_SOURCE_ATTRIBUTE,
  INTERACTION_ANIMATION_ATTRIBUTE,
  installScreenFlowNavigation,
  readInteractionAnimation,
  readRecordToggleConnection,
  readScreenFlowConnection,
  screenFlowAttributes,
  recordToggleAttributes,
  dataActionAttributes,
  readDataActionConnection,
} from './flow-connections'

describe('screen flow connections', () => {
  it('serializes and reads a screen destination', () => {
    const attributes = screenFlowAttributes('catalog')

    expect(attributes).toEqual({
      [FLOW_ACTION_ATTRIBUTE]: 'navigate',
      [FLOW_TARGET_ATTRIBUTE]: 'catalog',
    })
    expect(readScreenFlowConnection(attributes)).toEqual({
      action: 'navigate',
      targetPageId: 'catalog',
    })
  })

  it('serializes a related record to open on the destination screen', () => {
    const attributes = screenFlowAttributes('practice', {
      dataSourceTableId: 'table-practices',
      recordField: 'practice_id',
    })

    expect(readScreenFlowConnection(attributes)).toEqual({
      action: 'navigate',
      targetPageId: 'practice',
      dataSourceTableId: 'table-practices',
      recordField: 'practice_id',
    })
  })

  it('ignores incomplete connection attributes', () => {
    expect(readScreenFlowConnection({ [FLOW_ACTION_ATTRIBUTE]: 'navigate' })).toBeNull()
    expect(readScreenFlowConnection({ [FLOW_TARGET_ATTRIBUTE]: 'catalog' })).toBeNull()
  })

  it('serializes and reads a record toggle action', () => {
    const attributes = recordToggleAttributes({
      dataSourceTableId: 'table-favorites',
      ownerField: 'user_id',
      recordField: 'practice_id',
      contextKey: 'record',
      activeLabel: '★ Guardado',
      inactiveLabel: '☆ Guardar',
    })

    expect(attributes[FLOW_DATA_SOURCE_ATTRIBUTE]).toBe('table-favorites')
    expect(readRecordToggleConnection(attributes)).toEqual({
      action: 'toggle-record',
      dataSourceTableId: 'table-favorites',
      ownerField: 'user_id',
      recordField: 'practice_id',
      contextKey: 'record',
      activeLabel: '★ Guardado',
      inactiveLabel: '☆ Guardar',
    })
  })

  it('serializes and reads a generic data action', () => {
    const attributes = dataActionAttributes({
      action: 'create-record',
      dataSourceTableId: 'table-projects',
      contextKey: 'record',
      ownerField: 'user_id',
      fieldMappings: [{ field: 'title', inputName: 'project_title' }],
      successMessage: 'Proyecto creado.',
    })

    expect(readDataActionConnection(attributes)).toEqual({
      action: 'create-record',
      dataSourceTableId: 'table-projects',
      contextKey: 'record',
      ownerField: 'user_id',
      fieldMappings: [{ field: 'title', inputName: 'project_title' }],
      successMessage: 'Proyecto creado.',
    })
  })

  it('serializes runtime variables as data-action field sources', () => {
    const attributes = dataActionAttributes({
      action: 'create-record',
      dataSourceTableId: 'practice-attempts',
      contextKey: 'record',
      ownerField: 'user_id',
      fieldMappings: [{
        field: 'pose_error',
        runtimeValue: { key: 'js-lab::variables', path: ['error_pose'] },
      }],
      successMessage: 'Resultado guardado.',
    })

    expect(readDataActionConnection(attributes)).toMatchObject({
      fieldMappings: [{
        field: 'pose_error',
        runtimeValue: { key: 'js-lab::variables', path: ['error_pose'] },
      }],
    })
  })

  it('serializes the current-user save action', () => {
    const attributes = dataActionAttributes({
      action: 'save-current-user-record',
      dataSourceTableId: 'profiles',
      contextKey: 'record',
      ownerField: 'user_id',
      fieldMappings: [{ field: 'display_name', inputName: 'display_name' }],
      successMessage: 'Cambios guardados.',
    })

    expect(readDataActionConnection(attributes)).toMatchObject({
      action: 'save-current-user-record',
      ownerField: 'user_id',
      fieldMappings: [{ field: 'display_name', inputName: 'display_name' }],
    })
  })

  it('serializes a manager field change', () => {
    const attributes = dataActionAttributes({
      action: 'set-record-field',
      dataSourceTableId: 'articles',
      contextKey: 'record',
      fieldMappings: [],
      fixedField: 'published',
      fixedValue: 'true',
      recordMode: 'current_user',
      valueSource: 'increment',
      valueAmount: 2,
      successMessage: 'Publicado.',
    })

    expect(readDataActionConnection(attributes)).toMatchObject({
      action: 'set-record-field',
      fixedField: 'published',
      fixedValue: 'true',
      recordMode: 'current_user',
      valueSource: 'increment',
      valueAmount: 2,
      successMessage: 'Publicado.',
    })
  })

  it('reads supported interaction animations and safely defaults unknown values', () => {
    expect(readInteractionAnimation({ [INTERACTION_ANIMATION_ATTRIBUTE]: 'lift' })).toBe('lift')
    expect(readInteractionAnimation({ [INTERACTION_ANIMATION_ATTRIBUTE]: 'spin-forever' })).toBe('none')
    expect(readInteractionAnimation({})).toBe('none')
  })

  it('navigates from a connected element only while preview is enabled', async () => {
    document.body.innerHTML = `
      <button ${FLOW_TARGET_ATTRIBUTE}="practice"><span>Start</span></button>
    `
    const navigate = vi.fn()
    let enabled = false
    const cleanup = installScreenFlowNavigation(document, {
      isEnabled: () => enabled,
      navigate,
      pageExists: (pageId) => pageId === 'practice',
    })
    const label = document.querySelector('span')!

    label.click()
    expect(navigate).not.toHaveBeenCalled()

    enabled = true
    label.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(navigate).toHaveBeenCalledWith('practice')

    cleanup()
  })
})
