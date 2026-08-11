import type { ExternalFunctionMetadata } from '../../runtime/functions/external-function-registry'
import type { ExternalFunctionLibrary } from '../../runtime/functions/external-library-registry'
import { doubleNumber, doubleNumberMetadata } from '../../external-functions/double-number'

export const averageMetadata: ExternalFunctionMetadata = {
  id: 'average',
  name: 'Average',
  description: 'Returns the arithmetic mean of two numbers.',
  inputs: [
    { defaultValue: 4, name: 'left', type: 'number' },
    { defaultValue: 6, name: 'right', type: 'number' },
  ],
  output: { type: 'number' },
}

export function average(left: number, right: number) {
  return (left + right) / 2
}

export const maximumMetadata: ExternalFunctionMetadata = {
  id: 'maximum',
  name: 'Maximum',
  description: 'Returns the larger of two numbers.',
  inputs: [
    { defaultValue: 3, name: 'left', type: 'number' },
    { defaultValue: 7, name: 'right', type: 'number' },
  ],
  output: { type: 'number' },
}

export function maximum(left: number, right: number) {
  return Math.max(left, right)
}

export const mathToolsLibrary: ExternalFunctionLibrary = {
  id: 'math-tools',
  name: 'Math Tools',
  description: 'Trusted scalar mathematical functions.',
  functions: [
    { metadata: doubleNumberMetadata, implementation: doubleNumber },
    { metadata: averageMetadata, implementation: average },
    { metadata: maximumMetadata, implementation: maximum },
  ],
}
