import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NavbarLinkSettingsDialog } from './NavbarLinkSettingsDialog'

describe('navbar link settings dialog', () => {
  it('edits the label, destination, and active state', () => {
    const onSave = vi.fn()
    render(<NavbarLinkSettingsDialog
      initialSettings={{ active: false, label: 'Servicios' }}
      onClose={() => undefined}
      onSave={onSave}
    />)

    fireEvent.change(screen.getByLabelText('Texto del enlace'), { target: { value: 'Proyectos' } })
    fireEvent.click(screen.getByLabelText('Elemento activo'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSave).toHaveBeenCalledWith({ active: true, label: 'Proyectos' })
  })
})
