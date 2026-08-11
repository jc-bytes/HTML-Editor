import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DynamicFieldActionDialog, type DynamicFieldActionDraft } from './DynamicFieldActionDialog'

const initial: DynamicFieldActionDraft = {
  confirmMessage: '', field: 'published', fixedValue: 'true', recordMode: 'context',
  successMessage: 'Información actualizada.', tableId: 'articles', valueAmount: 1,
  valueInputName: '', valueSource: 'fixed',
}

const articles = {
  id: 'articles', name: 'articles', displayName: 'Artículos', access: 'public_read' as const,
  fields: [
    { id: 'score', name: 'score', type: 'number' as const },
    { id: 'reviewed_at', name: 'reviewed_at', type: 'datetime' as const },
  ],
  relations: [],
}

const profiles = {
  id: 'profiles', name: 'profiles', displayName: 'Perfiles', access: 'user_owned' as const,
  fields: [{ id: 'featured', name: 'featured', type: 'boolean' as const }], relations: [],
}

describe('DynamicFieldActionDialog', () => {
  it('shows choices that match the selected field and saves a numeric change', () => {
    const onSave = vi.fn()
    render(<DynamicFieldActionDialog contextTables={[articles]} currentUserTables={[profiles]}
      formInputs={['score_input']} initial={initial} onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Campo que cambiará'), { target: { value: 'score' } })
    expect(screen.getByRole('option', { name: 'Sumar o restar' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Cambiar Sí / No' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Origen del nuevo valor'), { target: { value: 'increment' } })
    fireEvent.change(screen.getByLabelText('Cantidad que se sumará'), { target: { value: '-3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar acción' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      tableId: 'articles', field: 'score', recordMode: 'context', valueSource: 'increment', valueAmount: -3,
    }))
  })

  it('switches to the current user record', () => {
    const onSave = vi.fn()
    render(<DynamicFieldActionDialog contextTables={[articles]} currentUserTables={[profiles]}
      formInputs={[]} initial={{ ...initial, field: 'reviewed_at' }} onClose={vi.fn()} onSave={onSave} />)

    fireEvent.click(screen.getByRole('radio', { name: /Mis datos/ }))
    expect(screen.getByLabelText('Colección que cambiará')).toHaveValue('profiles')
    fireEvent.change(screen.getByLabelText('Origen del nuevo valor'), { target: { value: 'toggle' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar acción' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      tableId: 'profiles', field: 'featured', recordMode: 'current_user', valueSource: 'toggle',
    }))
  })

  it('marks a current date value so the runtime exports only the date', () => {
    const onSave = vi.fn()
    const datedArticles = { ...articles, access: 'user_owned' as const, fields: [
      { id: 'due_on', name: 'due_on', type: 'date' as const },
    ] }
    render(<DynamicFieldActionDialog contextTables={[datedArticles]} currentUserTables={[]}
      formInputs={[]} initial={{ ...initial, tableId: 'articles', field: 'due_on' }}
      onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Origen del nuevo valor'), { target: { value: 'now' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar acción' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      field: 'due_on', valueSource: 'now', fixedValue: '$today',
    }))
  })
})
