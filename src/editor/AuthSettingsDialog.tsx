import { useState } from 'react'
import type { AuthAction, AuthMetadataField } from '../core/auth-components'
import { collectionDisplayName, type SupabaseTableConfig } from './supabase-data'
import { effectiveDataFields } from './data-component-templates'

interface AuthSettingsDialogProps {
  action: AuthAction
  destinationPageId: string
  metadataFields: AuthMetadataField[]
  onClose: () => void
  onSave: (destinationPageId: string, metadataFields: AuthMetadataField[]) => void
  pages: Array<{ id: string; name: string }>
  tables?: SupabaseTableConfig[]
}

const actionLabels: Record<AuthAction, string> = {
  login: 'Inicio de sesión',
  signup: 'Creación de cuenta',
  logout: 'Cierre de sesión',
}

const controlLabels: Record<NonNullable<AuthMetadataField['control']>, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  select: 'Lista desplegable',
  radio: 'Opciones visibles',
  checkbox: 'Casilla Sí / No',
}

function safeMetadataKey(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[0-9]+/, '')
    .slice(0, 63) || 'campo'
}

export function AuthSettingsDialog({
  action,
  destinationPageId,
  metadataFields: initialMetadataFields = [],
  onClose,
  onSave,
  pages,
  tables = [],
}: AuthSettingsDialogProps) {
  const [destination, setDestination] = useState(destinationPageId)
  const [metadataFields, setMetadataFields] = useState(initialMetadataFields)
  const [openFieldIndex, setOpenFieldIndex] = useState<number | null>(initialMetadataFields.length ? 0 : null)
  const [error, setError] = useState('')
  const profileTables = tables.filter((table) => table.access === 'user_owned')
  const collectionLabel = (table: SupabaseTableConfig) => {
    const displayName = collectionDisplayName(table)
    return displayName === table.name ? table.name : `${displayName} · ${table.name}`
  }

  const updateField = (index: number, update: Partial<AuthMetadataField>) => {
    setMetadataFields((current) => current.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, ...update } : field))
    setError('')
  }

  const updateOption = (fieldIndex: number, optionIndex: number, update: { description?: string; label?: string; value?: string }) => {
    const field = metadataFields[fieldIndex]
    const options = [...(field.options ?? [])]
    const option = options[optionIndex] ?? { label: '', value: '' }
    options[optionIndex] = { ...option, ...update }
    updateField(fieldIndex, { options })
  }

  const addOption = (fieldIndex: number) => {
    const field = metadataFields[fieldIndex]
    updateField(fieldIndex, { options: [...(field.options ?? []), { label: '', value: '' }] })
  }

  const save = () => {
    const normalized = metadataFields.map((field) => {
      const label = field.label.trim()
      const destinationField = field.destinationField?.trim()
      const key = destinationField || field.key.trim() || safeMetadataKey(label)
      const control = field.control ?? 'text'
      return {
        key,
        label,
        control,
        required: Boolean(field.required),
        ...(control === 'radio' ? { direction: field.direction ?? 'horizontal' } : {}),
        ...(field.placeholder?.trim() ? { placeholder: field.placeholder.trim() } : {}),
        ...((control === 'select' || control === 'radio') && field.options?.length
          ? { options: field.options.flatMap((option) => {
            const label = option.label.trim()
            const value = option.value.trim()
            const description = option.description?.trim()
            return label && value ? [{ label, value, ...(description ? { description } : {}) }] : []
          }) }
          : {}),
        ...(field.destinationTableId && destinationField
          ? { destinationTableId: field.destinationTableId, destinationField }
          : {}),
      } satisfies AuthMetadataField
    })
    if (normalized.some((field) => !field.key || !field.label)) {
      setError('Cada campo necesita una pregunta visible.')
      return
    }
    if (normalized.some((field) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(field.key))) {
      setError('No pudimos crear una clave segura para uno de los campos.')
      return
    }
    if (normalized.some((field) => field.key === 'email' || field.key === 'password')) {
      setError('Correo y contraseña ya son campos reservados del formulario.')
      return
    }
    if (new Set(normalized.map((field) => field.key)).size !== normalized.length) {
      setError('Cada respuesta debe guardarse con un campo diferente.')
      return
    }
    if (normalized.some((field) => (field.control === 'select' || field.control === 'radio')
      && (field.options?.length ?? 0) < 2)) {
      setError('Las listas y opciones visibles necesitan al menos dos respuestas posibles.')
      return
    }
    onSave(destination, normalized)
  }

  return (
    <div className="gjs-auth-settings-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section aria-label={`Configurar ${actionLabels[action]}`} aria-modal="true" className="gjs-auth-settings-dialog" role="dialog">
        <header>
          <div><span>Supabase Auth</span><strong>{actionLabels[action]}</strong></div>
          <button aria-label="Cerrar configuración" onClick={onClose} type="button">×</button>
        </header>
        <div className="gjs-auth-settings-body">
          <label>
            Destino después de {action === 'logout' ? 'cerrar sesión' : action === 'signup' ? 'crear la cuenta' : 'iniciar sesión'}
            <select aria-label="Destino después de autenticar" onChange={(event) => setDestination(event.target.value)} value={destination}>
              <option value="">Automático (configuración del sitio)</option>
              {pages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}
            </select>
          </label>
          {action === 'signup' && <>
            <section className="gjs-auth-metadata-fields" aria-label="Campos adicionales del registro">
              <header>
                <strong>Preguntas adicionales</strong>
                <button onClick={() => {
                  setOpenFieldIndex(metadataFields.length)
                  setMetadataFields((current) => [...current, { key: '', label: '', control: 'text', required: false }])
                  setError('')
                }} type="button">+ Añadir pregunta</button>
              </header>
              {metadataFields.length === 0 ? <p className="gjs-auth-metadata-empty">El registro solo pedirá correo y contraseña.</p> : <div className="gjs-auth-question-list">{metadataFields.map((field, index) => {
                const control = field.control ?? 'text'
                const selectedTable = profileTables.find((table) => table.id === field.destinationTableId)
                const destinationFields = selectedTable ? effectiveDataFields(selectedTable).filter((candidate) =>
                  !['id', 'user_id', 'created_at', 'updated_at'].includes(candidate.name)) : []
                const isOpen = openFieldIndex === index
                const mappingSummary = selectedTable && field.destinationField
                  ? ` · ${selectedTable.name} → ${field.destinationField}` : ''
                return <article className="gjs-auth-metadata-card" key={index}>
                  <header>
                    <button aria-controls={`auth-question-${index}`} aria-expanded={isOpen} aria-label={`${isOpen ? 'Cerrar' : 'Abrir'} pregunta ${index + 1}: ${field.label.trim() || 'Sin título'}`} className="gjs-auth-question-toggle" onClick={() => setOpenFieldIndex((current) => current === index ? null : index)} type="button">
                      <span className="gjs-auth-question-number">{index + 1}</span>
                      <span><strong>{field.label.trim() || `Pregunta ${index + 1}`}</strong><small>{controlLabels[control]}{mappingSummary}</small></span>
                      <span aria-hidden="true" className="gjs-auth-question-chevron">⌄</span>
                    </button>
                    <button aria-label={`Eliminar campo ${index + 1}`} className="gjs-auth-question-remove" onClick={() => {
                      setMetadataFields((current) => current.filter((_, candidateIndex) => candidateIndex !== index))
                      setOpenFieldIndex((current) => {
                        if (current === null) return null
                        if (metadataFields.length <= 1) return null
                        if (current === index) return Math.min(index, metadataFields.length - 2)
                        return current > index ? current - 1 : current
                      })
                    }} type="button">×</button>
                  </header>
                  <div className="gjs-auth-question-content" hidden={!isOpen} id={`auth-question-${index}`}>
                  <label>Pregunta<input aria-label={`Etiqueta del campo ${index + 1}`} onChange={(event) => updateField(index, { label: event.target.value })} placeholder="Ej. ¿Cuál es tu tipo de cuenta?" value={field.label} /></label>
                  <div className={control === 'radio' ? 'gjs-auth-metadata-grid' : undefined}><label>Mostrar como<select aria-label={`Tipo de respuesta del campo ${index + 1}`} onChange={(event) => {
                      const nextControl = event.target.value as AuthMetadataField['control']
                      const needsOptions = nextControl === 'select' || nextControl === 'radio'
                      updateField(index, {
                        control: nextControl,
                        ...(needsOptions && !field.options?.length
                          ? { options: [{ label: '', value: '' }, { label: '', value: '' }] }
                          : {}),
                      })
                    }} value={control}>{Object.entries(controlLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    {control === 'radio' && <label>Dirección<select aria-label={`Dirección de las opciones del campo ${index + 1}`} onChange={(event) => updateField(index, { direction: event.target.value as AuthMetadataField['direction'] })} value={field.direction ?? 'horizontal'}>
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                    </select></label>}
                  </div>
                  <div className="gjs-auth-metadata-grid">
                    <label>Colección<select aria-label={`Colección de destino del campo ${index + 1}`} onChange={(event) => {
                      const destinationTableId = event.target.value
                      const table = profileTables.find((candidate) => candidate.id === destinationTableId)
                      const firstField = table ? effectiveDataFields(table).find((candidate) =>
                        !['id', 'user_id', 'created_at', 'updated_at'].includes(candidate.name))?.name : undefined
                      updateField(index, { destinationTableId: destinationTableId || undefined, destinationField: firstField, ...(firstField ? { key: firstField } : {}) })
                    }} value={field.destinationTableId ?? ''}><option value="">Cuenta (sin colección)</option>{profileTables.map((table) => <option key={table.id} value={table.id}>{collectionLabel(table)}</option>)}</select></label>
                    <label>Campo<select aria-label={`Campo de destino del campo ${index + 1}`} disabled={!selectedTable} onChange={(event) => updateField(index, { destinationField: event.target.value, key: event.target.value })} value={field.destinationField ?? ''}>
                      {!selectedTable && <option value="">Elige una colección</option>}
                      {selectedTable && destinationFields.length === 0 && <option value="">No hay campos disponibles</option>}
                      {destinationFields.map((candidate) => <option key={candidate.id} value={candidate.name}>{candidate.name}</option>)}
                    </select></label>
                  </div>
                  {(control === 'select' || control === 'radio') && <section aria-label={`Opciones del campo ${index + 1}`} className="gjs-auth-options">
                    <header><strong>Opciones</strong><button onClick={() => addOption(index)} type="button">+ Añadir opción</button></header>
                    {(field.options ?? []).map((option, optionIndex) => <div className="gjs-auth-option-row" key={optionIndex}>
                      <div className="gjs-auth-option-fields"><label>Opción {optionIndex + 1}<input aria-label={`Texto visible de la opción ${optionIndex + 1}`} onChange={(event) => {
                        const label = event.target.value
                        const previousAutomaticValue = !option.value || option.value === safeMetadataKey(option.label)
                        updateOption(index, optionIndex, {
                          label,
                          ...(previousAutomaticValue ? { value: safeMetadataKey(label) } : {}),
                        })
                      }} onKeyDown={(event) => {
                        if (event.key === 'Enter' && optionIndex === (field.options?.length ?? 0) - 1) {
                          event.preventDefault()
                          const optionsSection = event.currentTarget.closest('.gjs-auth-options')
                          addOption(index)
                          window.requestAnimationFrame(() => {
                            optionsSection?.querySelector<HTMLInputElement>(`input[aria-label="Texto visible de la opción ${optionIndex + 2}"]`)?.focus()
                          })
                        }
                      }} placeholder={optionIndex === 0 ? 'Ej. Aprender' : 'Escribe otra opción'} value={option.label} /></label>
                      {control === 'radio' && <label>Descripción <span className="gjs-auth-optional">opcional</span><input aria-label={`Descripción de la opción ${optionIndex + 1}`} onChange={(event) => updateOption(index, optionIndex, { description: event.target.value })} placeholder="Ej. Practicar y guardar mi progreso" value={option.description ?? ''} /></label>}
                      </div>
                      <button aria-label={`Eliminar opción ${optionIndex + 1}`} onClick={() => updateField(index, { options: field.options?.filter((_, candidateIndex) => candidateIndex !== optionIndex) })} type="button">×</button>
                    </div>)}
                  </section>}
                  {(control === 'text' || control === 'textarea') && <label>Texto de ejemplo<input aria-label={`Texto de ejemplo del campo ${index + 1}`} onChange={(event) => updateField(index, { placeholder: event.target.value })} placeholder="Opcional" value={field.placeholder ?? ''} /></label>}
                  <label className="gjs-auth-required"><input checked={Boolean(field.required)} onChange={(event) => updateField(index, { required: event.target.checked })} type="checkbox" /><span>Respuesta obligatoria</span></label>
                  </div>
                </article>
              })}</div>}
            </section>
            {error && <p className="gjs-auth-settings-error" role="alert">{error}</p>}
          </>}
        </div>
        <footer><button className="secondary" onClick={onClose} type="button">Cancelar</button><button className="primary" onClick={save} type="button">Guardar</button></footer>
      </section>
    </div>
  )
}
