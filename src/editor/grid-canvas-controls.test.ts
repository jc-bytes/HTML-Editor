import { describe, expect, it } from 'vitest'
import { gridDropZoneAtPoint } from './grid-canvas-controls'

describe('grid canvas drop zones', () => {
  const rect = { left: 100, right: 500, top: 200, bottom: 600, width: 400, height: 400 }

  it('detects visible side-by-side targets in the middle of a peer', () => {
    expect(gridDropZoneAtPoint(rect, 150, 400)).toBe('left')
    expect(gridDropZoneAtPoint(rect, 450, 400)).toBe('right')
  })

  it('detects vertical insertion targets at the peer edges', () => {
    expect(gridDropZoneAtPoint(rect, 300, 220)).toBe('above')
    expect(gridDropZoneAtPoint(rect, 300, 580)).toBe('below')
  })

  it('returns no target outside a peer so the move can be cancelled', () => {
    expect(gridDropZoneAtPoint(rect, 90, 400)).toBeUndefined()
    expect(gridDropZoneAtPoint(rect, 300, 610)).toBeUndefined()
  })
})
