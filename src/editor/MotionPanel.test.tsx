import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import grapesjs from 'grapesjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MotionPanel } from './MotionPanel'
import { motionAnalysisMarkup } from './motion-analysis'
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
  it('configures analysis as continuous instead of asking for a duration', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const editor = grapesjs.init({ container, headless: true })
    editor.setComponents(motionAnalysisMarkup('analyze'))
    const component = editor.getWrapper()!.components().at(0)!

    render(<MotionPanel asWizard component={component} config={config} tables={config.tables} />)

    expect(screen.getByText(/continuamente hasta que presiones Detener/)).toBeInTheDocument()
    expect(screen.queryByText('Duración máxima')).not.toBeInTheDocument()

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
    fireEvent.click(screen.getByRole('checkbox', { name: /Mostrar resultados en la página/ }))

    expect(component.getAttributes()['data-motion-show-results']).toBe('true')
    expect(component.components().models.find((child) => child.getAttributes()['data-motion-part'] === 'results')
      ?.getAttributes()['data-motion-design-preview']).toBe('true')
    expect(component.toHTML().match(/motion-results__score"/g)).toHaveLength(6)

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

    render(<MotionPanel asWizard component={component} config={config} tables={config.tables} />)

    expect(screen.getByLabelText('Mostrar')).toHaveTextContent('Video + referencia')
    expect(screen.queryByText('Modelo y evaluación')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByLabelText('Origen')).toBeInTheDocument()
    expect(screen.getByLabelText('Cómo elegir la referencia')).toHaveTextContent('Recibir por parámetro de navegación')
    expect(screen.getByText(/Parámetro esperado: context-record/)).toBeInTheDocument()

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
    const recordMode = screen.getByLabelText('Cómo elegir la referencia')
    expect(recordMode).toHaveTextContent('Recibir por parámetro de navegación')
    expect(recordMode).toHaveTextContent('El primero de la colección')
    expect(recordMode).toHaveTextContent('El último de la colección')
    expect(recordMode).toHaveTextContent('Elegir un registro ahora')

    fireEvent.change(recordMode, { target: { value: 'specific' } })
    await waitFor(() => expect(screen.getByLabelText('Registro')).toHaveTextContent('Saludos básicos · practice-1'))
    fireEvent.change(screen.getByLabelText('Buscar registro'), { target: { value: 'alfabeto' } })
    expect(screen.getByLabelText('Registro')).not.toHaveTextContent('Saludos básicos')
    expect(screen.getByLabelText('Registro')).toHaveTextContent('Alfabeto manual · practice-2')

    editor.destroy()
    container.remove()
  })
})
