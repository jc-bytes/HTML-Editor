import type { ExternalFunctionValueType } from '../functions/external-function-registry'

export const RUNTIME_VALUE_EVENT = 'builder:runtime-value'
export const RUNTIME_VALUE_STORE_PROPERTY = '__BUILDER_RUNTIME_VALUE_STORE__'
export const RUNTIME_SOURCE_ID_ATTRIBUTE = 'data-builder-runtime-source-id'
export const RUNTIME_SOURCE_NAME_ATTRIBUTE = 'data-builder-runtime-source-name'
export const RUNTIME_OUTPUT_ID_ATTRIBUTE = 'data-builder-runtime-output-id'
export const RUNTIME_OUTPUT_NAME_ATTRIBUTE = 'data-builder-runtime-output-name'
export const RUNTIME_OUTPUT_TYPE_ATTRIBUTE = 'data-builder-runtime-output-type'
export const FUNCTION_INPUT_SOURCE_ATTRIBUTE_PREFIX = 'data-builder-function-source-'
export const LANDMARK_FRAMES_OUTPUT_ID = 'landmark-frames'
export const FUNCTION_RESULT_OUTPUT_ID = 'result'

export interface RuntimeValueEventDetail {
  outputId: string
  sourceId: string
  type: ExternalFunctionValueType
  value: unknown
}

export interface StoredRuntimeValue {
  outputId: string
  sourceId: string
  type: ExternalFunctionValueType
  value: unknown
}

export interface RuntimeValueStore {
  has(key: string): boolean
  list(): Array<Omit<StoredRuntimeValue, 'value'>>
  publish(detail: RuntimeValueEventDetail): boolean
  read(key: string): StoredRuntimeValue | undefined
}

export function runtimeValueKey(sourceId: string, outputId: string) {
  return `${sourceId}::${outputId}`
}
