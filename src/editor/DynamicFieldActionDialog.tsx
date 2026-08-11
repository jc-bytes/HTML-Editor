import { useMemo, useState } from 'react'
import type { DataActionRecordMode, DataActionValueSource } from './flow-connections'
import { collectionDisplayName, fieldTypeLabels, type SupabaseTableConfig } from './supabase-data'

export interface DynamicFieldActionDraft {
  confirmMessage: string
  field: string
  fixedValue: string
  recordMode: DataActionRecordMode
  successMessage: string
  tableId: string
  valueAmount: number
  valueInputName: string
  valueSource: DataActionValueSource
}

export function DynamicFieldActionDialog({
  contextTables,
  currentUserTables,
  formInputs,
  initial,
  onClose,
  onSave,
}: {
  contextTables: SupabaseTableConfig[]
  currentUserTables: SupabaseTableConfig[]
  formInputs: string[]
  initial: DynamicFieldActionDraft
  onClose: () => void
  onSave: (draft: DynamicFieldActionDraft) => void
}) {
  const initialMode = initial.recordMode === 'current_user' && currentUserTables.length
    ? 'current_user'
    : contextTables.length ? 'context' : 'current_user'
  const [draft, setDraft] = useState<DynamicFieldActionDraft>({ ...initial, recordMode: initialMode })
  const tables = draft.recordMode === 'current_user' ? currentUserTables : contextTables
  const table = tables.find((candidate) => candidate.id === draft.tableId) ?? tables[0]
  const fields = useMemo(() => {
    if (!table) return []
    return [
      ...(table.access === 'public_read' ? [{ id: 'published', name: 'published', type: 'boolean' as const }] : []),
      ...table.fields,
    ]
  }, [table])
  const field = fields.find((candidate) => candidate.name === draft.field) ?? fields[0]
  const availableSources: Array<{ description: string; label: string; value: DataActionValueSource }> = [
    { value: 'fixed', label: 'Escribir un valor', description: 'Siempre guarda el valor que indiques.' },
    ...(formInputs.length ? [{ value: 'form' as const, label: 'Usar una respuesta', description: 'Toma el valor de un campo del formulario.' }] : []),
    ...(field?.type === 'boolean' ? [{ value: 'toggle' as const, label: 'Cambiar Sí / No', description: 'Sí se convierte en No y No se convierte en Sí.' }] : []),
    ...(field?.type === 'number' ? [{ value: 'increment' as const, label: 'Sumar o restar', description: 'Modifica el número que ya está guardado.' }] : []),
    ...(['uuid', 'text'].includes(field?.type ?? '') ? [{ value: 'current_user' as const, label: 'Persona conectada', description: 'Guarda el identificador de quien inició sesión.' }] : []),
    ...(['date', 'datetime', 'text'].includes(field?.type ?? '') ? [{ value: 'now' as const, label: field?.type === 'date' ? 'Fecha actual' : 'Fecha y hora actual', description: 'Usa el momento en que se pulsa el botón.' }] : []),
  ]
  const selectedSource = availableSources.some((source) => source.value === draft.valueSource)
    ? draft.valueSource
    : 'fixed'
  const update = (change: Partial<DynamicFieldActionDraft>) => setDraft((current) => ({ ...current, ...change }))
  const chooseMode = (recordMode: DataActionRecordMode) => {
    const nextTables = recordMode === 'current_user' ? currentUserTables : contextTables
    const nextTable = nextTables[0]
    const nextField = nextTable?.access === 'public_read' ? 'published' : nextTable?.fields[0]?.name ?? ''
    update({ recordMode, tableId: nextTable?.id ?? '', field: nextField, valueSource: 'fixed', fixedValue: nextField === 'published' ? 'true' : '' })
  }
  const save = () => {
    if (!table || !field) return
    if (selectedSource === 'form' && !draft.valueInputName) return
    onSave({
      ...draft,
      tableId: table.id,
      field: field.name,
      valueSource: selectedSource,
      fixedValue: selectedSource === 'now'
        ? field.type === 'date' ? '$today' : '$now'
        : selectedSource === 'fixed' && field.type === 'boolean' && !draft.fixedValue
          ? 'true'
          : draft.fixedValue,
    })
  }

  return <div className="gjs-auth-settings-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section aria-label="Configurar cambio de información" aria-modal="true" className="gjs-action-settings-dialog" role="dialog">
      <header><div><span>Acción del botón</span><strong>Cambiar información</strong></div><button aria-label="Cerrar configuración" onClick={onClose} type="button">×</button></header>
      <div className="gjs-action-settings-body">
        <fieldset className="gjs-action-context-options"><legend>¿Qué registro debe cambiar?</legend>
          {contextTables.length > 0 && <label className={draft.recordMode === 'context' ? 'selected' : ''}><input checked={draft.recordMode === 'context'} name="record-mode" onChange={() => chooseMode('context')} type="radio" /><span><strong>El registro actual</strong><small>La tarjeta actual o el registro abierto en esta página.</small></span></label>}
          {currentUserTables.length > 0 && <label className={draft.recordMode === 'current_user' ? 'selected' : ''}><input checked={draft.recordMode === 'current_user'} name="record-mode" onChange={() => chooseMode('current_user')} type="radio" /><span><strong>Mis datos</strong><small>El único registro perteneciente a la persona conectada.</small></span></label>}
        </fieldset>
        {!tables.length && <p className="gjs-auth-settings-error">Este botón no tiene un registro actual. Colócalo dentro de una tarjeta, abre esta página desde una tarjeta o crea una colección de “un elemento por persona”.</p>}
        {table && <>
          <label>Colección<select aria-label="Colección que cambiará" onChange={(event) => {
            const next = tables.find((candidate) => candidate.id === event.target.value)
            const nextField = next?.access === 'public_read' ? 'published' : next?.fields[0]?.name ?? ''
            update({ tableId: event.target.value, field: nextField, valueSource: 'fixed', fixedValue: nextField === 'published' ? 'true' : '' })
          }} value={table.id}>{tables.map((candidate) => <option key={candidate.id} value={candidate.id}>{collectionDisplayName(candidate)}</option>)}</select></label>
          <label>Información que cambiará<select aria-label="Campo que cambiará" onChange={(event) => {
            const next = fields.find((candidate) => candidate.name === event.target.value)
            update({ field: event.target.value, valueSource: 'fixed', fixedValue: next?.type === 'boolean' ? 'true' : '' })
          }} value={field?.name ?? ''}>{fields.map((candidate) => <option key={candidate.id} value={candidate.name}>{candidate.name} · {fieldTypeLabels[candidate.type]}</option>)}</select></label>
          <label>Nuevo valor<select aria-label="Origen del nuevo valor" onChange={(event) => {
            const valueSource = event.target.value as DataActionValueSource
            update({ valueSource, ...(valueSource === 'now' ? { fixedValue: field?.type === 'date' ? '$today' : '$now' } : {}) })
          }} value={selectedSource}>{availableSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label>
          {selectedSource === 'fixed' && (field?.type === 'boolean'
            ? <label>Valor<select aria-label="Valor escrito" onChange={(event) => update({ fixedValue: event.target.value })} value={draft.fixedValue || 'true'}><option value="true">Sí</option><option value="false">No</option></select></label>
            : <label>Valor<input aria-label="Valor escrito" onChange={(event) => update({ fixedValue: event.target.value })} type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'} value={draft.fixedValue} /></label>)}
          {selectedSource === 'form' && <label>Respuesta del formulario<select aria-label="Respuesta que se utilizará" onChange={(event) => update({ valueInputName: event.target.value })} value={draft.valueInputName}><option value="">Selecciona una respuesta</option>{formInputs.map((input) => <option key={input} value={input}>{input}</option>)}</select></label>}
          {selectedSource === 'increment' && <label>Cantidad<input aria-label="Cantidad que se sumará" onChange={(event) => update({ valueAmount: Number(event.target.value) })} type="number" value={draft.valueAmount} /><small>Usa un número negativo para restar.</small></label>}
          <label>Mensaje al terminar<input aria-label="Mensaje de éxito" maxLength={300} onChange={(event) => update({ successMessage: event.target.value })} value={draft.successMessage} /></label>
          <label>Confirmación opcional<input aria-label="Mensaje de confirmación" maxLength={300} onChange={(event) => update({ confirmMessage: event.target.value })} placeholder="Déjalo vacío para continuar sin preguntar" value={draft.confirmMessage} /></label>
        </>}
      </div>
      <footer><button className="secondary" onClick={onClose} type="button">Cancelar</button><button className="primary" disabled={!table || !field || (selectedSource === 'form' && !draft.valueInputName)} onClick={save} type="button">Guardar acción</button></footer>
    </section>
  </div>
}
