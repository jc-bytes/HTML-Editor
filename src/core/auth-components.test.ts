import { describe, expect, it } from 'vitest'
import {
  AUTH_ACTION_ATTRIBUTE,
  AUTH_DESTINATION_ATTRIBUTE,
  readAuthMetadataFields,
  readAuthComponentSettings,
} from './auth-components'

describe('auth component settings', () => {
  it('reads an auth action and optional success destination', () => {
    expect(readAuthComponentSettings({
      [AUTH_ACTION_ATTRIBUTE]: 'login',
      [AUTH_DESTINATION_ATTRIBUTE]: 'dashboard',
    })).toEqual({ action: 'login', destinationPageId: 'dashboard' })
  })

  it('rejects unsupported auth actions', () => {
    expect(readAuthComponentSettings({ [AUTH_ACTION_ATTRIBUTE]: 'reset-password' })).toBeNull()
  })

  it('reads signup metadata fields and their visible labels', () => {
    const document = new DOMParser().parseFromString(`
      <form>
        <label><span>Nombre</span><input data-builder-auth-metadata name="first_name" placeholder="Tu nombre"></label>
        <label><span>Rol</span><select data-builder-auth-metadata name="role"><option>Docente</option></select></label>
      </form>
    `, 'text/html')

    expect(readAuthMetadataFields(document)).toEqual([
      { key: 'first_name', label: 'Nombre', placeholder: 'Tu nombre', control: 'text', required: false },
      { key: 'role', label: 'Rol', control: 'select', required: false },
    ])
  })

  it('reads a complete signup question definition', () => {
    const document = new DOMParser().parseFromString(`<form>
      <fieldset data-builder-auth-metadata-definition="user_role"
        data-builder-auth-metadata-label="Role"
        data-builder-auth-metadata-control="radio"
        data-builder-auth-metadata-direction="horizontal"
        data-builder-auth-metadata-options='[{"label":"Student","value":"student","description":"Learn and practice"}]'
        data-builder-auth-metadata-table="profiles-table"
        data-builder-auth-metadata-field="user_role">
        <input data-builder-auth-metadata name="user_role" type="radio" value="student" required>
      </fieldset>
    </form>`, 'text/html')

    expect(readAuthMetadataFields(document)).toEqual([{
      key: 'user_role', label: 'Role', control: 'radio', required: true,
      direction: 'horizontal',
      options: [{ label: 'Student', value: 'student', description: 'Learn and practice' }],
      destinationTableId: 'profiles-table', destinationField: 'user_role',
    }])
  })
})
