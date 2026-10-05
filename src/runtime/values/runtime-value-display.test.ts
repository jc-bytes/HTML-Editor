import { beforeEach, describe, expect, it } from 'vitest'
import { installRuntimeValueDisplays, installRuntimeValueStore } from './runtime-value-store'

describe('runtime variable display', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <article data-builder-variable-display
        data-builder-variable-binding='{"key":"lab::variables","path":["error_pose"]}'
        data-builder-variable-label="Pose error"
        data-builder-variable-format="progress"
        data-builder-variable-max="0.1">
        <span data-builder-variable-display-label></span>
        <strong data-builder-variable-display-value></strong>
        <progress data-builder-variable-display-progress></progress>
        <small data-builder-variable-display-status></small>
      </article>`
  })

  it('renders a selected nested variable and updates when its producer publishes', () => {
    const { store } = installRuntimeValueStore(window, document)
    installRuntimeValueDisplays(window, document)

    expect(document.querySelector('[data-builder-variable-display-value]')?.textContent)
      .toBe('Esperando datos…')

    store.publish({ sourceId: 'lab', outputId: 'variables', type: 'json', value: { error_pose: 0.009619 } })

    expect(document.querySelector('[data-builder-variable-display-label]')?.textContent).toBe('Pose error')
    expect(document.querySelector('[data-builder-variable-display-value]')?.textContent).toBe('0.0096')
    const progress = document.querySelector<HTMLProgressElement>('[data-builder-variable-display-progress]')!
    expect(progress.hidden).toBe(false)
    expect(progress.max).toBe(0.1)
    expect(progress.value).toBeCloseTo(0.009619)
  })
})
