import type { Component, Editor } from 'grapesjs'
import {
  GRID_DESKTOP_COLUMNS,
  type GridDragAction,
  gridItemFor,
  gridPlacementAfterDrag,
  insertGridItemAtRow,
  isGridItem,
  placeGridItemBesidePeer,
  readGridItemPlacement,
  resolveGridItemDrop,
  sortGridItemsByPlacement,
  updateGridItemPlacement,
} from './grid-layout'

const CONTROLS_ATTRIBUTE = 'data-psl-grid-canvas-controls'
const DROP_ZONE_ATTRIBUTE = 'data-psl-grid-drop-zone'

export type GridDropZone = 'above' | 'below' | 'left' | 'right'
type RectLike = Pick<DOMRect, 'bottom' | 'height' | 'left' | 'right' | 'top' | 'width'>

export function gridDropZoneAtPoint(rect: RectLike, x: number, y: number): GridDropZone | undefined {
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return undefined
  const verticalRatio = (y - rect.top) / Math.max(1, rect.height)
  if (verticalRatio <= .25) return 'above'
  if (verticalRatio >= .75) return 'below'
  return x < rect.left + rect.width / 2 ? 'left' : 'right'
}

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
  const selectedOwnsCellControls = selected === item || selected?.parent() === item
  const element = item?.getEl()
  const grid = element?.parentElement
  if (!item || !selectedOwnsCellControls || !element || !grid) return () => undefined

  const overlay = document.createElement('div')
  overlay.className = 'psl-grid-canvas-controls'
  overlay.setAttribute(CONTROLS_ATTRIBUTE, '')
  overlay.append(
    controlButton(document, 'move', 'Mover en la cuadrícula', '✥'),
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
    if (action !== 'move') updateGridItemPlacement(item, initial)
    const initialX = event.clientX
    const parent = item.parent()
    const siblingSnapshots = parent?.components().models
      .filter((candidate) => candidate !== item && isGridItem(candidate))
      .map((candidate) => ({
        item: candidate,
        placement: readGridItemPlacement(candidate),
        rect: candidate.getEl()?.getBoundingClientRect(),
      }))
      .filter((snapshot): snapshot is typeof snapshot & { rect: DOMRect } => Boolean(snapshot.rect)) ?? []
    const dropZoneRecords: Array<{
      element: HTMLDivElement
      snapshot: (typeof siblingSnapshots)[number]
      zone: GridDropZone
    }> = []
    let activeDrop: { snapshot: (typeof siblingSnapshots)[number]; zone: GridDropZone } | undefined
    const zoneLabels: Record<GridDropZone, string> = {
      above: 'Soltar arriba',
      below: 'Soltar abajo',
      left: 'Soltar a la izquierda',
      right: 'Soltar a la derecha',
    }
    const positionDropZone = (dropZone: HTMLDivElement, rect: DOMRect, zone: GridDropZone) => {
      const scrollX = document.defaultView!.scrollX
      const scrollY = document.defaultView!.scrollY
      const sideTop = rect.top + rect.height * .25
      const sideHeight = rect.height * .5
      const styles = zone === 'above'
        ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height * .25 }
        : zone === 'below'
          ? { left: rect.left, top: rect.top + rect.height * .75, width: rect.width, height: rect.height * .25 }
          : zone === 'left'
            ? { left: rect.left, top: sideTop, width: rect.width * .5, height: sideHeight }
            : { left: rect.left + rect.width * .5, top: sideTop, width: rect.width * .5, height: sideHeight }
      dropZone.style.left = `${styles.left + scrollX}px`
      dropZone.style.top = `${styles.top + scrollY}px`
      dropZone.style.width = `${styles.width}px`
      dropZone.style.height = `${styles.height}px`
    }
    if (action === 'move') {
      siblingSnapshots.forEach((snapshot) => {
        ;(['above', 'below', 'left', 'right'] as GridDropZone[]).forEach((zone) => {
          const dropZone = document.createElement('div')
          dropZone.className = 'psl-grid-drop-zone'
          dropZone.setAttribute(DROP_ZONE_ATTRIBUTE, '')
          dropZone.dataset.dropZone = zone
          dropZone.textContent = zoneLabels[zone]
          positionDropZone(dropZone, snapshot.rect, zone)
          document.body.append(dropZone)
          dropZoneRecords.push({ element: dropZone, snapshot, zone })
        })
      })
    }
    const updateActiveDrop = (x: number, y: number) => {
      activeDrop = undefined
      for (const snapshot of siblingSnapshots) {
        const zone = gridDropZoneAtPoint(snapshot.rect, x, y)
        if (zone) {
          activeDrop = { snapshot, zone }
          break
        }
      }
      dropZoneRecords.forEach((record) => record.element.classList.toggle(
        'active',
        record.snapshot === activeDrop?.snapshot && record.zone === activeDrop.zone,
      ))
    }
    const gridStep = (gridElement: Element) => {
      const gridStyle = document.defaultView!.getComputedStyle(gridElement)
      const gap = Number.parseFloat(gridStyle.columnGap) || 20
      const columnWidth = (gridElement.getBoundingClientRect().width - (gap * (GRID_DESKTOP_COLUMNS - 1))) / GRID_DESKTOP_COLUMNS
      return Math.max(1, columnWidth + gap)
    }

    const handleMove = (moveEvent: MouseEvent) => {
      const columnDelta = Math.round((moveEvent.clientX - initialX) / gridStep(grid))
      if (action === 'move') {
        updateActiveDrop(moveEvent.clientX, moveEvent.clientY)
      } else {
        updateGridItemPlacement(item, gridPlacementAfterDrag(initial, action, columnDelta))
        callbacks.onUpdate(item)
        positionOverlay()
      }
    }
    const handleEnd = (endEvent: MouseEvent) => {
      let committed = action !== 'move'
      if (action === 'move') {
        updateActiveDrop(endEvent.clientX, endEvent.clientY)
        const target = activeDrop
        if (target?.zone === 'left' || target?.zone === 'right') {
          committed = placeGridItemBesidePeer(item, target.snapshot.item, target.zone)
        } else if (target?.zone === 'above') {
          committed = insertGridItemAtRow(item, target.snapshot.placement.row)
        } else if (target?.zone === 'below') {
          committed = insertGridItemAtRow(item, target.snapshot.placement.row + 1)
        }
      } else {
        resolveGridItemDrop(item)
        const currentParent = item.parent()
        if (currentParent) sortGridItemsByPlacement(currentParent)
      }
      removeDragListeners()
      document.body.classList.remove('psl-grid-guides')
      if (committed) {
        callbacks.onUpdate(item)
        callbacks.onCommit()
      }
      positionOverlay()
    }
    removeDragListeners = () => {
      document.removeEventListener('mousemove', handleMove, true)
      document.removeEventListener('mouseup', handleEnd, true)
      dropZoneRecords.forEach((record) => record.element.remove())
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
