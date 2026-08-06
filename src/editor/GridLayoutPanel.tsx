import type { Component, Editor } from 'grapesjs'
import {
  alignGridItem,
  appendGridSlot,
  GRID_DESKTOP_COLUMNS,
  gridItemOrder,
  moveGridItem,
  placeGridItemBesidePrevious,
  readGridItemPlacement,
  updateGridItemPlacement,
  updateSiteMargin,
} from './grid-layout'

const GRID_WIDTHS = [3, 4, 6, 8, 12]

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
  const placement = readGridItemPlacement(item)
  const order = gridItemOrder(item)

  const applyMargin = (value: number) => {
    if (!editor) return
    const nextMargin = updateSiteMargin(editor, value)
    onChange({ margin: nextMargin })
  }

  const commit = (action: () => Component | boolean | GridItemPlacement | undefined) => {
    if (!editor) return
    action()
    onChange()
  }

  return (
    <div className="gjs-grid-layout-panel">
      <section className="gjs-grid-layout-card">
        <div className="gjs-grid-layout-heading">
          <span aria-hidden="true">↔</span>
          <div>
            <strong>Margen general</strong>
            <small>Se adapta automáticamente en tableta y móvil.</small>
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

      {item && (
        <section className="gjs-grid-layout-card">
          <div className="gjs-grid-layout-heading">
            <span aria-hidden="true">▦</span>
            <div>
              <strong>Elemento en cuadrícula</strong>
              <small>Fila {placement.row} · Columnas {placement.start}–{placement.start + placement.span - 1} de {GRID_DESKTOP_COLUMNS}</small>
            </div>
          </div>
          <p className="gjs-grid-direct-hint">Usa el control morado ✥ para mover la celda completa. Suelta a los lados de otra celda para colocarlas juntas.</p>

          <label className="gjs-grid-layout-label">Ancho en escritorio</label>
          <div className="gjs-grid-width-options">
            {GRID_WIDTHS.map((span) => (
              <button
                aria-pressed={placement.span === span}
                className={placement.span === span ? 'active' : ''}
                key={span}
                onClick={() => commit(() => updateGridItemPlacement(item, { span }))}
                type="button"
              >{span}</button>
            ))}
          </div>

          <label className="gjs-grid-layout-label">Alineación</label>
          <div className="gjs-grid-align-options">
            <button onClick={() => commit(() => alignGridItem(item, 'left'))} type="button">Izquierda</button>
            <button onClick={() => commit(() => alignGridItem(item, 'center'))} type="button">Centro</button>
            <button onClick={() => commit(() => alignGridItem(item, 'right'))} type="button">Derecha</button>
          </div>

          <label className="gjs-grid-layout-label">Posición horizontal</label>
          <div className="gjs-grid-order-options">
            <button
              disabled={placement.start <= 1}
              onClick={() => commit(() => updateGridItemPlacement(item, { start: placement.start - 1 }))}
              type="button"
            >← Una columna</button>
            <button
              disabled={placement.start >= GRID_DESKTOP_COLUMNS - placement.span + 1}
              onClick={() => commit(() => updateGridItemPlacement(item, { start: placement.start + 1 }))}
              type="button"
            >Una columna →</button>
          </div>

          <label className="gjs-grid-layout-label">Orden vertical</label>
          <div className="gjs-grid-order-options">
            <button
              disabled={order.index <= 0}
              onClick={() => commit(() => moveGridItem(item, -1))}
              type="button"
            >↑ Subir</button>
            <button
              disabled={order.index < 0 || order.index >= order.count - 1}
              onClick={() => commit(() => moveGridItem(item, 1))}
              type="button"
            >↓ Bajar</button>
          </div>

          <label className="gjs-grid-layout-label">Disposición rápida</label>
          <div className="gjs-grid-quick-options">
            <button
              disabled={order.index <= 0}
              onClick={() => commit(() => placeGridItemBesidePrevious(item))}
              type="button"
            >Colocar junto al anterior · 6 + 6</button>
          </div>
        </section>
      )}

      <button
        className="gjs-grid-add-section"
        disabled={!editor}
        onClick={() => {
          if (!editor) return
          const slot = appendGridSlot(editor)
          if (slot) editor.select(slot)
          onChange({ select: slot })
        }}
        type="button"
      >+ Añadir espacio de cuadrícula</button>
      <p className="gjs-grid-section-note">La página usa una sola cuadrícula fija. Los elementos se colocan por columnas y crean nuevas filas automáticamente.</p>
    </div>
  )
}

type GridItemPlacement = ReturnType<typeof readGridItemPlacement>
