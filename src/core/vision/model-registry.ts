export const visionTaskIds = [
  'holistic-landmarker',
  'pose-landmarker',
  'hand-landmarker',
  'face-landmarker',
  'gesture-recognizer',
  'object-detector',
  'image-classifier',
  'image-segmenter',
] as const

export type VisionTaskId = typeof visionTaskIds[number]

export const visionEvaluatorIds = [
  'quality',
  'sequence',
  'gesture',
  'detection',
  'classification',
  'segmentation',
] as const

export type VisionEvaluatorId = typeof visionEvaluatorIds[number]
export type VisionOutputKind = 'landmarks' | 'gestures' | 'detections' | 'classification' | 'segmentation'
export type VisionLandmarkGroup = 'hands' | 'pose' | 'face'

export interface VisionModelDefinition {
  defaultEvaluator: VisionEvaluatorId
  defaultModelUrl: string
  description: string
  evaluators: VisionEvaluatorId[]
  id: VisionTaskId
  label: string
  landmarkGroups: VisionLandmarkGroup[]
  output: VisionOutputKind
}

export const visionModelRegistry: readonly VisionModelDefinition[] = [
  {
    id: 'holistic-landmarker',
    label: 'Cuerpo completo',
    description: 'Combina postura, manos y rostro en una sola secuencia.',
    output: 'landmarks',
    landmarkGroups: ['hands', 'pose', 'face'],
    evaluators: ['quality', 'sequence'],
    defaultEvaluator: 'sequence',
    defaultModelUrl: 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task',
  },
  {
    id: 'pose-landmarker',
    label: 'Postura corporal',
    description: 'Sigue articulaciones y postura sin procesar manos o rostro.',
    output: 'landmarks',
    landmarkGroups: ['pose'],
    evaluators: ['quality', 'sequence'],
    defaultEvaluator: 'sequence',
    defaultModelUrl: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  },
  {
    id: 'hand-landmarker',
    label: 'Movimiento de manos',
    description: 'Sigue puntos y orientación de una o dos manos.',
    output: 'landmarks',
    landmarkGroups: ['hands'],
    evaluators: ['quality', 'sequence'],
    defaultEvaluator: 'sequence',
    defaultModelUrl: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  },
  {
    id: 'face-landmarker',
    label: 'Rostro y expresiones',
    description: 'Sigue puntos faciales y expresiones en el tiempo.',
    output: 'landmarks',
    landmarkGroups: ['face'],
    evaluators: ['quality', 'sequence'],
    defaultEvaluator: 'sequence',
    defaultModelUrl: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  },
  {
    id: 'gesture-recognizer',
    label: 'Gestos de mano',
    description: 'Reconoce gestos conocidos y gestos personalizados compatibles.',
    output: 'gestures',
    landmarkGroups: ['hands'],
    evaluators: ['quality', 'gesture'],
    defaultEvaluator: 'gesture',
    defaultModelUrl: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
  },
  {
    id: 'object-detector',
    label: 'Detección de objetos',
    description: 'Detecta objetos, categorías y posiciones dentro del encuadre.',
    output: 'detections',
    landmarkGroups: [],
    evaluators: ['quality', 'detection'],
    defaultEvaluator: 'detection',
    defaultModelUrl: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite',
  },
  {
    id: 'image-classifier',
    label: 'Clasificación de imagen',
    description: 'Clasifica el encuadre completo usando categorías del modelo.',
    output: 'classification',
    landmarkGroups: [],
    evaluators: ['quality', 'classification'],
    defaultEvaluator: 'classification',
    defaultModelUrl: 'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite',
  },
  {
    id: 'image-segmenter',
    label: 'Segmentación de imagen',
    description: 'Mide la cobertura de una categoría o región segmentada.',
    output: 'segmentation',
    landmarkGroups: [],
    evaluators: ['quality', 'segmentation'],
    defaultEvaluator: 'segmentation',
    defaultModelUrl: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite',
  },
] as const

export function visionModelDefinition(task: string) {
  return visionModelRegistry.find((model) => model.id === task) ?? visionModelRegistry[0]
}

export function supportsVisionEvaluator(task: string, evaluator: string) {
  return visionModelDefinition(task).evaluators.includes(evaluator as VisionEvaluatorId)
}
