import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthSettingsDialog } from './AuthSettingsDialog'

describe('AuthSettingsDialog', () => {
  it('selects how the logout button is presented', () => {
    const onSave = vi.fn()
    render(<AuthSettingsDialog
      action="logout"
      destinationPageId=""
      metadataFields={[]}
      onClose={vi.fn()}
      onSave={onSave}
      pages={[]}
      presentation="icon"
    />)

    fireEvent.click(screen.getByRole('radio', { name: /Icono y texto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSave).toHaveBeenCalledWith('', [], 'both')
  })

  it('saves the selected destination page', () => {
    const onSave = vi.fn()
    render(<AuthSettingsDialog
      action="login"
      destinationPageId=""
      metadataFields={[]}
      onClose={vi.fn()}
      onSave={onSave}
      pages={[{ id: 'dashboard', name: 'Panel' }]}
    />)

    fireEvent.change(screen.getByLabelText('Destino después de autenticar'), {
      target: { value: 'dashboard' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSave).toHaveBeenCalledWith('dashboard', [])
  })

  it('adds and validates signup metadata mappings', () => {
    const onSave = vi.fn()
    render(<AuthSettingsDialog
      action="signup"
      destinationPageId=""
      metadataFields={[]}
      onClose={vi.fn()}
      onSave={onSave}
      pages={[]}
    />)

    fireEvent.click(screen.getByRole('button', { name: '+ Añadir pregunta' }))
    fireEvent.change(screen.getByLabelText('Etiqueta del campo 1'), {
      target: { value: 'Primer nombre' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSave).toHaveBeenCalledWith('', [{
      key: 'primer_nombre', label: 'Primer nombre', control: 'text', required: false,
    }])
  })

  it('configures a required radio question and maps it to a profile field', () => {
    const onSave = vi.fn()
    render(<AuthSettingsDialog
      action="signup" destinationPageId="" metadataFields={[]} onClose={vi.fn()}
      onSave={onSave} pages={[]}
      tables={[{
        id: 'profiles-table', name: 'profiles', displayName: 'Profiles', access: 'user_owned',
        fields: [{ id: 'role', name: 'user_role', type: 'text' }], relations: [],
      }]}
    />)

    fireEvent.click(screen.getByRole('button', { name: '+ Añadir pregunta' }))
    fireEvent.change(screen.getByLabelText('Etiqueta del campo 1'), { target: { value: 'Choose your role' } })
    fireEvent.change(screen.getByLabelText('Tipo de respuesta del campo 1'), { target: { value: 'radio' } })
    expect(screen.getByRole('option', { name: 'Profiles · profiles' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Colección de destino del campo 1'), { target: { value: 'profiles-table' } })
    expect(screen.getByLabelText('Campo de destino del campo 1')).toHaveValue('user_role')
    fireEvent.change(screen.getByLabelText('Texto visible de la opción 1'), { target: { value: 'Student' } })
    fireEvent.change(screen.getByLabelText('Texto visible de la opción 2'), { target: { value: 'Teacher' } })
    fireEvent.change(screen.getByLabelText('Descripción de la opción 1'), { target: { value: 'Learn and practice' } })
    fireEvent.change(screen.getByLabelText('Dirección de las opciones del campo 1'), { target: { value: 'horizontal' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Respuesta obligatoria' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSave).toHaveBeenCalledWith('', [{
      key: 'user_role', label: 'Choose your role', control: 'radio', direction: 'horizontal', required: true,
      destinationTableId: 'profiles-table', destinationField: 'user_role',
      options: [{ label: 'Student', value: 'student', description: 'Learn and practice' }, { label: 'Teacher', value: 'teacher' }],
    }])
  })

  it('adds another option when Enter is pressed on the last saved value', () => {
    render(<AuthSettingsDialog
      action="signup" destinationPageId="" metadataFields={[]} onClose={vi.fn()}
      onSave={vi.fn()} pages={[]}
    />)

    fireEvent.click(screen.getByRole('button', { name: '+ Añadir pregunta' }))
    fireEvent.change(screen.getByLabelText('Tipo de respuesta del campo 1'), { target: { value: 'radio' } })
    fireEvent.keyDown(screen.getByLabelText('Texto visible de la opción 2'), { key: 'Enter' })

    expect(screen.getByLabelText('Texto visible de la opción 3')).toBeInTheDocument()
  })

  it('keeps the field dropdown visible until a collection is chosen', () => {
    render(<AuthSettingsDialog
      action="signup" destinationPageId="" metadataFields={[]} onClose={vi.fn()}
      onSave={vi.fn()} pages={[]}
    />)

    fireEvent.click(screen.getByRole('button', { name: '+ Añadir pregunta' }))

    expect(screen.getByLabelText('Colección de destino del campo 1')).toHaveValue('')
    expect(screen.getByLabelText('Campo de destino del campo 1')).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Elige una colección' })).toBeInTheDocument()
  })

  it('opens only one additional question at a time', () => {
    render(<AuthSettingsDialog
      action="signup" destinationPageId="" metadataFields={[]} onClose={vi.fn()}
      onSave={vi.fn()} pages={[]}
    />)

    fireEvent.click(screen.getByRole('button', { name: '+ Añadir pregunta' }))
    fireEvent.change(screen.getByLabelText('Etiqueta del campo 1'), { target: { value: 'Name' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Añadir pregunta' }))

    expect(screen.getByLabelText('Etiqueta del campo 1')).not.toBeVisible()
    expect(screen.getByLabelText('Etiqueta del campo 2')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Abrir pregunta 1: Name' }))

    expect(screen.getByLabelText('Etiqueta del campo 1')).toBeVisible()
    expect(screen.getByLabelText('Etiqueta del campo 2')).not.toBeVisible()
  })
})
