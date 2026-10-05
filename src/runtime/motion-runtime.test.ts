import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMotionConfigSource, createMotionRuntimeSource } from './motion-runtime'

afterEach(() => {
  document.body.innerHTML = ''
  delete window.__MOTION_ANALYSIS__
  delete window.__BUILDER_RUNTIME_VALUE_STORE__
  vi.restoreAllMocks()
})

describe('motion runtime source', () => {
  it('serializes a self-contained runtime that can start with no activities', () => {
    const source = `${createMotionConfigSource({
      activities: [],
      currentPage: 'home',
    })}\n${createMotionRuntimeSource()}`

    expect(() => new Function(source)()).not.toThrow()
    expect(window.__MOTION_ANALYSIS__?.currentPage).toBe('home')
  })

  it('serializes the MediaPipe task adapter and provider-neutral runtime', () => {
    const source = createMotionRuntimeSource()

    expect(source).toContain('@mediapipe/tasks-vision@0.10.22-rc.20250304')
    expect(source).toContain('gesture-recognizer')
    expect(source).toContain('ObjectDetector')
    expect(source).toContain('FilesetResolver')
    expect(source).toContain('return import(url)')
    expect(source).toContain('drawHolisticOverlay')
    expect(source).toContain('leftHandLandmarks')
    expect(source).toContain('poseLandmarks')
    expect(source).toContain('faceLandmarks')
    expect(source).toContain('selection?.pose !== false')
    expect(source).toContain('outputFaceBlendshapes: false')
    expect(source).toContain('config.delegate === "gpu"')
    expect(source).toContain('Grabando movimiento…')
    expect(source).toContain('Capturando landmarks…')
    expect(source).toContain('Analizando todos los frames…')
    expect(source).toContain('np.nan_to_num(keypoints)')
    expect(source).toContain('results.pose_landmarks')
    expect(source).toContain('left_hand = np.zeros(63).tolist()')
    expect(source).toContain('right_hand = np.zeros(63).tolist()')
    expect(source).toContain('prepareReferenceSequencesWithPython')
    expect(source).toContain('pythonSequences')
    expect(source).toContain('autoAnalyzesReferenceUpload ? 4 : 3')
    expect(source).toContain('frames: autoAnalyzesReferenceUpload ? undefined : preparedInput')
    expect(source).toContain('poseLandmarks: frame.poseLandmarks')
    expect(source).toContain('library: "landmark_utils"')
    expect(source).toContain('requestVideoFrameCallback')
    expect(source).not.toContain('Math.min(48')
    expect(source).toContain('Cancelar análisis')
    expect(source).toContain('motion:capture-progress')
    expect(source).not.toContain('motion:live-result')
    expect(source).toContain('builder:runtime-value')
    expect(source).toContain('publishAnalyzeLandmarks(activity, captured.landmarkFrames)')
    expect(source).toContain('activity.runtimeOutputId || runtimeHelpers.landmarkFramesOutputId')
    expect(source).toContain('activity.mode !== "analyze"')
    expect(source).toContain('landmark-frames')
    expect(source).toContain('Number.POSITIVE_INFINITY')
    expect(source).toContain('Detener y finalizar')
    expect(source).toContain('Analizar otra grabación')
    expect(source).toContain('Ver análisis')
    expect(source).toContain('Pausar revisión')
    expect(source).toContain('Continuar revisión')
    expect(source).toContain('Reproducir de nuevo')
    expect(source).toContain('activity.mode === "compare" || activity.mode === "analyze"')
    expect(source).toContain('analyzesUploadedVideo ? selectedVideoUrl : learnerRecordingUrl')
    expect(source).toContain('The video is the review clock')
    expect(source).toContain('video.currentTime - videoStart')
    expect(source).toContain('runtimeWindow.requestAnimationFrame')
    expect(source).toContain('El video temporal permanece solamente en esta pestaña.')
    expect(source).toContain('motion:analysis')
    expect(source).not.toContain('while (frames.length > 120)')
    expect(source).toContain('await ensureDetector(activity)')
    expect(source).toContain('captured.frames.filter(hasTrackedHand).length < 4')
    expect(source).toContain('No se detectaron suficientes cuadros con las manos visibles.')
    expect(source.indexOf('captured.frames.filter(hasTrackedHand).length < 4'))
      .toBeLessThan(source.indexOf('prepareSequence(captured.frames, activity)'))
    expect(source).toContain('Detener y guardar')
    expect(source).toContain('stopRequested')
    expect(source).toContain('fitScale')
    expect(source).toContain('fit === "cover"')
    expect(source).toContain('inputOverlayFit')
    expect(source).toContain('getComputedStyle(video).objectFit === "cover"')
    expect(source).toContain('renderedWidth')
    expect(source).toContain('replayLandmarkFrame')
    expect(source).toContain('Reproducir referencia')
    expect(source).toContain('recordedLandmarkFrames')
    expect(source).toContain("overall.setAttribute(\"aria-label\"")
    expect(source).toContain('data-motion-template-field')
    expect(source).toContain('Referencia lista.')
    expect(source).toContain('data-motion-source-mode')
    expect(source).toContain('landmarkFrames')
    expect(source).toContain('analyzeSelectedVideo')
    expect(source).toContain('Analizar tramo del video')
    expect(source).toContain('data-motion-segment-start')
    expect(source).toContain('data-motion-crop-edit')
    expect(source).toContain('data-motion-crop-box')
    expect(source).toContain('cropInteraction === "move"')
    expect(source).toContain('cropInteraction === "left"')
    expect(source).toContain('cropInteraction === "right"')
    expect(source).toContain('cropInteraction === "top"')
    expect(source).toContain('ajustar cada borde')
    expect(source).toContain('sourceCrop')
    expect(source).toContain('transformOrigin')
    expect(source).toContain('> .2')
    expect(source).toContain('sourceSegment')
    expect(source).toContain('storedClip')
    expect(source).toContain('Contar en puntuación')
    expect(source).toContain('scoredStageComparisons')
    expect(source).toContain('No cuenta')
    expect(source).toContain('captureStream')
    expect(source).toContain('MediaRecorder')
    expect(source).toContain('Preparando solamente el tramo y encuadre seleccionados')
    expect(source).toContain('startSeconds')
    expect(source).toContain('endSeconds')
    expect(source).toContain('data-motion-reference-preview')
    expect(source).toContain('syncReferencePresentation')
    expect(source).toContain('previewTemplate?.storedClip ? "cover" : "contain"')
    expect(source).toContain('storedFrame?.width')
    expect(source).toContain('new ResizeObserverConstructor')
    expect(source).toContain('drawReferenceFrame')
    expect(source).toContain('referencePreview.style.left')
    expect(source).toContain('Puntos de referencia listos')
    expect(source).toContain('const legacyVersion = record.version === 2')
    expect(source).toContain('detectorTask: legacyVersion ? "holistic-landmarker"')
    expect(source).toContain('/storage/v1/object/authenticated/')
    expect(source).toContain('storageAddress')
    expect(source).toContain('Detener y comparar')
    expect(source).toContain('Ver mi intento')
    expect(source).toContain('MediaRecorder')
    expect(source).toContain('solamente en esta pestaña')
    expect(source).toContain('data-motion-sync-replay')
    expect(source).toContain('activity.mode === "compare" && Boolean(resultsDock)')
    expect(source).toContain('replayTogether')
    expect(source).toContain('Promise.all([replayStoredReference(referenceRange), replay(learnerRange)])')
    expect(source).toContain('requiredHand')
    expect(source).toContain('satisfiesRequiredHand')
    expect(source).toContain('Esta práctica utiliza la mano derecha')
    expect(source).toContain('bodyRelativeHandMetrics')
    expect(source).toContain('detectorTask')
    expect(source).toContain('templateFramesForActivity')
    expect(source).toContain('suggestMotionStages')
    expect(source).toContain('compareMotionStages')
    expect(source).toContain('data-motion-stage-editor')
    expect(source).toContain('if (autoAnalyzesReferenceUpload) {')
    expect(source).toContain('motionInput?.querySelector("[data-motion-stage-overlay]")?.remove()')
    expect(source).toContain('motion-stage-timeline')
    expect(source).toContain('previewStageProgress')
    expect(source).toContain('setPointerCapture')
    expect(source).toContain('Línea de tiempo de la referencia')
    expect(source).toContain('Reproducir esta etapa')
    expect(source).toContain('stages: stageResults')
    expect(source).toContain('saveReferenceTemplate')
    expect(source).toContain('key.startsWith("context-")')
    expect(source).not.toContain('builder-context-')
    expect(source).toContain('Referencia guardada en Supabase.')
    expect(source).toContain('method: "PATCH"')
    expect(source).toContain('classList.toggle("is-mirrored"')
    expect(source).toContain('classList.remove("is-mirrored")')
    expect(source).toContain('new Worker')
    expect(source).toContain('pyodide.loadPackage("numpy")')
  })

  it('renders stored landmarks from a legacy version 2 data reference', async () => {
    const landmarkFrame = {
      t: 0,
      width: 640,
      height: 480,
      poseLandmarks: [[{ x: 0.5, y: 0.5, z: 0 }]],
      leftHandLandmarks: [],
      rightHandLandmarks: [],
    }
    document.body.innerHTML = `<section data-motion-activity data-motion-workspace
      data-builder-element-id="legacy-reference">
      <button data-motion-start></button>
      <video data-motion-camera></video>
      <span data-motion-status></span>
      <video data-motion-reference-video hidden></video>
      <canvas data-motion-reference-preview hidden></canvas>
      <p data-motion-reference-empty></p>
      <button data-motion-reference-replay disabled></button>
      <span data-motion-reference-status></span>
    </section>`
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const publish = vi.fn(() => true)
    window.__BUILDER_RUNTIME_VALUE_STORE__ = {
      has: vi.fn(() => false),
      list: vi.fn(() => []),
      publish,
      read: vi.fn(() => undefined),
    }

    const config = {
      currentPage: 'legacy-page',
      dataSources: [{
        id: 'legacy-practices',
        name: 'Practices',
        type: 'static',
        records: [{
          id: 'legacy-practice',
          media_url: 'https://example.test/reference.mp4',
          mediapipe_reference: {
            version: 2,
            durationMs: 1_000,
            frames: [{
              t: 0, handShape: [], location: [], orientation: [],
              trajectory: [], facePosture: [], quality: 1,
            }],
            landmarkFrames: [landmarkFrame],
          },
        }],
      }],
      activities: [{
        id: 'legacy-view',
        runtimeSourceId: 'reference-view',
        runtimeOutputId: 'reference_video_results',
        pageId: 'legacy-page',
        elementId: 'legacy-reference',
        mode: 'analyze',
        componentType: 'reference-view',
        input: { type: 'camera', durationMs: 3_000, facingMode: 'user' },
        reference: {
          type: 'data', dataSourceId: 'legacy-practices', contextKey: 'record',
          recordMode: 'first', templateField: 'mediapipe_reference', videoField: 'media_url',
        },
        referenceOutput: { type: 'download' },
        detector: {
          provider: 'mediapipe', task: 'holistic-landmarker',
          modelUrl: 'https://example.test/holistic.task', minConfidence: 0.5,
          delegate: 'auto', landmarks: { hands: true, pose: true, face: false },
        },
        evaluator: { type: 'quality', passingScore: 75 },
        processing: { checkpointReduction: true, smoothing: 3 },
        presentation: { referenceDisplay: 'video-reference', showResults: false },
      }],
    }

    new Function(`${createMotionConfigSource(config as never)}\n${createMotionRuntimeSource()}`)()

    await vi.waitFor(() => expect(document.querySelector('[data-motion-reference-status]'))
      .toHaveTextContent('Video y referencia listos.'))
    expect(document.querySelector('[data-motion-reference-preview]')).not.toHaveAttribute('hidden')
    expect(document.querySelector('[data-motion-reference-replay]')).toBeEnabled()
    expect(publish).toHaveBeenCalledWith({
      sourceId: 'reference-view',
      outputId: 'reference_video_results',
      type: 'json',
      value: [landmarkFrame],
    })
  })

  it('serializes scoring without build-tool globals or missing helpers', () => {
    const source = createMotionRuntimeSource()
    const frame = {
      facePosture: [0.1, 0.2],
      handShape: [0.25, 0.5],
      location: [0.1, -0.1, 0],
      orientation: [0, 0, 1],
      quality: 1,
      t: 1_000,
      trajectory: [0.05, 0, 0],
    }
    const compare = new Function(`${source}\nreturn compareMotionSequences;`)() as (
      left: typeof frame[],
      right: typeof frame[],
    ) => { overallScore: number }
    const comparison = compare([frame], [frame])
    const leftHand = {
      ...frame,
      handShape: [1, ...Array(15).fill(0.75), 0, ...Array(15).fill(0)],
      location: [1, 0.5, 0.25, 0, 0, 0, 0, 0],
      orientation: [1, 0, 0, 1, 0, 0, 0, 0],
    }
    const rightHand = {
      ...frame,
      handShape: [0, ...Array(15).fill(0), 1, ...Array(15).fill(0.75)],
      location: [0, 0, 0, 0, 1, 0.5, 0.25, 0],
      orientation: [0, 0, 0, 0, 1, 0, 0, 1],
    }

    expect(source).not.toContain('__vite_ssr_import_')
    expect(source).toContain('const scoreDistance =')
    expect(comparison.overallScore).toBe(100)
    expect(compare([leftHand], [rightHand]).overallScore).toBeLessThan(80)
  })
})
