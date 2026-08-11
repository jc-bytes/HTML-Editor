import { describe, expect, it } from 'vitest'
import { createMotionConfigSource, createMotionRuntimeSource } from './motion-runtime'

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
    expect(source).toContain('requestVideoFrameCallback')
    expect(source).not.toContain('Math.min(48')
    expect(source).toContain('Cancelar análisis')
    expect(source).toContain('motion:capture-progress')
    expect(source).not.toContain('motion:live-result')
    expect(source).toContain('builder:runtime-value')
    expect(source).toContain('publishAnalyzeLandmarks(activity, captured.landmarkFrames)')
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
    expect(source).not.toContain('new Worker')
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
