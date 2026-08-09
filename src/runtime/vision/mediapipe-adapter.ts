import type {
  VisionCategoryResult,
  VisionDetectionResult,
  VisionDetector,
  VisionDetectorConfig,
  VisionFrameResult,
} from './contracts'

/** Self-contained so the exported browser runtime can serialize this adapter. */
export async function createMediaPipeVisionDetector(
  runtimeWindow: Window,
  config: VisionDetectorConfig,
): Promise<VisionDetector> {
  const moduleUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm'
  const wasmRoot = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
  const dynamicImport = Function('url', 'return import(url)') as (url: string) => Promise<Record<string, unknown>>
  const visionModule = await dynamicImport(moduleUrl)
  const resolver = visionModule.FilesetResolver as { forVisionTasks: (root: string) => Promise<unknown> }
  const vision = await resolver.forVisionTasks(wasmRoot)
  const classNames: Record<string, string> = {
    'holistic-landmarker': 'HolisticLandmarker',
    'pose-landmarker': 'PoseLandmarker',
    'hand-landmarker': 'HandLandmarker',
    'face-landmarker': 'FaceLandmarker',
    'gesture-recognizer': 'GestureRecognizer',
    'object-detector': 'ObjectDetector',
    'image-classifier': 'ImageClassifier',
    'image-segmenter': 'ImageSegmenter',
  }
  const methodNames: Record<string, string> = {
    'gesture-recognizer': 'recognizeForVideo',
    'image-classifier': 'classifyForVideo',
    'image-segmenter': 'segmentForVideo',
  }
  const taskClass = visionModule[classNames[config.task]] as {
    createFromOptions: (files: unknown, options: Record<string, unknown>) => Promise<Record<string, unknown>>
  } | undefined
  if (!taskClass) throw new Error(`El modelo de visión ${config.task} no está disponible.`)

  const confidenceOptions: Record<string, unknown> = config.task === 'holistic-landmarker'
    ? {
        minFaceDetectionConfidence: config.minConfidence,
        minFacePresenceConfidence: config.minConfidence,
        minHandLandmarksConfidence: config.minConfidence,
        minPoseDetectionConfidence: config.minConfidence,
        minPosePresenceConfidence: config.minConfidence,
        outputFaceBlendshapes: false,
      }
    : config.task === 'pose-landmarker'
      ? { minPoseDetectionConfidence: config.minConfidence, minPosePresenceConfidence: config.minConfidence, minTrackingConfidence: config.minConfidence }
      : config.task === 'hand-landmarker' || config.task === 'gesture-recognizer'
        ? { minHandDetectionConfidence: config.minConfidence, minHandPresenceConfidence: config.minConfidence, minTrackingConfidence: config.minConfidence, numHands: 2 }
        : config.task === 'face-landmarker'
          ? { minFaceDetectionConfidence: config.minConfidence, minFacePresenceConfidence: config.minConfidence, minTrackingConfidence: config.minConfidence, outputFaceBlendshapes: true }
          : config.task === 'object-detector'
            ? { scoreThreshold: config.minConfidence }
            : config.task === 'image-classifier'
              ? { scoreThreshold: config.minConfidence }
              : config.task === 'image-segmenter'
                ? { outputCategoryMask: true, outputConfidenceMasks: false }
                : {}
  const create = (delegate: 'GPU' | 'CPU') => taskClass.createFromOptions(vision, {
    baseOptions: { modelAssetPath: config.modelUrl, delegate },
    runningMode: 'VIDEO',
    ...confidenceOptions,
  })
  let task: Record<string, unknown>
  let delegate: 'GPU' | 'CPU'
  if (config.delegate === 'cpu') {
    delegate = 'CPU'
    task = await create(delegate)
  } else if (config.delegate === 'gpu') {
    delegate = 'GPU'
    task = await create(delegate)
  } else {
    try {
      delegate = 'GPU'
      task = await create(delegate)
    } catch {
      delegate = 'CPU'
      task = await create(delegate)
    }
  }

  const array = (value: unknown) => Array.isArray(value) ? value : []
  const categories = (value: unknown): VisionCategoryResult[] => array(value).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const item = entry as Record<string, unknown>
    const label = String(item.categoryName ?? item.displayName ?? '')
    const score = Number(item.score ?? 0)
    return label ? [{ label, score, ...(Number.isFinite(Number(item.index)) ? { index: Number(item.index) } : {}) }] : []
  })
  const handedness = (raw: Record<string, unknown>, index: number) => {
    const groups = array(raw.handednesses ?? raw.handedness)
    const group = array(groups[index])
    const first = group[0] as Record<string, unknown> | undefined
    return String(first?.categoryName ?? first?.displayName ?? '').toLowerCase()
  }
  const normalize = async (rawValue: unknown): Promise<VisionFrameResult> => {
    const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as Record<string, unknown>
    const result: VisionFrameResult = {
      categories: [], detections: [], faceLandmarks: [], leftHandLandmarks: [],
      leftHandWorldLandmarks: [], poseLandmarks: [], rightHandLandmarks: [],
      rightHandWorldLandmarks: [], segmentationCoverage: {},
    }
    if (config.task === 'holistic-landmarker') {
      result.faceLandmarks = array(raw.faceLandmarks) as unknown[][]
      result.poseLandmarks = array(raw.poseLandmarks) as unknown[][]
      result.leftHandLandmarks = array(raw.leftHandLandmarks) as unknown[][]
      result.rightHandLandmarks = array(raw.rightHandLandmarks) as unknown[][]
      result.leftHandWorldLandmarks = array(raw.leftHandWorldLandmarks) as unknown[][]
      result.rightHandWorldLandmarks = array(raw.rightHandWorldLandmarks) as unknown[][]
    } else if (config.task === 'pose-landmarker') {
      result.poseLandmarks = array(raw.landmarks) as unknown[][]
    } else if (config.task === 'face-landmarker') {
      result.faceLandmarks = array(raw.faceLandmarks) as unknown[][]
      result.categories = array(raw.faceBlendshapes).flatMap((group) => categories(group))
    } else if (config.task === 'hand-landmarker' || config.task === 'gesture-recognizer') {
      const hands = array(raw.landmarks) as unknown[][]
      const world = array(raw.worldLandmarks) as unknown[][]
      hands.forEach((hand, index) => {
        const side = handedness(raw, index)
        if (side === 'left') {
          result.leftHandLandmarks.push(hand)
          if (world[index]) result.leftHandWorldLandmarks.push(world[index])
        } else {
          result.rightHandLandmarks.push(hand)
          if (world[index]) result.rightHandWorldLandmarks.push(world[index])
        }
      })
      result.categories = array(raw.gestures).flatMap((group) => categories(group))
    } else if (config.task === 'object-detector') {
      result.detections = array(raw.detections).flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []
        const item = entry as Record<string, unknown>
        return [{ categories: categories(item.categories), ...(item.boundingBox ? { boundingBox: item.boundingBox as VisionDetectionResult['boundingBox'] } : {}) }]
      })
    } else if (config.task === 'image-classifier') {
      result.categories = array(raw.classifications).flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []
        return categories((entry as Record<string, unknown>).categories)
      })
    } else if (config.task === 'image-segmenter') {
      const mask = raw.categoryMask as { getAsUint8Array?: () => Uint8Array; close?: () => void } | undefined
      const pixels = mask?.getAsUint8Array?.()
      if (pixels?.length) {
        const counts: Record<string, number> = {}
        pixels.forEach((category) => { counts[String(category)] = (counts[String(category)] ?? 0) + 1 })
        Object.entries(counts).forEach(([category, count]) => { result.segmentationCoverage[category] = count / pixels.length })
      }
      mask?.close?.()
    }
    return result
  }
  const methodName = methodNames[config.task] ?? 'detectForVideo'
  const invoke = async (activeTask: Record<string, unknown>, image: ImageBitmap, timestamp: number) => {
    const method = activeTask[methodName] as ((...args: unknown[]) => unknown) | undefined
    if (!method) throw new Error(`El modelo no admite ${methodName}.`)
    if (config.task !== 'image-segmenter') return normalize(await method.call(activeTask, image, timestamp))
    return new Promise<VisionFrameResult>((resolve, reject) => {
      try {
        const returned = method.call(activeTask, image, timestamp, (value: unknown) => {
          void normalize(value).then(resolve, reject)
        })
        if (returned && typeof returned === 'object') void normalize(returned).then(resolve, reject)
      } catch (error) { reject(error) }
    })
  }
  const detector = {
    close: () => { (task.close as (() => void) | undefined)?.call(task) },
    detectForVideo: async (image: ImageBitmap, timestamp: number) => {
      try {
        return await invoke(task, image, timestamp)
      } catch (error) {
        if (delegate !== 'GPU' || config.delegate === 'gpu') throw error
        ;(task.close as (() => void) | undefined)?.call(task)
        delegate = 'CPU'
        task = await create(delegate)
        return invoke(task, image, timestamp)
      }
    },
  }
  void runtimeWindow
  return detector
}
