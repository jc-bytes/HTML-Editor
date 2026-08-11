import { useRef, useState } from 'react'
import {
  prepareImportedLibraryFile,
  type PreparedImportedLibraryFile,
} from '../external-libraries/imported-library'
import type { RegisteredExternalFunctionLibrary } from '../runtime/functions/external-library-registry'

export function ExternalLibrariesPanel({
  libraries,
  onAddLibrary,
  onUseFunction,
}: {
  libraries: RegisteredExternalFunctionLibrary[]
  onAddLibrary?: (prepared: PreparedImportedLibraryFile) => Promise<void>
  onUseFunction?: (libraryId: string, functionId: string) => Promise<void> | void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PreparedImportedLibraryFile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [usingFunction, setUsingFunction] = useState('')

  async function selectFile(file?: File) {
    setError('')
    setNotice('')
    setPending(null)
    if (!file) return
    const result = await prepareImportedLibraryFile(file)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPending(result.value)
  }

  async function confirmImport() {
    if (!pending || !onAddLibrary) return
    setBusy(true)
    setError('')
    try {
      await onAddLibrary(pending)
      setNotice(`La biblioteca de ${pending.fileName} se añadió al proyecto.`)
      setPending(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo añadir la biblioteca.')
    } finally {
      setBusy(false)
    }
  }

  async function useFunction(libraryId: string, functionId: string, functionName: string) {
    if (!onUseFunction) return
    const key = `${libraryId}:${functionId}`
    setUsingFunction(key)
    setError('')
    setNotice('')
    try {
      await onUseFunction(libraryId, functionId)
      setNotice(`${functionName} se añadió a JS Lab.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo añadir la función a JS Lab.')
    } finally {
      setUsingFunction('')
    }
  }

  return <section className="gjs-libraries-panel" aria-label="Bibliotecas JavaScript">
    <div className="gjs-libraries-list">
      {libraries.map((library) => (
        <details className="gjs-library" key={library.id}>
          <summary>
            <span>{library.name}</span>
            <small className={`gjs-library-provenance ${library.provenance}`}>
              {library.provenance === 'imported' ? 'Importada' : 'Integrada'}
            </small>
          </summary>
          <p className="gjs-library-description">{library.description}</p>
          <div className="gjs-library-functions">
            {library.functions.map(({ implementation, metadata }) => (
              <details className="gjs-library-function" key={metadata.id}>
                <summary>{metadata.name}</summary>
                <div>
                  <p>{metadata.description}</p>
                  <dl>
                    <dt>Entradas</dt>
                    <dd>{metadata.inputs.map((input) => `${input.name}: ${input.type}`).join(', ')}</dd>
                    <dt>Salida</dt>
                    <dd>{metadata.output.type}</dd>
                  </dl>
                  <div className="gjs-library-function-actions">
                    <button
                      disabled={!onUseFunction || Boolean(usingFunction)}
                      onClick={() => void useFunction(library.id, metadata.id, metadata.name)}
                      type="button"
                    >{usingFunction === `${library.id}:${metadata.id}` ? 'Añadiendo…' : 'Usar'}</button>
                    <details className="gjs-library-source">
                      <summary>Ver código</summary>
                      <pre><code>{String(implementation)}</code></pre>
                    </details>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
      {pending && <div className="gjs-library-import-warning" role="alert">
        <strong>Código JavaScript ejecutable</strong>
        <p>
          <b>{pending.fileName}</b> puede acceder a las capacidades JavaScript disponibles en el editor
          y en el sitio exportado. Importa únicamente código que comprendas y en el que confíes.
        </p>
        <div>
          <button disabled={busy} onClick={() => setPending(null)} type="button">Cancelar</button>
          <button disabled={busy} onClick={() => void confirmImport()} type="button">
            {busy ? 'Importando…' : 'Importar y ejecutar'}
          </button>
        </div>
      </div>}
      {error && <p className="gjs-library-import-message error" role="alert">{error}</p>}
      {notice && <p className="gjs-library-import-message" role="status">{notice}</p>}
    </div>
    <input
      accept=".js,text/javascript,application/javascript"
      aria-label="Seleccionar biblioteca JavaScript"
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        void selectFile(file)
      }}
      ref={fileInputRef}
      type="file"
    />
    <button
      className="gjs-add-library"
      disabled={!onAddLibrary || busy}
      onClick={() => fileInputRef.current?.click()}
      type="button"
    ><span aria-hidden="true">+</span> Añadir</button>
  </section>
}
