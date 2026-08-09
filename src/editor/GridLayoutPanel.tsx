import type { Component, Editor } from 'grapesjs'
import { useState, type ReactNode } from 'react'
import {
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

function LayoutAccordion({ children, defaultOpen = false, title }: {
  children: ReactNode
  defaultOpen?: boolean
  title: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details
      className="gjs-grid-layout-card gjs-grid-layout-accordion"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary className="gjs-grid-layout-heading">
        <i aria-hidden="true" className="gjs-grid-layout-chevron" />
        <strong>{title}</strong>
      </summary>
      <div className="gjs-grid-layout-body">{children}</div>
    </details>
  )
}

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

  return (
    <div className="gjs-grid-layout-panel">
      <LayoutAccordion title="Margen general">
        <label className="gjs-grid-layout-label" htmlFor="builder-site-margin">Margen · {margin}px</label>
        <input
          aria-label="Margen general del sitio"
          id="builder-site-margin"
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
      </LayoutAccordion>

      {sectionGrid && (
        <LayoutAccordion defaultOpen title="Diseño de tarjetas">

          <label className="gjs-grid-layout-label" htmlFor="builder-section-column-count">Tarjetas por fila</label>
          <select
            aria-label="Tarjetas por fila"
            id="builder-section-column-count"
            onChange={(event) => commit(() => updateSectionColumnCount(sectionGrid, Number(event.currentTarget.value)), sectionGrid)}
            value={sectionSettings.columns.length}
          >
            {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>

          <label className="gjs-grid-layout-label">Ancho de tarjetas · 100% total</label>
          <div className="gjs-section-column-widths">
            {sectionSettings.columns.map((width, index) => (
              <label key={index}>
                <span>{index + 1}</span>
                <input
                  aria-label={`Ancho de tarjeta ${index + 1}`}
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
          <p className="gjs-grid-direct-hint">La última tarjeta recibe automáticamente el porcentaje restante.</p>

          <label className="gjs-grid-layout-label" htmlFor="builder-section-gap">Espacio entre tarjetas · {sectionSettings.gap}px</label>
          <input
            id="builder-section-gap"
            max="64"
            min="0"
            onInput={(event) => commit(() => updateSectionGap(sectionGrid, Number(event.currentTarget.value)), sectionGrid)}
            step="4"
            type="range"
            value={sectionSettings.gap}
          />

          <label className="gjs-grid-layout-label" htmlFor="builder-section-margin">Margen vertical de la sección · {sectionSettings.margin}px</label>
          <input
            id="builder-section-margin"
            max="120"
            min="0"
            onInput={(event) => commit(() => updateSectionMargin(sectionGrid, Number(event.currentTarget.value)), sectionGrid)}
            step="4"
            type="range"
            value={sectionSettings.margin}
          />

          <label className="gjs-grid-layout-label" htmlFor="builder-section-padding">Espacio interior de la sección · {sectionSettings.padding}px</label>
          <input
            id="builder-section-padding"
            max="120"
            min="0"
            onInput={(event) => commit(() => updateSectionPadding(sectionGrid, Number(event.currentTarget.value)), sectionGrid)}
            step="4"
            type="range"
            value={sectionSettings.padding}
          />
          <p className="gjs-grid-direct-hint">En móvil, las tarjetas se apilan automáticamente.</p>
        </LayoutAccordion>
      )}

      {row && (
        <LayoutAccordion defaultOpen={!sectionGrid} title="Fila de diseño">

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

          <label className="gjs-grid-layout-label" htmlFor="builder-layout-gap">Espacio entre columnas · {settings.gap}px</label>
          <input
            id="builder-layout-gap"
            max="64"
            min="0"
            onInput={(event) => commit(() => updateLayoutGap(row, Number(event.currentTarget.value)))}
            step="4"
            type="range"
            value={settings.gap}
          />

          <label className="gjs-grid-layout-label" htmlFor="builder-layout-height">Altura mínima de la fila · {settings.minHeight}px</label>
          <input
            id="builder-layout-height"
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
        </LayoutAccordion>
      )}

    </div>
  )
}
