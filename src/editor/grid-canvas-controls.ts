import type { Component, Editor } from 'grapesjs'
import {
  GRID_DESKTOP_COLUMNS,
  type GridDragAction,
  gridItemFor,
  gridPlacementAfterDrag,
  readGridItemPlacement,
  updateGridItemPlacement,
} from './grid-layout'

const CONTROLS_ATTRIBUTE = 'data-psl-grid-canvas-controls'

function isDesktop(editor: Editor) {
  const device = String(editor.Devices.getSelected()?.get('name') ?? '').toLowerCase()
  return !device.includes('mobile') && !device.includes('tablet')
}

function controlButton(document: Document, action: GridDragAction, label: string, glyph: string) {
  const button = document.createElement('button')
  button.className = 'psl-grid-canvas-control'
  button.dataset.gridAction = action
  button.setAttribute('aria-label', label)
  button.setAttribute('title', label)
  button.type = 'button'
  button.textContent = glyph
  return button
}

export function mountGridCanvasControls(
  editor: Editor,
  selected: Component | null | undefined,
  callbacks: { onCommit: () => void; onUpdate: (item: Component) => void },
) {
  const document = editor.Canvas.getDocument()
  document?.querySelectorAll(`[${CONTROLS_ATTRIBUTE}]`).forEach((element) => element.remove())
  if (!document || !isDesktop(editor)) return () => undefined

  const item = gridItemFor(selected)
  const element = item?.getEl()
  const grid = element?.parentElement
  if (!item || !element || !grid) return () => undefined

  const overlay = document.createElement('div')
  overlay.className = 'psl-grid-canvas-controls'
  overlay.setAttribute(CONTROLS_ATTRIBUTE, '')
  overlay.append(
    controlButton(document, 'move', 'Mover horizontalmente', '↔'),
    controlButton(document, 'resize-left', 'Redimensionar desde la izquierda', '‹'),
    controlButton(document, 'resize-right', 'Redimensionar desde la derecha', '›'),
  )
  document.body.append(overlay)

  const positionOverlay = () => {
    if (!element.isConnected || !overlay.isConnected) return
    const rect = element.getBoundingClientRect()
    overlay.style.left = `${rect.left + document.defaultView!.scrollX}px`
    overlay.style.top = `${rect.top + document.defaultView!.scrollY}px`
    overlay.style.width = `${rect.width}px`
    overlay.style.height = `${Math.max(rect.height, 28)}px`
  }

  let removeDragListeners = () => undefined
  const beginDrag = (action: GridDragAction, event: MouseEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    removeDragListeners()
    document.body.classList.add('psl-grid-guides')
    const initial = readGridItemPlacement(item)
    updateGridItemPlacement(item, initial)
    const initialX = event.clientX
    const gridStep = (gridElement: Element) => {
      const gridStyle = document.defaultView!.getComputedStyle(gridElement)
      const gap = Number.parseFloat(gridStyle.columnGap) || 20
      const columnWidth = (gridElement.getBoundingClientRect().width - (gap * (GRID_DESKTOP_COLUMNS - 1))) / GRID_DESKTOP_COLUMNS
      return Math.max(1, columnWidth + gap)
    }

    const handleMove = (moveEvent: MouseEvent) => {
      const columnDelta = Math.round((moveEvent.clientX - initialX) / gridStep(grid))
      updateGridItemPlacement(item, gridPlacementAfterDrag(initial, action, columnDelta))
      callbacks.onUpdate(item)
      positionOverlay()
    }
    const handleEnd = () => {
      removeDragListeners()
      document.body.classList.remove('psl-grid-guides')
      callbacks.onCommit()
      positionOverlay()
    }
    removeDragListeners = () => {
      document.removeEventListener('mousemove', handleMove, true)
      document.removeEventListener('mouseup', handleEnd, true)
    }
    document.addEventListener('mousemove', handleMove, true)
    document.addEventListener('mouseup', handleEnd, true)
  }

  const handleControlMouseDown = (event: MouseEvent) => {
    const target = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-grid-action]') ?? null
    if (!target || !overlay.contains(target)) return
    beginDrag(target.dataset.gridAction as GridDragAction, event)
  }
  document.addEventListener('mousedown', handleControlMouseDown, true)
  const frameWindow = document.defaultView
  frameWindow?.addEventListener('scroll', positionOverlay, true)
  frameWindow?.addEventListener('resize', positionOverlay)
  const resizeObserver = frameWindow?.ResizeObserver ? new frameWindow.ResizeObserver(positionOverlay) : undefined
  resizeObserver?.observe(element)
  positionOverlay()

  return () => {
    removeDragListeners()
    document.body.classList.remove('psl-grid-guides')
    document.removeEventListener('mousedown', handleControlMouseDown, true)
    frameWindow?.removeEventListener('scroll', positionOverlay, true)
    frameWindow?.removeEventListener('resize', positionOverlay)
    resizeObserver?.disconnect()
    overlay.remove()
  }
}
