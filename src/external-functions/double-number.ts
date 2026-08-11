import type { ExternalFunctionMetadata } from '../runtime/functions/external-function-registry'

export const doubleNumberMetadata: ExternalFunctionMetadata = {
  id: 'double-number',
  name: 'Double Number',
  description: 'Returns a number multiplied by two.',
  inputs: [{ defaultValue: 5, name: 'value', type: 'number' }],
  output: { type: 'number' },
}

export function doubleNumber(value: number) {
  return value * 2
}
