export const AUTH_ACTION_ATTRIBUTE = 'data-builder-auth-action'
export const AUTH_DESTINATION_ATTRIBUTE = 'data-builder-auth-destination'
export const AUTH_PRESENTATION_ATTRIBUTE = 'data-builder-auth-presentation'
export const AUTH_METADATA_ATTRIBUTE = 'data-builder-auth-metadata'
export const AUTH_METADATA_DEFINITION_ATTRIBUTE = 'data-builder-auth-metadata-definition'
export const AUTH_METADATA_CONTROL_ATTRIBUTE = 'data-builder-auth-metadata-control'
export const AUTH_METADATA_OPTIONS_ATTRIBUTE = 'data-builder-auth-metadata-options'
export const AUTH_METADATA_DIRECTION_ATTRIBUTE = 'data-builder-auth-metadata-direction'
export const AUTH_METADATA_TABLE_ATTRIBUTE = 'data-builder-auth-metadata-table'
export const AUTH_METADATA_FIELD_ATTRIBUTE = 'data-builder-auth-metadata-field'

export const AUTH_ACTIONS = ['login', 'signup', 'logout'] as const
export type AuthAction = typeof AUTH_ACTIONS[number]
export type AuthLogoutPresentation = 'icon' | 'text' | 'both'

export interface AuthComponentSettings {
  action: AuthAction
  destinationPageId?: string
  metadataFields?: AuthMetadataField[]
  presentation?: AuthLogoutPresentation
}

export interface AuthMetadataField {
  key: string
  label: string
  placeholder?: string
  control?: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox'
  options?: Array<{ description?: string; label: string; value: string }>
  direction?: 'horizontal' | 'vertical'
  required?: boolean
  destinationTableId?: string
  destinationField?: string
}

export function readAuthComponentSettings(
  attributes: Record<string, unknown>,
): AuthComponentSettings | null {
  const action = attributes[AUTH_ACTION_ATTRIBUTE]
  if (!AUTH_ACTIONS.includes(action as AuthAction)) return null
  const destination = attributes[AUTH_DESTINATION_ATTRIBUTE]
  const presentation = attributes[AUTH_PRESENTATION_ATTRIBUTE]
  return {
    action: action as AuthAction,
    ...(typeof destination === 'string' && destination.trim()
      ? { destinationPageId: destination.trim() }
      : {}),
    ...(action === 'logout' && (presentation === 'icon' || presentation === 'text' || presentation === 'both')
      ? { presentation }
      : {}),
  }
}

export function readAuthMetadataFields(root: ParentNode): AuthMetadataField[] {
  const definitions = [...root.querySelectorAll<HTMLElement>(`[${AUTH_METADATA_DEFINITION_ATTRIBUTE}]`)]
  if (definitions.length) return definitions.flatMap((definition) => {
    const key = definition.getAttribute(AUTH_METADATA_DEFINITION_ATTRIBUTE)?.trim()
    const label = definition.getAttribute('data-builder-auth-metadata-label')?.trim()
      || definition.querySelector('legend,span')?.textContent?.trim()
      || key
    if (!key || !label) return []
    const requestedControl = definition.getAttribute(AUTH_METADATA_CONTROL_ATTRIBUTE)?.trim()
    const control = ['text', 'textarea', 'select', 'radio', 'checkbox'].includes(requestedControl ?? '')
      ? requestedControl as NonNullable<AuthMetadataField['control']>
      : 'text'
    let options: NonNullable<AuthMetadataField['options']> = []
    try {
      const parsed = JSON.parse(definition.getAttribute(AUTH_METADATA_OPTIONS_ATTRIBUTE) ?? '[]') as unknown
      if (Array.isArray(parsed)) options = parsed.flatMap((option) => {
        if (!option || typeof option !== 'object') return []
        const optionLabel = (option as Record<string, unknown>).label
        const value = (option as Record<string, unknown>).value
        const description = (option as Record<string, unknown>).description
        return typeof optionLabel === 'string' && typeof value === 'string' && optionLabel && value
          ? [{ label: optionLabel, value, ...(typeof description === 'string' && description.trim()
            ? { description: description.trim() } : {}) }]
          : []
      })
    } catch {
      options = []
    }
    const input = definition.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[${AUTH_METADATA_ATTRIBUTE}]`,
    )
    const destinationTableId = definition.getAttribute(AUTH_METADATA_TABLE_ATTRIBUTE)?.trim()
    const destinationField = definition.getAttribute(AUTH_METADATA_FIELD_ATTRIBUTE)?.trim()
    const direction = definition.getAttribute(AUTH_METADATA_DIRECTION_ATTRIBUTE) === 'vertical'
      ? 'vertical' : 'horizontal'
    return [{
      key,
      label,
      control,
      ...(input?.getAttribute('placeholder')?.trim() ? { placeholder: input.getAttribute('placeholder')!.trim() } : {}),
      ...(options.length ? { options } : {}),
      ...(control === 'radio' ? { direction } : {}),
      required: Boolean(definition.querySelector('[required]')),
      ...(destinationTableId ? { destinationTableId } : {}),
      ...(destinationField ? { destinationField } : {}),
    }]
  })
  return [...root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    `[${AUTH_METADATA_ATTRIBUTE}][name]`,
  )].flatMap((field) => {
    const key = field.name.trim()
    if (!key) return []
    const label = field.closest('label')?.querySelector('span')?.textContent?.trim()
      || field.getAttribute('aria-label')?.trim()
      || key
    return [{
      key,
      label,
      ...(field instanceof HTMLInputElement && field.placeholder.trim()
        ? { placeholder: field.placeholder.trim() }
        : {}),
      control: field instanceof HTMLTextAreaElement ? 'textarea'
        : field instanceof HTMLSelectElement ? 'select'
          : field instanceof HTMLInputElement && field.type === 'radio' ? 'radio'
            : field instanceof HTMLInputElement && field.type === 'checkbox' ? 'checkbox' : 'text',
      required: field.required,
    }]
  })
}
