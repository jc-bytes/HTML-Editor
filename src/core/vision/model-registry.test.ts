import { describe, expect, it } from 'vitest'
import {
  supportsVisionEvaluator,
  visionModelDefinition,
  visionModelRegistry,
  visionTaskIds,
} from './model-registry'

describe('vision model registry', () => {
  it('defines every public task exactly once', () => {
    expect(visionModelRegistry.map((model) => model.id)).toEqual(visionTaskIds)
    expect(new Set(visionModelRegistry.map((model) => model.id)).size).toBe(visionTaskIds.length)
  })

  it('keeps evaluators compatible with each output type', () => {
    expect(supportsVisionEvaluator('gesture-recognizer', 'gesture')).toBe(true)
    expect(supportsVisionEvaluator('gesture-recognizer', 'sequence')).toBe(false)
    expect(supportsVisionEvaluator('object-detector', 'detection')).toBe(true)
    expect(visionModelDefinition('unknown').id).toBe('holistic-landmarker')
  })
})
