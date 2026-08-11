import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import grapesjs from 'grapesjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MotionPanel } from './MotionPanel'
import { createGridLayoutPlugin, pageGridDefinition, updateLayoutPreset } from './grid-layout'
import { createMotionAnalysisPlugin, motionAnalysisMarkup } from './motion-analysis'
import type { SupabaseEditorConfig } from './supabase-data'

const config: SupabaseEditorConfig = {
  projectUrl: 'https://school.supabase.co',
  publishableKey: 'sb_publishable_test_key_123456789',
  tables: [{
    id: 'table-practices',
    name: 'practices',
    displayName: 'Practices',
    access: 'public_read',
    setupStatus: 'verified',
    fields: [
      { id: 'title', name: 'title', type: 'text' },
      { id: 'media', name: 'media_url', type: 'media' },
      { id: 'template', name: 'mediapipe_reference', type: 'json' },
    ],
    relations: [],
  }],
}

afterEach(() => vi.unstubAllGlobals())

describe('MotionPanel reference records', () => {
  it('configures camera analysis as an explicit capture with a safety duration', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(motionAnalysisMarkup('analyze'))
    const component = editor.getWrapper()!.components().at(0)!

    render(<MotionPanel asWizard component={component} config={config} tables={config.tables} />)

    expect(screen.getByText(/presiona Detener y finalizar/)).toBeInTheDocument()
    const duration = screen.getByText('Duración máxima de seguridad').closest('label')!.querySelector('input')!
    expect(duration).toHaveValue(10_000)
    expect(duration).toHaveAttribute('max', '10000')

    editor.destroy()
    container.remove()
  })

  it('offers a local video upload source only for analysis', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(motionAnalysisMarkup('analyze'))
    const component = editor.getWrapper()!.components().at(0)!

    const view = render(<MotionPanel asWizard component={component} config={config} tables={config.tables} />)
    const source = screen.getByLabelText('Fuente')
    expect(source).toHaveTextContent('Subir video')
    fireEvent.change(source, { target: { value: 'upload' } })
    expect(component.getAttributes()['data-motion-input-source']).toBe('upload')
    expect(screen.getByText(/se procesa localmente/)).toBeInTheDocument()
    expect(screen.getByText(/Se analizan todos los frames presentados/)).toBeInTheDocument()
    expect(screen.queryByText(/presiona Detener y finalizar/)).not.toBeInTheDocument()

    view.unmount()
    editor.setComponents(motionAnalysisMarkup('compare'))
    render(<MotionPanel asWizard component={editor.getWrapper()!.components().at(0)!} config={config} tables={config.tables} />)
    expect(screen.getByLabelText('Fuente')).not.toHaveTextContent('Subir video')

    editor.destroy()
    container.remove()
  })

  it('keeps Analyze focused on MediaPipe input, model, and exposed output', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(motionAnalysisMarkup('analyze'))
    const component = editor.getWrapper()!.components().at(0)!

    render(<MotionPanel component={component} config={config} tables={config.tables} />)

    expect(screen.getByLabelText('Fuente')).toHaveTextContent('Cámara en vivo')
    expect(screen.getByLabelText('Fuente')).toHaveTextContent('Subir video')
    expect(screen.getByText('Modelo MediaPipe')).toBeInTheDocument()
    expect(screen.queryByLabelText('Evaluación')).not.toBeInTheDocument()
    expect(screen.getByText('Salida')).toBeInTheDocument()
    expect(screen.getByText('landmark-frames')).toBeInTheDocument()
    expect(screen.getByText(/revisar el video temporal con sus landmarks/)).toBeInTheDocument()
    expect(screen.queryByText('Resultado')).not.toBeInTheDocument()

    editor.destroy()
    container.remove()
  })

  it('shows an editable result preview when requested', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(motionAnalysisMarkup('compare'))
    const component = editor.getWrapper()!.components().at(0)!

    render(<MotionPanel asWizard component={component} config={config} tables={config.tables} />)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Mostrar tarjeta de resultados/ }))

    expect(component.getAttributes()['data-motion-show-results']).toBe('true')
    expect(component.components().models.find((child) => child.getAttributes()['data-motion-part'] === 'results')
      ?.getAttributes()['data-motion-design-preview']).toBe('true')
    expect(component.toHTML().match(/motion-results__score"/g)).toHaveLength(6)
    expect(screen.getByText(/lienzo muestra la tarjeta con valores de ejemplo/)).toBeInTheDocument()

    editor.destroy()
    container.remove()
  })

  it('places enabled results in their own row below the activity row', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true, plugins: [createGridLayoutPlugin, createMotionAnalysisPlugin()] })
    editor.setComponents(pageGridDefinition())
    const layout = editor.getWrapper()!.components().at(0)!
    const activityRow = layout.components().at(0)!
    updateLayoutPreset(activityRow, 'equal-2')
    const activityColumn = activityRow.components().at(1)!
    const component = activityColumn.append(motionAnalysisMarkup('compare'))[0]!

    render(<MotionPanel asWizard component={component} config={config} tables={config.tables} />)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Mostrar tarjeta de resultados/ }))

    expect(component.components().models.some((child) =>
      child.getAttributes()['data-motion-part'] === 'results')).toBe(false)
    expect(layout.components()).toHaveLength(2)
    const resultsRow = layout.components().at(1)!
    expect(resultsRow.getAttributes()['data-motion-results-row']).toBeTruthy()
    expect(resultsRow.toHTML()).toContain('data-motion-design-preview="true"')
    expect(resultsRow.toHTML()).toContain(
      `data-motion-results-for="${component.getAttributes()['data-motion-results-key']}"`,
    )

    editor.destroy()
    container.remove()
  })

  it('ends reference capture with explicit save destinations', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(motionAnalysisMarkup('reference-capture'))
    const component = editor.getWrapper()!.components().at(0)!

    render(<MotionPanel asWizard component={component} config={config} tables={config.tables} />)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getAllByText('Guardado')).toHaveLength(2)
    const destination = screen.getByLabelText('Destino')
    expect(destination).toHaveTextContent('Descargar archivo JSON')
    expect(destination).toHaveTextContent('Guardar con el formulario')
    expect(destination).toHaveTextContent('Guardar directamente en Supabase')
    fireEvent.change(destination, { target: { value: 'supabase' } })
    expect(screen.getByLabelText('Colección')).toHaveTextContent('Practices')

    editor.destroy()
    container.remove()
  })

  it('uses a presentation-only wizard for reference viewers', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(motionAnalysisMarkup('reference-view'))
    const component = editor.getWrapper()!.components().at(0)!
    component.addAttributes({
      'data-motion-reference-table': 'table-practices',
      'data-motion-reference-record-mode': 'context',
    })

    render(<MotionPanel asWizard component={component} config={config} tables={config.tables} />)

    expect(screen.getByLabelText('Mostrar')).toHaveTextContent('Video + referencia')
    expect(screen.queryByText('Modelo y evaluación')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByLabelText('Dónde está la referencia')).toBeInTheDocument()
    expect(screen.getByLabelText('Qué registro usar')).toHaveTextContent('El registro abierto desde otra página')
    expect(screen.getByText(/envía automáticamente la colección y el ID/)).toBeInTheDocument()
    expect(screen.queryByText(/context-record/)).not.toBeInTheDocument()

    editor.destroy()
    container.remove()
  })

  it('makes selected, first, last, and searchable specific records explicit', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(motionAnalysisMarkup('reference-view'))
    const component = editor.getWrapper()!.components().at(0)!
    component.addAttributes({
      'data-motion-reference-table': 'table-practices',
      'data-motion-reference-record-mode': 'context',
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { id: 'practice-1', title: 'Saludos básicos' },
      { id: 'practice-2', title: 'Alfabeto manual' },
    ]), { status: 200 })))

    render(<MotionPanel component={component} config={config} tables={config.tables} />)
    const recordMode = screen.getByLabelText('Qué registro usar')
    expect(recordMode).toHaveTextContent('El registro abierto desde otra página')
    expect(recordMode).toHaveTextContent('El primer registro de la colección')
    expect(recordMode).toHaveTextContent('El último registro de la colección')
    expect(recordMode).toHaveTextContent('Elegir un registro específico')

    fireEvent.change(recordMode, { target: { value: 'specific' } })
    await waitFor(() => expect(screen.getByLabelText('Registro')).toHaveTextContent('Saludos básicos · practice-1'))
    fireEvent.change(screen.getByLabelText('Buscar registro'), { target: { value: 'alfabeto' } })
    expect(screen.getByLabelText('Registro')).not.toHaveTextContent('Saludos básicos')
    expect(screen.getByLabelText('Registro')).toHaveTextContent('Alfabeto manual · practice-2')

    editor.destroy()
    container.remove()
  })
})
