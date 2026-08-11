import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { registeredExternalLibraries } from '../external-libraries/catalog'
import { ExternalLibrariesPanel } from './ExternalLibrariesPanel'

describe('ExternalLibrariesPanel', () => {
  it('renders registered library functions and inspectable metadata from the shared catalog', () => {
    render(<ExternalLibrariesPanel libraries={registeredExternalLibraries} />)

    expect(screen.queryByLabelText('Configuración de JS Lab')).not.toBeInTheDocument()
    const library = screen.getByText('Math Tools').closest('details')!
    expect(library).not.toHaveAttribute('open')
    fireEvent.click(screen.getByText('Math Tools'))

    expect(library).toHaveAttribute('open')
    expect(screen.getByText('Double Number')).toBeInTheDocument()
    expect(screen.getByText('Average')).toBeInTheDocument()
    expect(screen.getByText('Maximum')).toBeInTheDocument()

    const average = screen.getByText('Average').closest('details')!
    fireEvent.click(screen.getByText('Average'))
    expect(within(average).getByText('Returns the arithmetic mean of two numbers.')).toBeInTheDocument()
    expect(within(average).getByText('left: number, right: number')).toBeInTheDocument()

    const arrayLibrary = screen.getByText('Array Tools').closest('details')!
    fireEvent.click(screen.getByText('Array Tools'))
    expect(within(arrayLibrary).getByText('Flatten')).toBeInTheDocument()
    expect(within(arrayLibrary).getByText('Sum')).toBeInTheDocument()
    expect(within(arrayLibrary).getByText('First Row')).toBeInTheDocument()
    const flatten = within(arrayLibrary).getByText('Flatten').closest('details')!
    fireEvent.click(within(arrayLibrary).getByText('Flatten'))
    expect(within(flatten).getByText('matrix: number[][]')).toBeInTheDocument()
    expect(within(flatten).getByText('number[]')).toBeInTheDocument()

    const sequenceLibrary = screen.getByText('Sequence Tools').closest('details')!
    fireEvent.click(screen.getByText('Sequence Tools'))
    const countFrames = within(sequenceLibrary).getByText('Count Frames').closest('details')!
    fireEvent.click(within(sequenceLibrary).getByText('Count Frames'))
    expect(within(countFrames).getByText('sequence: json')).toBeInTheDocument()
    expect(within(countFrames).getByText('number')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Añadir/ })).toBeDisabled()
  })

  it('preflights a selected file and requires explicit executable-code confirmation', async () => {
    const onAddLibrary = vi.fn(async () => undefined)
    render(<ExternalLibrariesPanel
      libraries={registeredExternalLibraries}
      onAddLibrary={onAddLibrary}
    />)
    const file = new File([
      'export default { id: "simple-tools", name: "Simple Tools", description: "Proof", functions: [] }',
    ], 'simple-tools.js', { type: 'text/javascript' })

    fireEvent.change(screen.getByLabelText('Seleccionar biblioteca JavaScript'), {
      target: { files: [file] },
    })

    expect(await screen.findByText('Código JavaScript ejecutable')).toBeInTheDocument()
    expect(onAddLibrary).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Importar y ejecutar' }))
    await vi.waitFor(() => expect(onAddLibrary).toHaveBeenCalledWith({
      fileName: 'simple-tools.js',
      source: expect.stringContaining('export default'),
    }))
  })

  it('uses shared library metadata to add a function to JS Lab and inspect read-only code', async () => {
    const onUseFunction = vi.fn(async () => undefined)
    render(<ExternalLibrariesPanel
      libraries={registeredExternalLibraries}
      onUseFunction={onUseFunction}
    />)
    fireEvent.click(screen.getByText('Math Tools'))
    const doubleNumber = screen.getByText('Double Number').closest('details')!
    fireEvent.click(screen.getByText('Double Number'))

    fireEvent.click(within(doubleNumber).getByRole('button', { name: 'Usar' }))
    await vi.waitFor(() => expect(onUseFunction).toHaveBeenCalledWith('math-tools', 'double-number'))
    expect(await screen.findByText('Double Number se añadió a JS Lab.')).toBeInTheDocument()

    fireEvent.click(within(doubleNumber).getByText('Ver código'))
    expect(within(doubleNumber).getByText(/value \* 2/)).toBeInTheDocument()
  })

})
