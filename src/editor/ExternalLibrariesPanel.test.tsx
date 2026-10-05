import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { registeredExternalLibraries } from '../external-libraries/catalog'
import { loadPreparedImportedLibrary, restorePersistedImportedLibrary } from '../external-libraries/imported-library'
import { ExternalLibrariesPanel, prepareJavaScriptCodeDraft } from './ExternalLibrariesPanel'

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
    expect(screen.getByRole('button', { name: 'Importar .js' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Añadir código JavaScript' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Importar .py' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Añadir código Python' })).toBeDisabled()
  })

  it('documents pasted JavaScript with structured inputs before registering it', async () => {
    const onAddJavaScriptCode = vi.fn(async () => undefined)
    render(<ExternalLibrariesPanel libraries={registeredExternalLibraries} onAddJavaScriptCode={onAddJavaScriptCode} />)
    fireEvent.click(screen.getByRole('button', { name: 'Añadir código JavaScript' }))

    expect(screen.getByRole('dialog', { name: 'Añadir código JavaScript' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nombre de la biblioteca JavaScript'), { target: { value: 'Student Math' } })
    fireEvent.change(screen.getByLabelText('Descripción de la biblioteca JavaScript'), { target: { value: 'Student calculations.' } })
    fireEvent.change(screen.getByLabelText('Función JavaScript expuesta'), { target: { value: 'multiply' } })
    fireEvent.click(screen.getByRole('button', { name: /Añadir entrada/ }))
    fireEvent.change(screen.getByLabelText('Nombre de entrada JavaScript 1'), { target: { value: 'left' } })
    fireEvent.change(screen.getByLabelText('Tipo de entrada JavaScript 1'), { target: { value: 'number' } })
    fireEvent.click(screen.getByRole('button', { name: /Añadir entrada/ }))
    fireEvent.change(screen.getByLabelText('Nombre de entrada JavaScript 2'), { target: { value: 'right' } })
    fireEvent.change(screen.getByLabelText('Tipo de entrada JavaScript 2'), { target: { value: 'number' } })
    fireEvent.change(screen.getByLabelText('Salida del código JavaScript'), { target: { value: 'number' } })
    fireEvent.change(screen.getByLabelText('Ejemplo de uso del código JavaScript'), { target: { value: 'let product = multiply(6, 7);' } })
    fireEvent.change(screen.getByLabelText('Código JavaScript para añadir'), { target: { value: 'function multiply(left, right) { return left * right; }' } })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir a Librerías' }))

    await vi.waitFor(() => expect(onAddJavaScriptCode).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Student calculations.', exposedFunction: 'multiply', functionDescription: 'Student calculations.',
      functionName: 'Student Math', inputs: [{ name: 'left', type: 'number' }, { name: 'right', type: 'number' }],
      name: 'Student Math', outputType: 'number', source: 'function multiply(left, right) { return left * right; }',
      usage: 'let product = multiply(6, 7);',
    })))
  })

  it('documents a raw global API without function input/output metadata', async () => {
    const onAddJavaScriptCode = vi.fn(async () => undefined)
    render(<ExternalLibrariesPanel libraries={[]} onAddJavaScriptCode={onAddJavaScriptCode} />)
    fireEvent.click(screen.getByRole('button', { name: 'Añadir código JavaScript' }))
    fireEvent.click(screen.getByLabelText('Biblioteca global'))
    fireEvent.change(screen.getByLabelText('Nombre de la biblioteca JavaScript'), { target: { value: 'Dynamic Time Warping' } })
    fireEvent.change(screen.getByLabelText('Descripción de la biblioteca JavaScript'), { target: { value: 'Exact DTW API.' } })
    fireEvent.change(screen.getByLabelText('Ejemplo de uso del código JavaScript'), { target: { value: 'let distance = new DynamicTimeWarping(a, b, manhattan).getDistance();' } })
    fireEvent.change(screen.getByLabelText('Código JavaScript para añadir'), { target: { value: 'this.DynamicTimeWarping = function DynamicTimeWarping() {};' } })

    expect(screen.queryByText('Entradas')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Salida del código JavaScript')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre de la función en JS Lab')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Función JavaScript expuesta')).toHaveValue('DynamicTimeWarping')
    fireEvent.click(screen.getByRole('button', { name: 'Añadir a Librerías' }))

    await vi.waitFor(() => expect(onAddJavaScriptCode).toHaveBeenCalledWith(expect.objectContaining({
      exposedFunction: 'DynamicTimeWarping', functionDescription: 'Exact DTW API.',
      mode: 'raw-global', name: 'Dynamic Time Warping',
    })))
  })

  it('opens the documentation modal for a raw local JavaScript file', async () => {
    const onAddJavaScriptCode = vi.fn(async () => undefined)
    render(<ExternalLibrariesPanel libraries={[]} onAddJavaScriptCode={onAddJavaScriptCode} onAddLibrary={vi.fn()} />)
    const file = new File(['function subtract(left, right) { return left - right; }'], 'student-tools.js', { type: 'text/javascript' })
    fireEvent.change(screen.getByLabelText('Seleccionar biblioteca JavaScript'), { target: { files: [file] } })

    expect(await screen.findByRole('dialog', { name: 'Añadir código JavaScript' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre de la biblioteca JavaScript')).toHaveValue('student tools')
    expect(screen.getByLabelText('Función JavaScript expuesta')).toHaveValue('subtract')
    expect(screen.getByLabelText('Código JavaScript para añadir')).toHaveValue('function subtract(left, right) { return left - right; }')
  })

  it('wraps documented JavaScript and preserves helper functions, metadata, and usage', async () => {
    const prepared = prepareJavaScriptCodeDraft({
      description: 'Distance helpers.', exposedFunction: 'distance', functionDescription: 'Calculates a distance.',
      functionName: 'Distance', inputs: [{ name: 'left', type: 'number' }, { name: 'right', type: 'number' }],
      name: 'Distance Tools', outputType: 'number',
      source: 'function difference(left, right) { return Math.abs(left - right); }\nfunction distance(left, right) { return difference(left, right); }',
      usage: 'let result = distance(2, 5);',
    })
    const loaded = await loadPreparedImportedLibrary(prepared, async (source) => ({
      default: Function(source.replace('export default', 'return'))(),
    }))
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.value.functions[0].metadata).toEqual(expect.objectContaining({
      exposedFunction: 'distance', source: expect.stringContaining('function difference'), usage: 'let result = distance(2, 5);',
    }))
    const restored = restorePersistedImportedLibrary(loaded.value)
    expect(restored.ok).toBe(true)
    if (restored.ok) expect(restored.value.functions[0].implementation(2 as never, 5 as never)).toBe(3)
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

  it('does not expose integrated Python functions and requires an explicit Python Lab or .py import', async () => {
    const onAddPythonCode = vi.fn(async () => undefined)
    render(<ExternalLibrariesPanel libraries={registeredExternalLibraries} onAddPythonCode={onAddPythonCode} />)
    expect(screen.getAllByText('JS').length).toBeGreaterThan(0)
    expect(screen.queryByText('MediaPipe Landmark Utilities')).not.toBeInTheDocument()
    const file = new File(['result = 42'], 'student-tools.py', { type: 'text/x-python' })
    fireEvent.change(screen.getByLabelText('Seleccionar archivo Python'), { target: { files: [file] } })
    expect(await screen.findByRole('dialog', { name: 'Añadir código Python' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Descripción del código Python'), { target: { value: 'Student proof.' } })
    fireEvent.change(screen.getByLabelText('Entradas del código Python'), { target: { value: 'value: number' } })
    fireEvent.change(screen.getByLabelText('Ejemplo de uso del código Python'), { target: { value: 'result = double(21)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir a Librerías' }))
    await vi.waitFor(() => expect(onAddPythonCode).toHaveBeenCalledWith({
      description: 'Student proof.', fileName: 'student-tools.py', inputs: 'value: number',
      name: 'student tools', outputType: 'json', source: 'result = 42', usage: 'result = double(21)',
    }))
    expect(await screen.findByText('student tools se añadió en Librerías.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Añadir código Python' }))
    expect(screen.getByLabelText('Código Python para añadir')).toHaveValue('')
  })

  it('renders imported Python code as a reusable library and adds it to Python Lab only through Usar', async () => {
    const onUseFunction = vi.fn(async () => undefined)
    render(<ExternalLibrariesPanel libraries={[{
      description: 'Reusable landmark helpers.',
      functions: [{
        description: 'Extracts landmark coordinates.', id: 'source',
        inputs: 'results: MediaPipe frame', name: 'MediaPipe Landmark Utilities',
        outputType: 'json', usage: '# Use MediaPipe Landmark Utilities',
      }],
      id: 'python-mediapipe-landmark-utilities', language: 'python',
      moduleName: 'python_mediapipe_landmark_utilities', name: 'MediaPipe Landmark Utilities',
      provenance: 'imported', source: 'def extract_landmarks(results):\n    return results',
    }]} onUseFunction={onUseFunction} />)

    const library = screen.getByText('MediaPipe Landmark Utilities', { selector: 'summary span' }).closest('details')!
    fireEvent.click(within(library).getByText('MediaPipe Landmark Utilities', { selector: 'summary span' }))
    expect(within(library).getByText('Importada')).toBeInTheDocument()
    const item = within(library).getByText('MediaPipe Landmark Utilities', { selector: '.gjs-library-function summary' }).closest('details')!
    fireEvent.click(within(item).getByText('MediaPipe Landmark Utilities'))
    expect(within(item).getByText('results: MediaPipe frame')).toBeInTheDocument()
    expect(within(item).getByText('json')).toBeInTheDocument()
    expect(within(item).getByText('# Use MediaPipe Landmark Utilities')).toBeInTheDocument()
    fireEvent.click(within(item).getByRole('button', { name: 'Usar' }))
    await vi.waitFor(() => expect(onUseFunction).toHaveBeenCalledWith('python-mediapipe-landmark-utilities', 'source'))
    expect(await screen.findByText('MediaPipe Landmark Utilities se añadió a Python Lab.')).toBeInTheDocument()
    fireEvent.click(within(item).getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('dialog', { name: 'Añadir código Python' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ejemplo de uso del código Python')).toHaveValue('# Use MediaPipe Landmark Utilities')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

})
