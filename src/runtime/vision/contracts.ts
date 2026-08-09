export interface VisionCategoryResult {
  index?: number
  label: string
  score: number
}

export interface VisionDetectionResult {
  boundingBox?: { height: number; originX: number; originY: number; width: number }
  categories: VisionCategoryResult[]
}

export interface VisionFrameResult {
  categories: VisionCategoryResult[]
  detections: VisionDetectionResult[]
  faceLandmarks: unknown[][]
  leftHandLandmarks: unknown[][]
  leftHandWorldLandmarks: unknown[][]
  poseLandmarks: unknown[][]
  rightHandLandmarks: unknown[][]
  rightHandWorldLandmarks: unknown[][]
  segmentationCoverage: Record<string, number>
}

export interface VisionDetectorConfig {
  delegate: 'auto' | 'gpu' | 'cpu'
  minConfidence: number
  modelUrl: string
  provider: 'mediapipe'
  task: string
}

export interface VisionDetector {
  close: () => void
  detectForVideo: (image: ImageBitmap, timestamp: number) => Promise<VisionFrameResult>
}
