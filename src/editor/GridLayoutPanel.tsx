import type { Component, Editor } from 'grapesjs'
import {
  appendLayoutRow,
  type LayoutPreset,
  LAYOUT_PRESETS,
  layoutRowFor,
  layoutRowOrder,
  moveLayoutRow,
  readLayoutSettings,
  updateLayoutGap,
  updateLayoutMinHeight,
  updateLayoutPreset,
  updateSiteMargin,
} from './grid-layout'
import {
  readSectionLayoutSettings,
  sectionGridFor,
  updateSectionColumnCount,
  updateSectionColumnWidth,
  updateSectionGap,
  updateSectionMargin,
  updateSectionPadding,
} from './section-layout'

export function GridLayoutPanel({
  editor,
  item,
  margin,
  onChange,
}: {
  editor: Editor | null
  item: Component | null
  margin: number
  onChange: (options?: { margin?: number; select?: Component }) => void
}) {
  const row = layoutRowFor(item)
  const settings = readLayoutSettings(row)
  const order = layoutRowOrder(row)
  const sectionGrid = sectionGridFor(item)
  const sectionSettings = readSectionLayoutSettings(sectionGrid)

  const applyMargin = (value: number) => {
    if (!editor) return
    onChange({ margin: updateSiteMargin(editor, value) })
  }

  const commit = (action: () => unknown, select = row) => {
    if (!editor) return
    action()
    onChange({ select })
  }

  const addRow = (preset: LayoutPreset) => {
    if (!editor) return
    const addedRow = appendLayoutRow(editor, preset)
    if (addedRow) editor.select(addedRow)
    onChange({ select: addedRow })
  }

  return (
    <div className="gjs-grid-layout-panel">
      <section className="gjs-grid-layout-card">
        <div className="gjs-grid-layout-heading">
          <span aria-hidden="true">↔</span>
          <div>
            <strong>Margen general</strong>
            <small>Espacio exterior común para toda la página.</small>
          </div>
          <output>{margin}px</output>
        </div>
        <input
          aria-label="Margen general del sitio"
          max="96"
          min="0"
          onInput={(event) => applyMargin(Number(event.currentTarget.value))}
          step="4"
          type="range"
          value={margin}
        />
        <div className="gjs-grid-margin-options">
          {[24, 32, 48].map((value) => (
            <button
              aria-pressed={margin === value}
              className={margin === value ? 'active' : ''}
              key={value}
              onClick={() => applyMargin(value)}
              type="button"
            >{value}px</button>
          ))}
        </div>
      </section>

      {sectionGrid && (
        <section className="gjs-grid-layout-card">
          <div className="gjs-grid-layout-heading">
            <span aria-hidden="true">▦</span>
            <div>
              <strong>Columnas de la sección</strong>
              <small>Distribuye sus tarjetas sin cambiar otras secciones.</small>
            </div>
          </div>

          <label className="gjs-grid-layout-label" htmlFor="psl-section-column-count">Cantidad de columnas</label>
          <select
            aria-label="Cantidad de columnas de la sección"
            id="psl-section-column-count"
            onChange={(event) => commit(() => updateSectionColumnCount(sectionGrid, Number(event.currentTarget.value)), sectionGrid)}
            value={sectionSettings.columns.length}
          >
            {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>

          <label className="gjs-grid-layout-label">Ancho de columnas · 100% total</label>
          <div className="gjs-section-column-widths">
            {sectionSettings.columns.map((width, index) => (
              <label key={index}>
                <span>{index + 1}</span>
                <input
                  aria-label={`Ancho de columna ${index + 1}`}
                  disabled={index === sectionSettings.columns.length - 1}
                  max="95"
                  min="5"
                  onChange={(event) => commit(
                    () => updateSectionColumnWidth(sectionGrid, index, Number(event.currentTarget.value)),
                    sectionGrid,
                  )}
                  type="number"
                  value={width}
                />
                <small>%</small>
              </label>
            ))}
          </div>
          <p className="gjs-grid-direct-hint">La última columna recibe automáticamente el porcentaje restante.</p>

          <label className="gjs-grid-layout-label" htmlFor="psl-section-gap">Espacio entre columnas · {sectionSettings.gap}px</label>
          <input
            id="psl-section-gap"
            max="64"
            min="0"
            onInput={(event) => commit(() => updateSectionGap(sectionGrid, Number(event.currentTarget.value)), sectionGrid)}
            step="4"
            type="range"
            value={sectionSettings.gap}
          />

          <label className="gjs-grid-layout-label" htmlFor="psl-section-margin">Margen vertical de la sección · {sectionSettings.margin}px</label>
          <input
            id="psl-section-margin"
            max="120"
            min="0"
            onInput={(event) => commit(() => updateSectionMargin(sectionGrid, Number(event.currentTarget.value)), sectionGrid)}
            step="4"
            type="range"
            value={sectionSettings.margin}
          />

          <label className="gjs-grid-layout-label" htmlFor="psl-section-padding">Espacio interior de la sección · {sectionSettings.padding}px</label>
          <input
            id="psl-section-padding"
            max="120"
            min="0"
            onInput={(event) => commit(() => updateSectionPadding(sectionGrid, Number(event.currentTarget.value)), sectionGrid)}
            step="4"
            type="range"
            value={sectionSettings.padding}
          />
          <p className="gjs-grid-direct-hint">En móvil, las columnas se apilan automáticamente.</p>
        </section>
      )}

      {row && (
        <section className="gjs-grid-layout-card">
          <div className="gjs-grid-layout-heading">
            <span aria-hidden="true">▥</span>
            <div>
              <strong>Fila de diseño</strong>
              <small>Solo modifica las columnas de esta fila.</small>
            </div>
          </div>

          <label className="gjs-grid-layout-label">Distribución</label>
          <div className="gjs-layout-preset-options">
            {LAYOUT_PRESETS.map((preset) => (
              <button
                aria-pressed={settings.preset === preset.id}
                className={settings.preset === preset.id ? 'active' : ''}
                key={preset.id}
                onClick={() => commit(() => updateLayoutPreset(row, preset.id))}
                type="button"
              >
                <span className={`gjs-layout-preset-icon preset-${preset.id}`} aria-hidden="true">
                  {Array.from({ length: preset.columns }, (_, index) => <i key={index} />)}
                </span>
                {preset.label}
              </button>
            ))}
          </div>

          <label className="gjs-grid-layout-label" htmlFor="psl-layout-gap">Espacio entre columnas · {settings.gap}px</label>
          <input
            id="psl-layout-gap"
            max="64"
            min="0"
            onInput={(event) => commit(() => updateLayoutGap(row, Number(event.currentTarget.value)))}
            step="4"
            type="range"
            value={settings.gap}
          />

          <label className="gjs-grid-layout-label" htmlFor="psl-layout-height">Altura mínima de la fila · {settings.minHeight}px</label>
          <input
            id="psl-layout-height"
            max="640"
            min="48"
            onInput={(event) => commit(() => updateLayoutMinHeight(row, Number(event.currentTarget.value)))}
            step="8"
            type="range"
            value={settings.minHeight}
          />
          <p className="gjs-grid-direct-hint">La fila crece automáticamente si su contenido necesita más altura. En móvil, las columnas se apilan.</p>

          <label className="gjs-grid-layout-label">Orden de la fila</label>
          <div className="gjs-grid-order-options">
            <button
              disabled={order.index <= 0}
              onClick={() => commit(() => moveLayoutRow(row, -1))}
              type="button"
            >↑ Subir</button>
            <button
              disabled={order.index < 0 || order.index >= order.count - 1}
              onClick={() => commit(() => moveLayoutRow(row, 1))}
              type="button"
            >↓ Bajar</button>
          </div>
        </section>
      )}

      <section className="gjs-grid-layout-card">
        <div className="gjs-grid-layout-heading">
          <span aria-hidden="true">＋</span>
          <div>
            <strong>Añadir fila</strong>
            <small>Elige una distribución preparada.</small>
          </div>
        </div>
        <div className="gjs-layout-add-options">
          {LAYOUT_PRESETS.map((preset) => (
            <button disabled={!editor} key={preset.id} onClick={() => addRow(preset.id)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
      </section>
      <p className="gjs-grid-section-note">Las filas se apilan verticalmente. Arrastra elementos entre sus columnas para colocarlos lado a lado.</p>
    </div>
  )
}
