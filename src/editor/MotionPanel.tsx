import { useEffect, useMemo, useState } from 'react'
import type { Component } from 'grapesjs'
import {
  visionModelDefinition,
  visionModelRegistry,
} from '../core/vision'
import type { VisionEvaluatorId, VisionTaskId } from '../core/vision'
import {
  collectionDisplayName,
  isSafePublishableKey,
  readSupabaseAccessToken,
} from './supabase-data'
import type { SupabaseEditorConfig, SupabaseFieldType, SupabaseTableConfig } from './supabase-data'
import { motionComponentTypes, setMotionResultsDesignPreview } from './motion-analysis'
import type { MotionComponentType } from './motion-analysis'

interface MotionPanelProps {
  asWizard?: boolean
  component: Component | null
  config: SupabaseEditorConfig
  notice?: string
  onOpenData?: () => void
  onWizardClose?: () => void
  onWizardSave?: () => void
  tables: SupabaseTableConfig[]
}

interface MotionSettingsDialogProps extends MotionPanelProps {
  onClose: () => void
  onSave: () => void
}

type MotionMode = 'analyze' | 'reference' | 'compare'

const evaluatorLabels: Record<VisionEvaluatorId, string> = {
  quality: 'Calidad de detección',
  sequence: 'Comparar secuencia',
  gesture: 'Reconocer gesto',
  detection: 'Detectar objeto',
  classification: 'Clasificar imagen',
  segmentation: 'Medir región',
}

const modes: Array<{ description: string; id: MotionMode; label: string }> = [
  { id: 'analyze', label: 'En vivo', description: 'Ejecuta el modelo hasta que la persona detiene el análisis.' },
  { id: 'reference', label: 'Crear referencia', description: 'Genera una plantilla temporal reutilizable.' },
  { id: 'compare', label: 'Comparar', description: 'Compara la entrada con una referencia aprobada.' },
]

function compatibleFields(table: SupabaseTableConfig | undefined, types: SupabaseFieldType[]) {
  return table?.fields.filter((field) => types.includes(field.type)) ?? []
}

function SelectField({ label, onChange, options, value }: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  value: string
}) {
  return <label className="gjs-motion-field"><span>{label}</span><select onChange={(event) => onChange(event.target.value)} value={value}>
    <option value="">Seleccionar…</option>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select></label>
}

function Section({ children, description, open = false, title }: {
  children: React.ReactNode
  description: string
  open?: boolean
  title: string
}) {
  return <details className="gjs-motion-section" open={open}>
    <summary><span><strong>{title}</strong><small>{description}</small></span></summary>
    <div className="gjs-motion-section__body">{children}</div>
  </details>
}

export function MotionPanel({ asWizard = false, component, config, notice, onOpenData, onWizardClose, onWizardSave, tables }: MotionPanelProps) {
  const [, setRevision] = useState(0)
  const [wizardStep, setWizardStep] = useState(0)
  const [recordOptions, setRecordOptions] = useState<Array<{ id: string; label: string }>>([])
  const [recordSearch, setRecordSearch] = useState('')
  const [recordStatus, setRecordStatus] = useState('')
  const attributes = component?.getAttributes() ?? {}
  const mode = (attributes['data-motion-mode'] || 'compare') as MotionMode
  const rawComponentType = attributes['data-motion-component-type']
  const componentType = motionComponentTypes.some((item) => item.id === rawComponentType)
    ? rawComponentType as MotionComponentType
    : null
  const definition = motionComponentTypes.find((item) => item.id === componentType)
  const isReferenceView = componentType === 'reference-view'
  const inputSource = attributes['data-motion-input-source'] || 'camera'
  const referenceSource = attributes['data-motion-reference-source'] || 'data'
  const referenceRecordMode = attributes['data-motion-reference-record-mode'] || 'context'
  const referenceTable = tables.find((table) => table.id === attributes['data-motion-reference-table'])
  const referenceSaveMode = attributes['data-motion-reference-save'] || 'download'
  const referenceSaveTable = tables.find((table) => table.id === attributes['data-motion-reference-save-table'])
  const resultTable = tables.find((table) => table.id === attributes['data-motion-result-table'])
  const task = (attributes['data-vision-model'] || 'holistic-landmarker') as VisionTaskId
  const model = visionModelDefinition(task)
  const compatibleEvaluator = (model.evaluators.includes(attributes['data-vision-evaluator'] as VisionEvaluatorId)
    ? attributes['data-vision-evaluator']
    : model.defaultEvaluator) as VisionEvaluatorId
  const evaluator = mode === 'analyze' && compatibleEvaluator === 'sequence'
    ? 'quality' : compatibleEvaluator
  const landmarkSelection = new Set((attributes['data-vision-landmarks'] || 'hands,pose').split(','))
  const referenceDisplay = attributes['data-motion-reference-display'] || 'video-reference'
  const wizardSteps = isReferenceView
    ? [
        { id: 'presentation', label: 'Vista' },
        { id: 'reference', label: 'Origen' },
        { id: 'review', label: 'Revisar' },
      ]
    : [
        { id: 'input', label: 'Entrada' },
        ...mode === 'compare' && evaluator === 'sequence' ? [{ id: 'reference', label: 'Referencia' }] : [],
        { id: 'model', label: 'Modelo' },
        ...mode === 'reference' ? [{ id: 'save', label: 'Guardado' }] : [{ id: 'result', label: 'Resultado' }],
        ...mode === 'compare' ? [{ id: 'save', label: 'Guardado' }] : [],
      ]
  const currentWizardStep = wizardSteps[Math.min(wizardStep, wizardSteps.length - 1)]?.id
  const showStep = (id: string) => !asWizard || currentWizardStep === id
  const tableOptions = useMemo(() => tables.map((table) => ({
    label: collectionDisplayName(table), value: table.id,
  })), [tables])

  useEffect(() => {
    if (referenceSource !== 'data' || referenceRecordMode !== 'specific' || !referenceTable) {
      setRecordOptions([])
      setRecordStatus('')
      return
    }
    const controller = new AbortController()
    const titleField = ['title', 'name', 'display_name', 'email']
      .find((name) => referenceTable.fields.some((field) => field.name === name))
    const load = async () => {
      if (!config.projectUrl || !isSafePublishableKey(config.publishableKey)) {
        setRecordStatus('Conecta Supabase para buscar registros.')
        return
      }
      const accessToken = readSupabaseAccessToken(config.projectUrl)
      if ((referenceTable.access === 'authenticated_read' || referenceTable.access === 'user_owned') && !accessToken) {
        setRecordStatus('Inicia sesión en la vista previa para buscar esta colección.')
        return
      }
      setRecordStatus('Buscando registros…')
      const url = new URL(`${config.projectUrl.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(referenceTable.name)}`)
      url.searchParams.set('select', ['id', titleField].filter(Boolean).join(','))
      url.searchParams.set('limit', '50')
      if (titleField) url.searchParams.set('order', `${titleField}.asc`)
      try {
        const response = await fetch(url.href, { signal: controller.signal, headers: {
          apikey: config.publishableKey,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        } })
        if (!response.ok) throw new Error('No se pudieron consultar los registros.')
        const rows = await response.json() as Array<Record<string, unknown>>
        setRecordOptions(rows.flatMap((row) => {
          if (row.id == null) return []
          const id = String(row.id)
          const title = titleField && row[titleField] != null ? String(row[titleField]) : id
          return [{ id, label: title === id ? id : `${title} · ${id}` }]
        }))
        setRecordStatus(rows.length ? '' : 'Esta colección todavía no tiene registros visibles.')
      } catch (error) {
        if (!controller.signal.aborted) setRecordStatus(error instanceof Error ? error.message : 'No se pudieron consultar los registros.')
      }
    }
    void load()
    return () => controller.abort()
  }, [config.projectUrl, config.publishableKey, referenceRecordMode, referenceSource, referenceTable])

  useEffect(() => { setWizardStep(0) }, [component])

  if (!component) return <div className="gjs-motion-empty">
    <span aria-hidden="true">◎</span>
    <strong>Selecciona una actividad</strong>
    <p>Elige una actividad de movimiento o cualquiera de sus partes en el lienzo.</p>
  </div>

  function write(name: string, value: string) {
    component?.addAttributes({ [name]: value })
    setRevision((revision) => revision + 1)
  }

  function toggle(name: string, checked: boolean) {
    write(name, checked ? 'true' : 'false')
  }

  function toggleResults(checked: boolean) {
    toggle('data-motion-show-results', checked)
    if (component) setMotionResultsDesignPreview(component, checked)
  }

  function selectModel(value: string) {
    const next = visionModelDefinition(value)
    write('data-vision-model', next.id)
    write('data-vision-model-url', next.defaultModelUrl)
    write('data-vision-evaluator', mode === 'analyze' && next.defaultEvaluator === 'sequence' ? 'quality' : next.defaultEvaluator)
    write('data-vision-landmarks', next.landmarkGroups.join(','))
  }

  function toggleLandmark(group: string, checked: boolean) {
    const next = new Set(landmarkSelection)
    if (checked) next.add(group)
    else next.delete(group)
    write('data-vision-landmarks', [...next].join(','))
  }

  function tableFields(table: SupabaseTableConfig | undefined, types: SupabaseFieldType[]) {
    return compatibleFields(table, types).map((field) => ({ label: field.name, value: field.name }))
  }

  let decodedTemplate = ''
  try { decodedTemplate = decodeURIComponent(attributes['data-motion-reference-template'] || '') } catch { decodedTemplate = '' }

  return <div className="gjs-motion-panel">
    {!asWizard && <header className="gjs-motion-panel__header">
      <span className="gjs-motion-panel__icon" aria-hidden="true">◎</span>
      <div><strong>{definition?.label ?? 'Movimiento'}</strong><p>{definition?.description ?? 'Entrada → procesamiento → resultado'}</p></div>
    </header>}

    {!componentType && <><div className="gjs-motion-mode" role="group" aria-label="Operación de movimiento">
      {modes.map((item) => <button
        aria-pressed={mode === item.id}
        className={mode === item.id ? 'active' : ''}
        key={item.id}
        onClick={() => write('data-motion-mode', item.id)}
        title={item.description}
        type="button"
      >{item.label}</button>)}
    </div>
    <p className="gjs-motion-mode__help">{modes.find((item) => item.id === mode)?.description}</p></>}
    {notice && <p className="gjs-motion-notice" role="status">{notice}</p>}

    {asWizard && <nav aria-label="Pasos de configuración" className="gjs-motion-wizard">
      {wizardSteps.map((step, index) => <button aria-current={index === wizardStep ? 'step' : undefined} className={index === wizardStep ? 'active' : index < wizardStep ? 'complete' : ''} key={step.id} onClick={() => setWizardStep(index)} type="button"><span>{index + 1}</span>{step.label}</button>)}
    </nav>}

    {!isReferenceView && showStep('input') && <Section description="Elige de dónde llega la imagen o el movimiento." open title="Entrada">
      <SelectField label="Fuente" onChange={(value) => write('data-motion-input-source', value)} value={inputSource} options={[
        { value: 'camera', label: 'Cámara en vivo' },
        { value: 'element', label: 'Video de esta página' },
        { value: 'url', label: 'Video mediante URL' },
      ]} />
      {inputSource === 'camera' && <SelectField label="Cámara" onChange={(value) => write('data-motion-facing-mode', value)} value={attributes['data-motion-facing-mode'] || 'user'} options={[
        { value: 'user', label: 'Frontal' }, { value: 'environment', label: 'Trasera' },
      ]} />}
      {inputSource === 'element' && <label className="gjs-motion-field"><span>Selector del video</span><input placeholder="#video-practica" value={attributes['data-motion-input-selector'] || ''} onChange={(event) => write('data-motion-input-selector', event.target.value)} /><small>Usa el ID o selector CSS de un video en esta página.</small></label>}
      {inputSource === 'url' && <label className="gjs-motion-field"><span>URL del video</span><input type="url" placeholder="https://…/movimiento.mp4" value={attributes['data-motion-input-url'] || ''} onChange={(event) => write('data-motion-input-url', event.target.value)} /></label>}
      {mode === 'analyze' && inputSource !== 'url'
        ? <p className="gjs-motion-callout">El modelo se ejecutará continuamente hasta que presiones Detener.</p>
        : inputSource !== 'url' && <label className="gjs-motion-field"><span>Duración máxima</span><div className="gjs-motion-number"><input min="1000" max="10000" step="250" type="number" value={attributes['data-motion-duration'] || '3000'} onChange={(event) => write('data-motion-duration', event.target.value)} /><em>ms</em></div></label>}
    </Section>}

    {isReferenceView && showStep('presentation') && <Section description="Elige cómo se presentará el material ya analizado." open title="Tipo de vista">
      <SelectField label="Mostrar" onChange={(value) => write('data-motion-reference-display', value)} value={referenceDisplay} options={[
        { value: 'video', label: 'Video' },
        { value: 'reference', label: 'Referencia analizada' },
        { value: 'frame', label: 'Frame' },
        { value: 'frame-reference', label: 'Frame + referencia' },
        { value: 'video-reference', label: 'Video + referencia' },
      ]} />
      <p className="gjs-motion-callout">{referenceDisplay === 'video' ? 'Reproduce únicamente el video guardado.' : referenceDisplay === 'reference' ? 'Reproduce únicamente los puntos del análisis.' : referenceDisplay === 'frame' ? 'Muestra un frame fijo del video.' : referenceDisplay === 'frame-reference' ? 'Muestra un frame fijo con sus puntos analizados.' : 'Reproduce el video y los puntos analizados al mismo tiempo.'}</p>
    </Section>}

    {((mode === 'compare' && evaluator === 'sequence') || isReferenceView) && showStep('reference') && <Section description={isReferenceView ? 'Selecciona dónde están guardados el video, frame o análisis.' : 'Selecciona la secuencia aprobada que servirá de modelo.'} open title={isReferenceView ? 'Origen' : 'Referencia'}>
      <SelectField label="Origen" onChange={(value) => write('data-motion-reference-source', value)} value={referenceSource} options={[
        { value: 'data', label: 'Registro de una colección' },
        { value: 'url', label: 'Video o plantilla mediante URL' },
        { value: 'template', label: 'Plantilla JSON incrustada' },
      ]} />
      {referenceSource === 'url' && <label className="gjs-motion-field"><span>URL de referencia</span><input type="url" placeholder="https://…/referencia.json" value={attributes['data-motion-reference-url'] || ''} onChange={(event) => write('data-motion-reference-url', event.target.value)} /><small>Una plantilla JSON evita reprocesar el video en cada intento.</small></label>}
      {referenceSource === 'template' && <label className="gjs-motion-field"><span>Plantilla compilada</span><textarea rows={5} placeholder="Pega aquí la plantilla JSON" value={decodedTemplate} onChange={(event) => write('data-motion-reference-template', encodeURIComponent(event.target.value))} /></label>}
      {referenceSource === 'data' && <>
        <SelectField label="Cómo elegir la referencia" onChange={(value) => {
          write('data-motion-reference-record-mode', value)
          if (value !== 'specific') write('data-motion-reference-record-id', '')
        }} value={referenceRecordMode} options={[
          { value: 'context', label: 'Recibir por parámetro de navegación' },
          { value: 'specific', label: 'Elegir un registro ahora' },
          { value: 'first', label: 'El primero de la colección' },
          { value: 'last', label: 'El último de la colección' },
        ]} />
        {referenceRecordMode === 'context' && <p className="gjs-motion-callout"><strong>Parámetro esperado: context-record.</strong> Debe incluir el origen de datos y el ID del registro. Puede enviarlo cualquier tarjeta, botón o enlace que navegue a esta página.</p>}
        <SelectField label="Colección de referencias" onChange={(value) => {
          write('data-motion-reference-table', value)
          write('data-motion-reference-record-id', '')
        }} value={attributes['data-motion-reference-table'] || ''} options={tableOptions} />
        {referenceTable ? <>
          {(referenceRecordMode === 'first' || referenceRecordMode === 'last') && <p className="gjs-motion-callout">Se usará {referenceRecordMode === 'first' ? 'el primer' : 'el último'} registro según el orden configurado para la colección.</p>}
          {referenceRecordMode === 'specific' && <div className="gjs-motion-record-picker">
            <label className="gjs-motion-field"><span>Buscar registro</span><input onChange={(event) => setRecordSearch(event.target.value)} placeholder="Título o identificador" type="search" value={recordSearch} /></label>
            <SelectField label="Registro" onChange={(value) => write('data-motion-reference-record-id', value)} value={attributes['data-motion-reference-record-id'] || ''} options={recordOptions
              .filter((record) => record.label.toLocaleLowerCase().includes(recordSearch.trim().toLocaleLowerCase()))
              .map((record) => ({ label: record.label, value: record.id }))} />
            {recordStatus && <small className="gjs-motion-record-status" role="status">{recordStatus}</small>}
          </div>}
          <SelectField label="Campo de plantilla" onChange={(value) => write('data-motion-reference-template-field', value)} value={attributes['data-motion-reference-template-field'] || ''} options={tableFields(referenceTable, ['json'])} />
          <SelectField label="Video de respaldo" onChange={(value) => write('data-motion-reference-video-field', value)} value={attributes['data-motion-reference-video-field'] || ''} options={tableFields(referenceTable, ['media', 'url'])} />
        </> : <div className="gjs-motion-callout">Selecciona la colección indicada por el parámetro y su campo de referencia.<button onClick={onOpenData} type="button">Abrir Datos</button></div>}
      </>}
    </Section>}

    {!isReferenceView && showStep('model') && <Section description="Elige el modelo, la evaluación y el procesamiento." open={asWizard} title="Modelo y evaluación">
      <SelectField label="Modelo" onChange={selectModel} value={model.id} options={visionModelRegistry.map((item) => ({
        value: item.id, label: item.label,
      }))} />
      <p className="gjs-motion-callout">{model.description}</p>
      <label className="gjs-motion-field"><span>Archivo del modelo</span><input type="url" value={attributes['data-vision-model-url'] || model.defaultModelUrl} onChange={(event) => write('data-vision-model-url', event.target.value)} /><small>Puede ser el modelo predeterminado o uno personalizado compatible con esta tarea.</small></label>
      <SelectField label="Ejecución" onChange={(value) => write('data-vision-delegate', value)} value={attributes['data-vision-delegate'] || 'auto'} options={[
        { value: 'auto', label: 'Automática' }, { value: 'gpu', label: 'GPU' }, { value: 'cpu', label: 'CPU' },
      ]} />
      <SelectField label="Evaluación" onChange={(value) => write('data-vision-evaluator', value)} value={evaluator} options={model.evaluators.map((id) => ({
        value: id, label: evaluatorLabels[id],
      }))} />
      {model.id === 'holistic-landmarker' && <div className="gjs-motion-check-grid">
        <label><input checked={landmarkSelection.has('hands')} onChange={(event) => toggleLandmark('hands', event.target.checked)} type="checkbox" />Manos</label>
        <label><input checked={landmarkSelection.has('pose')} onChange={(event) => toggleLandmark('pose', event.target.checked)} type="checkbox" />Postura</label>
        <label><input checked={landmarkSelection.has('face')} onChange={(event) => toggleLandmark('face', event.target.checked)} type="checkbox" />Rostro</label>
      </div>}
      {(evaluator === 'gesture' || evaluator === 'detection' || evaluator === 'classification') && <label className="gjs-motion-field"><span>Categoría esperada</span><input value={attributes['data-vision-expected-label'] || ''} placeholder={evaluator === 'gesture' ? 'Open_Palm' : evaluator === 'detection' ? 'person' : 'nombre de categoría'} onChange={(event) => write('data-vision-expected-label', event.target.value)} /></label>}
      {evaluator === 'detection' && <label className="gjs-motion-field"><span>Cantidad mínima</span><input min="1" type="number" value={attributes['data-vision-minimum-count'] || '1'} onChange={(event) => write('data-vision-minimum-count', event.target.value)} /></label>}
      {evaluator === 'segmentation' && <div className="gjs-motion-field-grid">
        <label className="gjs-motion-field"><span>Índice de categoría</span><input min="0" type="number" value={attributes['data-vision-category-index'] || '0'} onChange={(event) => write('data-vision-category-index', event.target.value)} /></label>
        <label className="gjs-motion-field"><span>Cobertura mínima</span><input min="0" max="1" step="0.05" type="number" value={attributes['data-vision-minimum-coverage'] || '0.25'} onChange={(event) => write('data-vision-minimum-coverage', event.target.value)} /></label>
      </div>}
      <label className="gjs-motion-field"><span>Confianza mínima</span><input min="0" max="1" step="0.05" type="range" value={attributes['data-vision-confidence'] || '0.5'} onChange={(event) => write('data-vision-confidence', event.target.value)} /><output>{Math.round(Number(attributes['data-vision-confidence'] || .5) * 100)}%</output></label>
      {model.output === 'landmarks' && <><SelectField label="Suavizado temporal" onChange={(value) => write('data-vision-smoothing', value)} value={attributes['data-vision-smoothing'] || '3'} options={[
        { value: '1', label: 'Ninguno' }, { value: '3', label: 'Ligero' }, { value: '5', label: 'Medio' }, { value: '7', label: 'Fuerte' },
      ]} />
      <label className="gjs-motion-switch"><input checked={attributes['data-vision-checkpoints'] !== 'false'} onChange={(event) => toggle('data-vision-checkpoints', event.target.checked)} type="checkbox" /><span><strong>Reducir a puntos clave</strong><small>Conserva cambios significativos de forma, orientación y trayectoria.</small></span></label></>}
    </Section>}

    {mode !== 'reference' && !isReferenceView && showStep('result') && <Section description="Define la evaluación y lo que verá la persona." open={asWizard} title="Resultado">
      {mode === 'compare' && evaluator !== 'quality' && <label className="gjs-motion-field"><span>Puntaje para aprobar</span><div className="gjs-motion-number"><input min="0" max="100" type="number" value={attributes['data-vision-passing-score'] || '75'} onChange={(event) => write('data-vision-passing-score', event.target.value)} /><em>%</em></div></label>}
      <label className="gjs-motion-switch"><input checked={attributes['data-motion-show-results'] === 'true'} onChange={(event) => toggleResults(event.target.checked)} type="checkbox" /><span><strong>Mostrar resultados en la página</strong><small>Añade puntajes, retroalimentación y etapas al lienzo para que puedas modificar su estilo.</small></span></label>
      <p className="gjs-motion-callout">{attributes['data-motion-show-results'] === 'true' ? 'El lienzo muestra valores de ejemplo. En la página publicada se reemplazan con el resultado real.' : 'La comparación se ejecutará sin mostrar el panel de resultados.'}</p>
    </Section>}

    {mode === 'reference' && !isReferenceView && showStep('save') && <Section description="Elige qué ocurrirá con la referencia generada." open={asWizard} title="Guardado">
      <SelectField label="Destino" onChange={(value) => write('data-motion-reference-save', value)} value={referenceSaveMode} options={[
        { value: 'download', label: 'Descargar archivo JSON' },
        { value: 'form', label: 'Guardar con el formulario' },
        { value: 'supabase', label: 'Guardar directamente en Supabase' },
      ]} />
      {referenceSaveMode === 'download' && <p className="gjs-motion-callout">Al terminar la captura se mostrará un botón para descargar la plantilla.</p>}
      {referenceSaveMode === 'form' && <p className="gjs-motion-callout">La plantilla se añade al campo JSON del formulario y se guarda cuando la persona envía ese formulario.</p>}
      {referenceSaveMode === 'supabase' && <>
        <SelectField label="Colección" onChange={(value) => write('data-motion-reference-save-table', value)} value={attributes['data-motion-reference-save-table'] || ''} options={tableOptions} />
        {referenceSaveTable ? <>
          <SelectField label="Registro" onChange={(value) => write('data-motion-reference-save-record-mode', value)} value={attributes['data-motion-reference-save-record-mode'] || 'context'} options={[
            { value: 'context', label: 'El registro seleccionado' },
            { value: 'specific', label: 'Un registro específico' },
          ]} />
          {attributes['data-motion-reference-save-record-mode'] === 'specific' && <label className="gjs-motion-field"><span>ID del registro</span><input value={attributes['data-motion-reference-save-record-id'] || ''} onChange={(event) => write('data-motion-reference-save-record-id', event.target.value)} /></label>}
          <SelectField label="Campo JSON" onChange={(value) => write('data-motion-reference-save-field', value)} value={attributes['data-motion-reference-save-field'] || 'mediapipe_reference'} options={tableFields(referenceSaveTable, ['json'])} />
          <p className="gjs-motion-callout">Se usa la sesión actual y las políticas RLS de esta colección.</p>
        </> : <div className="gjs-motion-callout">Selecciona una colección con un campo JSON.<button onClick={onOpenData} type="button">Abrir Datos</button></div>}
      </>}
    </Section>}

    {mode === 'compare' && !isReferenceView && showStep('save') && <Section description="Guarda los resultados solamente cuando el proyecto lo necesite." open={asWizard} title="Guardado">
      <label className="gjs-motion-switch"><input checked={attributes['data-motion-save'] === 'true'} onChange={(event) => toggle('data-motion-save', event.target.checked)} type="checkbox" /><span><strong>Guardar resultados</strong><small>Usa la conexión de Datos; el procesamiento continúa siendo local.</small></span></label>
      {attributes['data-motion-save'] === 'true' && <>
        <SelectField label="Colección de resultados" onChange={(value) => write('data-motion-result-table', value)} value={attributes['data-motion-result-table'] || ''} options={tableOptions} />
        {resultTable ? <div className="gjs-motion-field-grid">
          <SelectField label="Puntaje" onChange={(value) => write('data-motion-result-score-field', value)} value={attributes['data-motion-result-score-field'] || ''} options={tableFields(resultTable, ['number'])} />
          <SelectField label="Retroalimentación" onChange={(value) => write('data-motion-result-feedback-field', value)} value={attributes['data-motion-result-feedback-field'] || ''} options={tableFields(resultTable, ['text', 'long_text'])} />
          <SelectField label="Detalles" onChange={(value) => write('data-motion-result-details-field', value)} value={attributes['data-motion-result-details-field'] || ''} options={tableFields(resultTable, ['json'])} />
          <SelectField label="Duración" onChange={(value) => write('data-motion-result-duration-field', value)} value={attributes['data-motion-result-duration-field'] || ''} options={tableFields(resultTable, ['number'])} />
          <SelectField label="Relación con el registro" onChange={(value) => write('data-motion-result-relation-field', value)} value={attributes['data-motion-result-relation-field'] || ''} options={tableFields(resultTable, ['uuid'])} />
        </div> : <div className="gjs-motion-callout">Selecciona o crea una colección para mapear solamente campos compatibles.<button onClick={onOpenData} type="button">Abrir Datos</button></div>}
      </>}
    </Section>}

    {isReferenceView && showStep('review') && <Section description="Confirma la vista antes de guardar." open title="Resumen">
      <div className="gjs-motion-review"><strong>{[
        { value: 'video', label: 'Video' }, { value: 'reference', label: 'Referencia analizada' },
        { value: 'frame', label: 'Frame' }, { value: 'frame-reference', label: 'Frame + referencia' },
        { value: 'video-reference', label: 'Video + referencia' },
      ].find((item) => item.value === referenceDisplay)?.label}</strong><span>{referenceSource === 'data' ? 'Desde una colección' : referenceSource === 'url' ? 'Desde una URL' : 'Plantilla incrustada'}</span></div>
      <p className="gjs-motion-callout">Este componente solo presenta material existente. No ejecuta un modelo ni califica a la persona.</p>
    </Section>}

    {asWizard && <div className="gjs-motion-wizard__actions">
      <button onClick={() => wizardStep === 0 ? onWizardClose?.() : setWizardStep((step) => Math.max(0, step - 1))} type="button">{wizardStep === 0 ? 'Cerrar' : 'Atrás'}</button>
      <button onClick={() => wizardStep >= wizardSteps.length - 1 ? onWizardSave?.() : setWizardStep((step) => Math.min(wizardSteps.length - 1, step + 1))} type="button">{wizardStep >= wizardSteps.length - 1 ? 'Guardar cambios' : 'Siguiente'}</button>
    </div>}
  </div>
}

export function MotionSettingsDialog(props: MotionSettingsDialogProps) {
  const rawType = props.component?.getAttributes()['data-motion-component-type']
  const dialogDefinition = motionComponentTypes.find((item) => item.id === rawType)
  const isReferenceView = rawType === 'reference-view'
  return <div className="gjs-motion-dialog-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) props.onClose()
  }}>
    <section aria-label="Editar componente de visión" aria-modal="true" className="gjs-motion-dialog" role="dialog">
      <header className="gjs-motion-dialog__header">
        <div><strong>{isReferenceView ? 'Configurar referencia' : dialogDefinition?.label ?? 'Editar componente de visión'}</strong><small>{isReferenceView ? 'Elige qué mostrar y dónde está guardado.' : dialogDefinition?.description ?? 'Configura la entrada, el modelo y su evaluación.'}</small></div>
        <button aria-label="Cerrar" onClick={props.onClose} type="button">×</button>
      </header>
      <div className="gjs-motion-dialog__content">
        <MotionPanel asWizard component={props.component} config={props.config} notice={props.notice} onOpenData={props.onOpenData} onWizardClose={props.onClose} onWizardSave={props.onSave} tables={props.tables} />
      </div>
    </section>
  </div>
}
