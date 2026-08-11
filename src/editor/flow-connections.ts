export const FLOW_ACTION_ATTRIBUTE = 'data-builder-flow-action'
export const FLOW_TARGET_ATTRIBUTE = 'data-builder-flow-target'
export const FLOW_DATA_SOURCE_ATTRIBUTE = 'data-builder-flow-data-source'
export const FLOW_OWNER_FIELD_ATTRIBUTE = 'data-builder-flow-owner-field'
export const FLOW_RECORD_FIELD_ATTRIBUTE = 'data-builder-flow-record-field'
export const FLOW_CONTEXT_ATTRIBUTE = 'data-builder-flow-context'
export const FLOW_ACTIVE_LABEL_ATTRIBUTE = 'data-builder-flow-active-label'
export const FLOW_INACTIVE_LABEL_ATTRIBUTE = 'data-builder-flow-inactive-label'
export const FLOW_FIELD_MAP_ATTRIBUTE = 'data-builder-flow-field-map'
export const FLOW_SUCCESS_MESSAGE_ATTRIBUTE = 'data-builder-flow-success-message'
export const FLOW_CONFIRM_MESSAGE_ATTRIBUTE = 'data-builder-flow-confirm-message'
export const FLOW_FIXED_FIELD_ATTRIBUTE = 'data-builder-flow-fixed-field'
export const FLOW_FIXED_VALUE_ATTRIBUTE = 'data-builder-flow-fixed-value'
export const FLOW_RECORD_MODE_ATTRIBUTE = 'data-builder-flow-record-mode'
export const FLOW_VALUE_SOURCE_ATTRIBUTE = 'data-builder-flow-value-source'
export const FLOW_VALUE_INPUT_ATTRIBUTE = 'data-builder-flow-value-input'
export const FLOW_VALUE_AMOUNT_ATTRIBUTE = 'data-builder-flow-value-amount'
export const INTERACTION_ANIMATION_ATTRIBUTE = 'data-builder-interaction'
const FLOW_PREVIEW_MESSAGE_SOURCE = 'builder-screen-flow-preview'

export const INTERACTION_ANIMATIONS = ['none', 'lift', 'pulse', 'glow'] as const
export type InteractionAnimation = typeof INTERACTION_ANIMATIONS[number]

export function readInteractionAnimation(attributes: Record<string, unknown>): InteractionAnimation {
  const animation = attributes[INTERACTION_ANIMATION_ATTRIBUTE]
  return INTERACTION_ANIMATIONS.includes(animation as InteractionAnimation)
    ? animation as InteractionAnimation
    : 'none'
}

export interface ScreenFlowConnection {
  action: 'navigate'
  dataSourceTableId?: string
  recordField?: string
  targetPageId: string
}

export interface RecordToggleConnection {
  action: 'toggle-record'
  activeLabel: string
  contextKey: string
  dataSourceTableId: string
  inactiveLabel: string
  ownerField: string
  recordField: string
}

export type DataActionKind = 'create-record' | 'update-record' | 'delete-record' | 'save-current-user-record' | 'set-record-field'
export type DataActionRecordMode = 'context' | 'current_user'
export type DataActionValueSource = 'fixed' | 'form' | 'current_user' | 'now' | 'toggle' | 'increment'

export interface DataActionConnection {
  action: DataActionKind
  confirmMessage?: string
  contextKey: string
  dataSourceTableId: string
  fieldMappings: Array<{ field: string; inputName: string }>
  fixedField?: string
  fixedValue?: string
  ownerField?: string
  recordMode?: DataActionRecordMode
  successMessage: string
  valueAmount?: number
  valueInputName?: string
  valueSource?: DataActionValueSource
}

export function readScreenFlowConnection(
  attributes: Record<string, unknown>,
): ScreenFlowConnection | null {
  const action = attributes[FLOW_ACTION_ATTRIBUTE]
  const targetPageId = attributes[FLOW_TARGET_ATTRIBUTE]

  if (action !== 'navigate' || typeof targetPageId !== 'string' || !targetPageId.trim()) {
    return null
  }

  const dataSourceTableId = attributes[FLOW_DATA_SOURCE_ATTRIBUTE]
  const recordField = attributes[FLOW_RECORD_FIELD_ATTRIBUTE]
  const hasRelatedRecord = typeof dataSourceTableId === 'string' && dataSourceTableId.trim()
    && typeof recordField === 'string' && recordField.trim()

  return {
    action,
    targetPageId,
    ...(hasRelatedRecord ? {
      dataSourceTableId: dataSourceTableId.trim(),
      recordField: recordField.trim(),
    } : {}),
  }
}

export function screenFlowAttributes(
  targetPageId: string,
  relatedRecord?: { dataSourceTableId: string; recordField: string },
) {
  return {
    [FLOW_ACTION_ATTRIBUTE]: 'navigate',
    [FLOW_TARGET_ATTRIBUTE]: targetPageId,
    ...(relatedRecord ? {
      [FLOW_DATA_SOURCE_ATTRIBUTE]: relatedRecord.dataSourceTableId,
      [FLOW_RECORD_FIELD_ATTRIBUTE]: relatedRecord.recordField,
    } : {}),
  } as const
}

export function readRecordToggleConnection(
  attributes: Record<string, unknown>,
): RecordToggleConnection | null {
  if (attributes[FLOW_ACTION_ATTRIBUTE] !== 'toggle-record') return null
  const dataSourceTableId = attributes[FLOW_DATA_SOURCE_ATTRIBUTE]
  const ownerField = attributes[FLOW_OWNER_FIELD_ATTRIBUTE]
  const recordField = attributes[FLOW_RECORD_FIELD_ATTRIBUTE]
  if (typeof dataSourceTableId !== 'string' || !dataSourceTableId.trim()
    || typeof ownerField !== 'string' || !ownerField.trim()
    || typeof recordField !== 'string' || !recordField.trim()) return null
  return {
    action: 'toggle-record',
    dataSourceTableId,
    ownerField,
    recordField,
    contextKey: typeof attributes[FLOW_CONTEXT_ATTRIBUTE] === 'string'
      ? attributes[FLOW_CONTEXT_ATTRIBUTE] as string
      : 'record',
    activeLabel: typeof attributes[FLOW_ACTIVE_LABEL_ATTRIBUTE] === 'string'
      ? attributes[FLOW_ACTIVE_LABEL_ATTRIBUTE] as string
      : '★ Guardado',
    inactiveLabel: typeof attributes[FLOW_INACTIVE_LABEL_ATTRIBUTE] === 'string'
      ? attributes[FLOW_INACTIVE_LABEL_ATTRIBUTE] as string
      : '☆ Guardar',
  }
}

export function recordToggleAttributes(connection: Omit<RecordToggleConnection, 'action'>) {
  return {
    [FLOW_ACTION_ATTRIBUTE]: 'toggle-record',
    [FLOW_DATA_SOURCE_ATTRIBUTE]: connection.dataSourceTableId,
    [FLOW_OWNER_FIELD_ATTRIBUTE]: connection.ownerField,
    [FLOW_RECORD_FIELD_ATTRIBUTE]: connection.recordField,
    [FLOW_CONTEXT_ATTRIBUTE]: connection.contextKey,
    [FLOW_ACTIVE_LABEL_ATTRIBUTE]: connection.activeLabel,
    [FLOW_INACTIVE_LABEL_ATTRIBUTE]: connection.inactiveLabel,
  } as const
}

export function readDataActionConnection(
  attributes: Record<string, unknown>,
): DataActionConnection | null {
  const action = attributes[FLOW_ACTION_ATTRIBUTE]
  if (action !== 'create-record' && action !== 'update-record' && action !== 'delete-record'
    && action !== 'save-current-user-record' && action !== 'set-record-field') return null
  const dataSourceTableId = attributes[FLOW_DATA_SOURCE_ATTRIBUTE]
  if (typeof dataSourceTableId !== 'string' || !dataSourceTableId.trim()) return null
  let fieldMappings: DataActionConnection['fieldMappings'] = []
  const encodedMappings = attributes[FLOW_FIELD_MAP_ATTRIBUTE]
  if (typeof encodedMappings === 'string') {
    try {
      const parsed = JSON.parse(encodedMappings) as unknown
      if (Array.isArray(parsed)) {
        fieldMappings = parsed.flatMap((mapping) => {
          if (!mapping || typeof mapping !== 'object') return []
          const field = (mapping as Record<string, unknown>).field
          const inputName = (mapping as Record<string, unknown>).inputName
          return typeof field === 'string' && typeof inputName === 'string' && field && inputName
            ? [{ field, inputName }]
            : []
        })
      }
    } catch {
      fieldMappings = []
    }
  }
  const ownerField = attributes[FLOW_OWNER_FIELD_ATTRIBUTE]
  const confirmMessage = attributes[FLOW_CONFIRM_MESSAGE_ATTRIBUTE]
  const successMessage = attributes[FLOW_SUCCESS_MESSAGE_ATTRIBUTE]
  const fixedField = attributes[FLOW_FIXED_FIELD_ATTRIBUTE]
  const fixedValue = attributes[FLOW_FIXED_VALUE_ATTRIBUTE]
  const requestedRecordMode = attributes[FLOW_RECORD_MODE_ATTRIBUTE]
  const requestedValueSource = attributes[FLOW_VALUE_SOURCE_ATTRIBUTE]
  const valueInputName = attributes[FLOW_VALUE_INPUT_ATTRIBUTE]
  const requestedAmount = Number(attributes[FLOW_VALUE_AMOUNT_ATTRIBUTE])
  const recordMode: DataActionRecordMode = requestedRecordMode === 'current_user' ? 'current_user' : 'context'
  const valueSource: DataActionValueSource = ['fixed', 'form', 'current_user', 'now', 'toggle', 'increment']
    .includes(requestedValueSource as string)
    ? requestedValueSource as DataActionValueSource
    : fixedValue === '$now' ? 'now' : 'fixed'
  return {
    action,
    dataSourceTableId,
    contextKey: typeof attributes[FLOW_CONTEXT_ATTRIBUTE] === 'string'
      ? attributes[FLOW_CONTEXT_ATTRIBUTE] as string
      : 'record',
    fieldMappings,
    ...(typeof fixedField === 'string' && fixedField.trim() ? { fixedField: fixedField.trim() } : {}),
    ...(typeof fixedValue === 'string' ? { fixedValue } : {}),
    ...(typeof ownerField === 'string' && ownerField.trim() ? { ownerField } : {}),
    ...(action === 'set-record-field' ? {
      recordMode,
      valueSource,
      ...(typeof valueInputName === 'string' && valueInputName.trim() ? { valueInputName: valueInputName.trim() } : {}),
      ...(Number.isFinite(requestedAmount) ? { valueAmount: requestedAmount } : {}),
    } : {}),
    ...(typeof confirmMessage === 'string' && confirmMessage.trim() ? { confirmMessage } : {}),
    successMessage: typeof successMessage === 'string' && successMessage.trim()
      ? successMessage
      : action === 'create-record' ? 'Registro creado.'
        : action === 'update-record' || action === 'save-current-user-record' || action === 'set-record-field'
          ? 'Cambios guardados.' : 'Registro eliminado.',
  }
}

export function dataActionAttributes(connection: DataActionConnection) {
  return {
    [FLOW_ACTION_ATTRIBUTE]: connection.action,
    [FLOW_DATA_SOURCE_ATTRIBUTE]: connection.dataSourceTableId,
    [FLOW_CONTEXT_ATTRIBUTE]: connection.contextKey,
    [FLOW_FIELD_MAP_ATTRIBUTE]: JSON.stringify(connection.fieldMappings),
    [FLOW_SUCCESS_MESSAGE_ATTRIBUTE]: connection.successMessage,
    ...(connection.ownerField ? { [FLOW_OWNER_FIELD_ATTRIBUTE]: connection.ownerField } : {}),
    ...(connection.confirmMessage ? { [FLOW_CONFIRM_MESSAGE_ATTRIBUTE]: connection.confirmMessage } : {}),
    ...(connection.fixedField ? { [FLOW_FIXED_FIELD_ATTRIBUTE]: connection.fixedField } : {}),
    ...(connection.fixedValue !== undefined ? { [FLOW_FIXED_VALUE_ATTRIBUTE]: connection.fixedValue } : {}),
    ...(connection.recordMode ? { [FLOW_RECORD_MODE_ATTRIBUTE]: connection.recordMode } : {}),
    ...(connection.valueSource ? { [FLOW_VALUE_SOURCE_ATTRIBUTE]: connection.valueSource } : {}),
    ...(connection.valueInputName ? { [FLOW_VALUE_INPUT_ATTRIBUTE]: connection.valueInputName } : {}),
    ...(connection.valueAmount !== undefined ? { [FLOW_VALUE_AMOUNT_ATTRIBUTE]: String(connection.valueAmount) } : {}),
  }
}

interface FlowNavigationOptions {
  isEnabled: () => boolean
  navigate: (pageId: string) => void
  pageExists: (pageId: string) => boolean
}

export function installScreenFlowNavigation(
  document: Document,
  { isEnabled, navigate, pageExists }: FlowNavigationOptions,
) {
  const frameWindow = document.defaultView
  if (!frameWindow) return () => undefined

  function handleClick(event: MouseEvent) {
    if (!isEnabled()) return
    const connectedElement = event.currentTarget as HTMLElement | null
    const targetPageId = connectedElement?.getAttribute(FLOW_TARGET_ATTRIBUTE)?.trim()
    if (!targetPageId || !pageExists(targetPageId)) return

    event.preventDefault()
    event.stopImmediatePropagation()
    globalThis.setTimeout(() => navigate(targetPageId), 0)
  }

  const connectedElements = [...document.querySelectorAll<HTMLElement>(`[${FLOW_TARGET_ATTRIBUTE}]`)]
  const originalOnclickAttributes = new Map(
    connectedElements.map((element) => [element, element.getAttribute('onclick')]),
  )
  const inlinePreviewBridge = [
    'event.preventDefault()',
    'event.stopPropagation()',
    `window.parent.postMessage({source:'${FLOW_PREVIEW_MESSAGE_SOURCE}',targetPageId:this.getAttribute('${FLOW_TARGET_ATTRIBUTE}')},'*')`,
  ].join(';')

  function handleMessage(event: MessageEvent) {
    if (event.source !== frameWindow) return
    const message = event.data as { source?: unknown; targetPageId?: unknown } | null
    if (message?.source !== FLOW_PREVIEW_MESSAGE_SOURCE
      || typeof message.targetPageId !== 'string'
      || !pageExists(message.targetPageId)) return
    globalThis.setTimeout(() => navigate(message.targetPageId as string), 0)
  }

  frameWindow.parent.addEventListener('message', handleMessage)
  connectedElements.forEach((element) => {
    element.setAttribute('onclick', inlinePreviewBridge)
    if (frameWindow.parent === frameWindow) element.addEventListener('click', handleClick, true)
  })
  return () => {
    frameWindow.parent.removeEventListener('message', handleMessage)
    connectedElements.forEach((element) => {
      const originalOnclick = originalOnclickAttributes.get(element)
      if (originalOnclick === null || originalOnclick === undefined) element.removeAttribute('onclick')
      else element.setAttribute('onclick', originalOnclick)
      if (frameWindow.parent === frameWindow) element.removeEventListener('click', handleClick, true)
    })
  }
}
