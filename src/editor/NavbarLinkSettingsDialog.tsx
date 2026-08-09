import { useState } from 'react'

export interface NavbarLinkSettings {
  active: boolean
  label: string
}

export function NavbarLinkSettingsDialog({
  initialSettings,
  onClose,
  onSave,
}: {
  initialSettings: NavbarLinkSettings
  onClose: () => void
  onSave: (settings: NavbarLinkSettings) => void
}) {
  const [label, setLabel] = useState(initialSettings.label)
  const [active, setActive] = useState(initialSettings.active)
  const [error, setError] = useState('')

  const save = () => {
    if (!label.trim()) {
      setError('Escribe el texto que se mostrará en el menú.')
      return
    }
    onSave({ active, label: label.trim() })
  }

  return (
    <div className="gjs-navbar-settings-backdrop gjs-editor-theme-scope" role="presentation">
      <section aria-label="Editar enlace de navegación" aria-modal="true" className="gjs-navbar-settings-dialog" role="dialog">
        <header>
          <div><span>Navegación</span><strong>Editar enlace</strong></div>
          <button aria-label="Cerrar" onClick={onClose} type="button">×</button>
        </header>
        <div className="gjs-navbar-settings-body">
          <label>
            Texto del enlace
            <input autoFocus onChange={(event) => {
              setLabel(event.target.value)
              setError('')
            }} value={label} />
          </label>
          <label className="gjs-navbar-active-setting">
            <input aria-label="Elemento activo" checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />
            <span><strong>Elemento activo</strong><small>Se mostrará resaltado en esta barra.</small></span>
          </label>
          <p>Solo un enlace puede estar activo. Al activar este, el anterior se desmarcará.</p>
          {error && <div className="gjs-navbar-settings-error" role="alert">{error}</div>}
        </div>
        <footer>
          <button className="secondary" onClick={onClose} type="button">Cancelar</button>
          <button className="primary" onClick={save} type="button">Guardar</button>
        </footer>
      </section>
    </div>
  )
}
