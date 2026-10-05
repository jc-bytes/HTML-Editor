import { useRef, useState } from 'react'
import {
  prepareImportedLibraryFile,
  type PersistedImportedLibrary,
  type PreparedImportedLibraryFile,
  type RegisteredRawJavaScriptLibrary,
} from '../external-libraries/imported-library'
import type { LibraryCatalogEntry } from '../python-libraries/types'
import type { RegisteredExternalFunctionLibrary } from '../runtime/functions/external-library-registry'
import type { ExternalFunctionValueType } from '../runtime/functions/external-function-registry'
import { externalFunctionCodeName } from './external-function-blocks'

export interface PythonCodeImportDraft {
  description: string
  fileName?: string
  inputs: string
  libraryId?: string
  name: string
  outputType: 'number' | 'number[]' | 'number[][]' | 'json'
  source: string
  usage: string
}

export interface JavaScriptCodeImportDraft {
  description: string
  exposedFunction: string
  fileName?: string
  functionDescription: string
  functionName: string
  inputs: Array<{ name: string; type: ExternalFunctionValueType }>
  libraryId?: string
  name: string
  outputType: ExternalFunctionValueType
  mode?: 'function' | 'raw-global'
  source: string
  usage: string
}

function slug(value: string, fallback: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback
}

function javaScriptLabFunctionName(functionName: string) {
  return externalFunctionCodeName(slug(functionName, 'javascript-function'))
}

function inferredJavaScriptApi(source: string) {
  return source.match(/\b(?:root|self|window|globalThis)\.([A-Za-z_$][\w$]*)\s*=/)?.[1]
    || source.match(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/)?.[1]
    || ''
}

export function prepareJavaScriptCodeDraft(draft: JavaScriptCodeImportDraft): PreparedImportedLibraryFile {
  const libraryId = slug(draft.name, 'javascript-library')
  const functionId = slug(draft.exposedFunction, 'javascript-function')
  const implementation = `function (...args) {\n${draft.source}\nif (typeof ${draft.exposedFunction} !== "function") throw new Error(${JSON.stringify(`No se encontró la función ${draft.exposedFunction}.`)});\nreturn ${draft.exposedFunction}(...args);\n}`
  const metadata = JSON.stringify({
    description: draft.functionDescription,
    exposedFunction: draft.exposedFunction,
    id: functionId,
    inputs: draft.inputs,
    name: draft.name,
    output: { type: draft.outputType },
    source: draft.source,
    usage: draft.usage,
  }, null, 2)
  const source = `const implementation = ${implementation};\n\nexport default {\n  id: ${JSON.stringify(libraryId)},\n  name: ${JSON.stringify(draft.name)},\n  description: ${JSON.stringify(draft.description)},\n  functions: [{ metadata: ${metadata}, implementation }],\n};\n`
  return { fileName: draft.fileName || `${libraryId}.js`, source }
}

export function prepareRawJavaScriptLibraryDraft(
  draft: JavaScriptCodeImportDraft,
): PersistedImportedLibrary {
  const libraryId = slug(draft.name, 'javascript-library')
  return {
    description: draft.description,
    fileName: draft.fileName || `${libraryId}.js`,
    formatVersion: 1,
    functions: [],
    globalApis: [{
      description: draft.functionDescription,
      name: draft.exposedFunction,
      usage: draft.usage,
    }],
    id: libraryId,
    kind: 'raw-global',
    name: draft.name,
    source: draft.source,
  }
}

export function ExternalLibrariesPanel({
  libraries,
  onAddLibrary,
  onAddJavaScriptCode,
  onAddPythonCode,
  onUseFunction,
}: {
  libraries: Array<LibraryCatalogEntry | RegisteredExternalFunctionLibrary | RegisteredRawJavaScriptLibrary>
  onAddLibrary?: (prepared: PreparedImportedLibraryFile) => Promise<void>
  onAddJavaScriptCode?: (draft: JavaScriptCodeImportDraft) => Promise<void>
  onAddPythonCode?: (draft: PythonCodeImportDraft) => Promise<void>
  onUseFunction?: (libraryId: string, functionId: string) => Promise<void> | void
}) {
  const catalogLibraries: Array<
    LibraryCatalogEntry
    | (RegisteredExternalFunctionLibrary & { language: 'javascript' })
    | (RegisteredRawJavaScriptLibrary & { language: 'javascript' })
  > = libraries.map((library) => (
    'language' in library ? library : { ...library, language: 'javascript' as const }
  ))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pythonFileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PreparedImportedLibraryFile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [usingFunction, setUsingFunction] = useState('')
  const [pythonDraft, setPythonDraft] = useState<PythonCodeImportDraft | null>(null)
  const [javaScriptDraft, setJavaScriptDraft] = useState<JavaScriptCodeImportDraft | null>(null)

  function emptyJavaScriptDraft(source = '', fileName?: string): JavaScriptCodeImportDraft {
    const inferredFunction = inferredJavaScriptApi(source)
    const inferredName = fileName?.replace(/\.js$/i, '').replace(/[_-]+/g, ' ') || ''
    return {
      description: '', exposedFunction: inferredFunction, fileName,
      functionDescription: '', functionName: inferredFunction || inferredName,
      inputs: [], mode: 'function', name: inferredName, outputType: 'json', source,
      usage: inferredFunction ? `let result = ${javaScriptLabFunctionName(inferredFunction)}();` : '',
    }
  }

  async function selectFile(file?: File) {
    setError('')
    setNotice('')
    setPending(null)
    if (!file) return
    const result = await prepareImportedLibraryFile(file)
    if (!result.ok) {
      if (result.error === 'La biblioteca debe exportar una definición predeterminada.'
        && file.name.toLowerCase().endsWith('.js') && file.size > 0 && file.size <= 256 * 1024) {
        try {
          const source = await file.text()
          if (/(?:^|[;\n\r])\s*import\s*(?:\(|["'{*]|[A-Za-z_$])/m.test(source)
            || /\bimport\s*\(/.test(source) || /\bexport\s+/.test(source)) {
            setError('El código documentado debe ser independiente y no puede usar import o export.')
            return
          }
          setJavaScriptDraft(emptyJavaScriptDraft(source, file.name))
          return
        } catch {
          setError('No se pudo leer el archivo JavaScript.')
          return
        }
      }
      setError(result.error)
      return
    }
    setPending(result.value)
  }

  async function confirmJavaScriptCode() {
    if (!javaScriptDraft || !onAddJavaScriptCode) return
    const rawGlobal = javaScriptDraft.mode === 'raw-global'
    const required = [javaScriptDraft.name, javaScriptDraft.description,
      javaScriptDraft.exposedFunction, javaScriptDraft.source, javaScriptDraft.usage]
    if (required.some((value) => !value.trim())) {
      setError('Completa biblioteca, función, descripción, ejemplo de uso y código JavaScript.')
      return
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(javaScriptDraft.exposedFunction)) {
      setError('La función expuesta debe ser un identificador JavaScript válido.')
      return
    }
    if (!rawGlobal && (javaScriptDraft.inputs.some((input) => !/^[a-z][a-z0-9-]*$/.test(input.name))
      || new Set(javaScriptDraft.inputs.map((input) => input.name)).size !== javaScriptDraft.inputs.length)) {
      setError('Cada entrada necesita un identificador único en minúsculas; puede usar guiones.')
      return
    }
    if (/(?:^|[;\n\r])\s*import\s*(?:\(|["'{*]|[A-Za-z_$])/m.test(javaScriptDraft.source)
      || /\bimport\s*\(/.test(javaScriptDraft.source) || /\bexport\s+/.test(javaScriptDraft.source)) {
      setError('El código documentado debe ser independiente y no puede usar import o export.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onAddJavaScriptCode({
        ...javaScriptDraft,
        description: javaScriptDraft.description.trim(),
        exposedFunction: javaScriptDraft.exposedFunction.trim(),
        functionDescription: javaScriptDraft.description.trim(),
        functionName: javaScriptDraft.name.trim(),
        name: javaScriptDraft.name.trim(),
        usage: javaScriptDraft.usage.trim(),
      })
      setNotice(`${javaScriptDraft.name.trim()} se ${javaScriptDraft.libraryId ? 'actualizó' : 'añadió'} en Librerías.`)
      setJavaScriptDraft(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo añadir el código JavaScript.')
    } finally {
      setBusy(false)
    }
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

  async function importPythonFile(file?: File) {
    if (!file || !onAddPythonCode) return
    setError('')
    setNotice('')
    if (!file.name.toLowerCase().endsWith('.py') || file.size <= 0 || file.size > 256 * 1024) {
      setError('Selecciona un archivo Python .py de hasta 256 KiB.')
      return
    }
    try {
      setPythonDraft({
        description: '',
        fileName: file.name,
        inputs: '',
        name: file.name.replace(/\.py$/i, '').replace(/[_-]+/g, ' '),
        outputType: 'json',
        source: await file.text(),
        usage: '',
      })
    } catch {
      setError('No se pudo leer el archivo Python.')
    }
  }

  async function confirmPythonCode() {
    if (!pythonDraft || !onAddPythonCode) return
    if (!pythonDraft.name.trim() || !pythonDraft.description.trim()
      || !pythonDraft.inputs.trim() || !pythonDraft.source.trim() || !pythonDraft.usage.trim()) {
      setError('Completa nombre, descripción, entradas, ejemplo de uso y código Python.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onAddPythonCode({
        ...pythonDraft,
        description: pythonDraft.description.trim(),
        inputs: pythonDraft.inputs.trim(),
        name: pythonDraft.name.trim(),
        usage: pythonDraft.usage.trim(),
      })
      setNotice(`${pythonDraft.name.trim()} se ${pythonDraft.libraryId ? 'actualizó' : 'añadió'} en Librerías.`)
      setPythonDraft(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo añadir el código Python.')
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
      const library = catalogLibraries.find((candidate) => candidate.id === libraryId)
      setNotice(`${functionName} se añadió a ${library?.language === 'python' ? 'Python Lab' : 'JS Lab'}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo añadir la función a JS Lab.')
    } finally {
      setUsingFunction('')
    }
  }

  return <section className="gjs-libraries-panel" aria-label="Bibliotecas de código">
    <div className="gjs-libraries-list">
      {catalogLibraries.map((library) => (
        <details className="gjs-library" key={library.id}>
          <summary>
            <span><b className={`gjs-library-language ${library.language}`}>{library.language === 'python' ? 'Py' : 'JS'}</b> {library.name}</span>
            <small className={`gjs-library-provenance ${library.provenance}`}>
              {library.provenance === 'imported' ? 'Importada' : 'Integrada'}
            </small>
          </summary>
          <p className="gjs-library-description">{library.description}</p>
          <div className="gjs-library-functions">
            {library.language === 'python' ? library.functions.map((metadata) => {
              const source = library.source
              return <details className="gjs-library-function" key={metadata.id}>
                <summary>{metadata.name}</summary>
                <div>
                  <p>{metadata.description}</p>
                  <dl>
                    <dt>Entradas</dt><dd>{metadata.inputs}</dd>
                    <dt>Salida</dt><dd>{metadata.outputType}</dd>
                  </dl>
                  <p><strong>Ejemplo de uso</strong></p>
                  <pre><code>{metadata.usage}</code></pre>
                  <div className="gjs-library-function-actions">
                    <button
                      disabled={!onUseFunction || Boolean(usingFunction)}
                      onClick={() => void useFunction(library.id, metadata.id, metadata.name)}
                      type="button"
                    >{usingFunction === `${library.id}:${metadata.id}` ? 'Añadiendo…' : 'Usar'}</button>
                    {library.provenance === 'imported' && <button onClick={() => setPythonDraft({
                      description: library.description,
                      inputs: metadata.inputs,
                      libraryId: library.id,
                      name: library.name,
                      outputType: metadata.outputType,
                      source: library.source,
                      usage: metadata.usage,
                    })} type="button">Editar</button>}
                    <details className="gjs-library-source">
                      <summary>Ver código</summary>
                      <pre><code>{source}</code></pre>
                    </details>
                  </div>
                </div>
              </details>
            }) : 'kind' in library && library.kind === 'raw-global' ? library.globalApis.map((api) => (
              <div className="gjs-library-function" key={api.name}>
                <div><strong>{api.name}</strong><p>{api.description}</p>
                  <p><strong>Tipo</strong>: API global</p>
                  <p><strong>Ejemplo de uso</strong></p><pre><code>{api.usage}</code></pre>
                  <div className="gjs-library-function-actions">
                    <button disabled={!onUseFunction || Boolean(usingFunction)} onClick={() => void useFunction(library.id, api.name, api.name)} type="button">{usingFunction === `${library.id}:${api.name}` ? 'Añadiendo…' : 'Usar'}</button>
                    <button onClick={() => setJavaScriptDraft({
                      description: library.description,
                      exposedFunction: api.name,
                      functionDescription: api.description,
                      functionName: api.name,
                      inputs: [],
                      libraryId: library.id,
                      mode: 'raw-global',
                      name: library.name,
                      outputType: 'json',
                      source: library.source,
                      usage: api.usage,
                    })} type="button">Editar</button>
                    <details className="gjs-library-source"><summary>Ver código</summary><pre><code>{library.source}</code></pre></details>
                  </div>
                </div>
              </div>
            )) : library.functions.map(({ implementation, metadata }) => (
              <details className="gjs-library-function" key={metadata.id}>
                <summary>{metadata.name}</summary><div><p>{metadata.description}</p><dl>
                  <dt>Entradas</dt><dd>{metadata.inputs.map((input) => `${input.name}: ${input.type}`).join(', ')}</dd>
                  <dt>Salida</dt><dd>{metadata.output.type}</dd>
                </dl>{metadata.usage && <><p><strong>Ejemplo de uso</strong></p><pre><code>{metadata.usage}</code></pre></>}<div className="gjs-library-function-actions"><button disabled={!onUseFunction || Boolean(usingFunction)} onClick={() => void useFunction(library.id, metadata.id, metadata.name)} type="button">{usingFunction === `${library.id}:${metadata.id}` ? 'Añadiendo…' : 'Usar'}</button>{library.provenance === 'imported' && library.functions.length === 1 && metadata.source && metadata.exposedFunction && <button onClick={() => setJavaScriptDraft({
                  description: library.description,
                  exposedFunction: metadata.exposedFunction!,
                  functionDescription: metadata.description,
                  functionName: metadata.name,
                  inputs: metadata.inputs.map((input) => ({ name: input.name, type: input.type })),
                  libraryId: library.id,
                  mode: 'function',
                  name: library.name,
                  outputType: metadata.output.type,
                  source: metadata.source!,
                  usage: metadata.usage || '',
                })} type="button">Editar</button>}<details className="gjs-library-source"><summary>Ver código</summary><pre><code>{metadata.source || String(implementation)}</code></pre></details></div></div>
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
    {javaScriptDraft && <div className="gjs-python-import-backdrop" role="presentation">
      <section aria-label="Añadir código JavaScript" aria-modal="true" className="gjs-python-import-dialog" role="dialog">
        <header><div><strong>{javaScriptDraft.libraryId ? 'Editar biblioteca JavaScript' : javaScriptDraft.fileName ? 'Documentar archivo JavaScript' : 'Añadir código JavaScript'}</strong><small>Guarda una función compatible o una biblioteca global para JS Lab.</small></div><button aria-label="Cerrar" disabled={busy} onClick={() => setJavaScriptDraft(null)} type="button">×</button></header>
        <fieldset><legend>Tipo de biblioteca</legend><label><input aria-label="Función compatible" checked={javaScriptDraft.mode !== 'raw-global'} name="javascript-library-mode" onChange={() => setJavaScriptDraft({ ...javaScriptDraft, mode: 'function' })} type="radio" /> Función compatible</label><label><input aria-label="Biblioteca global" checked={javaScriptDraft.mode === 'raw-global'} name="javascript-library-mode" onChange={() => setJavaScriptDraft({ ...javaScriptDraft, exposedFunction: inferredJavaScriptApi(javaScriptDraft.source), mode: 'raw-global' })} type="radio" /> Biblioteca global</label></fieldset>
        <label>Biblioteca<input aria-label="Nombre de la biblioteca JavaScript" onChange={(event) => setJavaScriptDraft({ ...javaScriptDraft, name: event.target.value })} placeholder="Ej. Time Series Tools" value={javaScriptDraft.name} /></label>
        <label>Descripción de la biblioteca<textarea aria-label="Descripción de la biblioteca JavaScript" onChange={(event) => setJavaScriptDraft({ ...javaScriptDraft, description: event.target.value })} placeholder="Explica el propósito general de esta biblioteca." rows={2} value={javaScriptDraft.description} /></label>
        <label>{javaScriptDraft.mode === 'raw-global' ? 'Nombre de la API global' : 'Nombre de la función en el código'}<input aria-label="Función JavaScript expuesta" onChange={(event) => setJavaScriptDraft({ ...javaScriptDraft, exposedFunction: event.target.value })} placeholder={javaScriptDraft.mode === 'raw-global' ? 'Ej. DynamicTimeWarping' : 'Ej. dtwDistance'} value={javaScriptDraft.exposedFunction} /><small>{javaScriptDraft.mode === 'raw-global' ? 'Se intenta detectar automáticamente; confirma o corrige el nombre.' : 'Debe coincidir exactamente con la función declarada.'}</small></label>
        {javaScriptDraft.mode !== 'raw-global' && <fieldset><legend>Entradas</legend>{javaScriptDraft.inputs.map((input, index) => <div className="gjs-library-input-row" key={index}>
          <input aria-label={`Nombre de entrada JavaScript ${index + 1}`} onChange={(event) => setJavaScriptDraft({ ...javaScriptDraft, inputs: javaScriptDraft.inputs.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} placeholder="sequence-a" value={input.name} />
          <select aria-label={`Tipo de entrada JavaScript ${index + 1}`} onChange={(event) => setJavaScriptDraft({ ...javaScriptDraft, inputs: javaScriptDraft.inputs.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as ExternalFunctionValueType } : item) })} value={input.type}><option value="number">number</option><option value="number[]">number[]</option><option value="number[][]">number[][]</option><option value="json">json</option></select>
          <button aria-label={`Eliminar entrada JavaScript ${index + 1}`} onClick={() => setJavaScriptDraft({ ...javaScriptDraft, inputs: javaScriptDraft.inputs.filter((_item, itemIndex) => itemIndex !== index) })} type="button">×</button>
        </div>)}<button onClick={() => setJavaScriptDraft({ ...javaScriptDraft, inputs: [...javaScriptDraft.inputs, { name: `input-${javaScriptDraft.inputs.length + 1}`, type: 'json' }] })} type="button">+ Añadir entrada</button></fieldset>}
        {javaScriptDraft.mode !== 'raw-global' && <label>Salida<select aria-label="Salida del código JavaScript" onChange={(event) => setJavaScriptDraft({ ...javaScriptDraft, outputType: event.target.value as ExternalFunctionValueType })} value={javaScriptDraft.outputType}><option value="number">number</option><option value="number[]">number[]</option><option value="number[][]">number[][]</option><option value="json">json</option></select></label>}
        <label>Ejemplo de uso<textarea aria-label="Ejemplo de uso del código JavaScript" className="code" onChange={(event) => setJavaScriptDraft({ ...javaScriptDraft, usage: event.target.value })} placeholder="let result = dtwDistance(sequenceA, sequenceB);" rows={5} spellCheck={false} value={javaScriptDraft.usage} /></label>
        <label>Código JavaScript<textarea aria-label="Código JavaScript para añadir" className="code" onChange={(event) => {
          const source = event.target.value
          setJavaScriptDraft({
            ...javaScriptDraft,
            exposedFunction: javaScriptDraft.mode === 'raw-global'
              ? inferredJavaScriptApi(source)
              : javaScriptDraft.exposedFunction,
            source,
          })
        }} placeholder="function miFuncion(valor) {\n  return valor;\n}" rows={14} spellCheck={false} value={javaScriptDraft.source} /></label>
        <p>JavaScript ejecutable: {javaScriptDraft.mode === 'raw-global' ? 'la biblioteca se carga antes de ejecutar JS Lab.' : 'se ejecutará únicamente al usar la función.'} Añade solo código independiente que comprendas y en el que confíes.</p>
        <footer><button disabled={busy} onClick={() => setJavaScriptDraft(null)} type="button">Cancelar</button><button disabled={busy} onClick={() => void confirmJavaScriptCode()} type="button">{busy ? 'Guardando…' : javaScriptDraft.libraryId ? 'Guardar cambios' : 'Añadir a Librerías'}</button></footer>
      </section>
    </div>}
    {pythonDraft && <div className="gjs-python-import-backdrop" role="presentation">
      <section aria-label="Añadir código Python" aria-modal="true" className="gjs-python-import-dialog" role="dialog">
        <header><div><strong>{pythonDraft.libraryId ? 'Editar biblioteca Python' : pythonDraft.fileName ? 'Documentar archivo Python' : 'Añadir código Python'}</strong><small>Describe qué recibe y qué produce antes de guardarlo como biblioteca reutilizable.</small></div><button aria-label="Cerrar" disabled={busy} onClick={() => setPythonDraft(null)} type="button">×</button></header>
        <label>Nombre<input aria-label="Nombre del código Python" onChange={(event) => setPythonDraft({ ...pythonDraft, name: event.target.value })} placeholder="Ej. Extraer landmarks" value={pythonDraft.name} /></label>
        <label>Descripción<textarea aria-label="Descripción del código Python" onChange={(event) => setPythonDraft({ ...pythonDraft, description: event.target.value })} placeholder="Explica qué hace esta función o fragmento." rows={3} value={pythonDraft.description} /></label>
        <label>Entradas<textarea aria-label="Entradas del código Python" onChange={(event) => setPythonDraft({ ...pythonDraft, inputs: event.target.value })} placeholder="Ej. results: landmark frames" rows={2} value={pythonDraft.inputs} /></label>
        <label>Salida<select aria-label="Salida del código Python" onChange={(event) => setPythonDraft({ ...pythonDraft, outputType: event.target.value as PythonCodeImportDraft['outputType'] })} value={pythonDraft.outputType}><option value="number">number</option><option value="number[]">number[]</option><option value="number[][]">number[][]</option><option value="json">json</option></select></label>
        <label>Ejemplo de uso<textarea aria-label="Ejemplo de uso del código Python" className="code" onChange={(event) => setPythonDraft({ ...pythonDraft, usage: event.target.value })} placeholder={'result = mi_funcion(runtime_values["landmark-frames"])'} rows={5} spellCheck={false} value={pythonDraft.usage} /></label>
        <label>Código Python<textarea aria-label="Código Python para añadir" className="code" onChange={(event) => setPythonDraft({ ...pythonDraft, source: event.target.value })} placeholder="def mi_funcion(valor):\n    return valor" rows={14} spellCheck={false} value={pythonDraft.source} /></label>
        <p>Este código es ejecutable. Añade únicamente código que comprendas y en el que confíes.</p>
        <footer><button disabled={busy} onClick={() => setPythonDraft(null)} type="button">Cancelar</button><button disabled={busy} onClick={() => void confirmPythonCode()} type="button">{busy ? 'Guardando…' : pythonDraft.libraryId ? 'Guardar cambios' : 'Añadir a Librerías'}</button></footer>
      </section>
    </div>}
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
    <input accept=".py,text/x-python" aria-label="Seleccionar archivo Python" hidden onChange={(event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      void importPythonFile(file)
    }} ref={pythonFileInputRef} type="file" />
    <div className="gjs-library-add-actions">
      <button className="gjs-add-library" disabled={!onAddLibrary || busy} onClick={() => fileInputRef.current?.click()} type="button"><span aria-hidden="true">+</span> Importar .js</button>
      <button className="gjs-add-library" disabled={!onAddJavaScriptCode || busy} onClick={() => setJavaScriptDraft(emptyJavaScriptDraft())} type="button"><span aria-hidden="true">+</span> Añadir código JavaScript</button>
      <button className="gjs-add-library" disabled={!onAddPythonCode || busy} onClick={() => pythonFileInputRef.current?.click()} type="button"><span aria-hidden="true">+</span> Importar .py</button>
      <button className="gjs-add-library" disabled={!onAddPythonCode || busy} onClick={() => setPythonDraft({ description: '', inputs: '', name: '', outputType: 'json', source: '', usage: '' })} type="button"><span aria-hidden="true">+</span> Añadir código Python</button>
    </div>
  </section>
}
