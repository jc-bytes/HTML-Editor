import type { ExternalFunctionMetadata } from '../../runtime/functions/external-function-registry'
import type { ExternalFunctionLibrary } from '../../runtime/functions/external-library-registry'

export const flattenMetadata: ExternalFunctionMetadata = {
  id: 'flatten',
  name: 'Flatten',
  description: 'Combines the rows of a numeric matrix into one numeric array.',
  inputs: [{
    defaultValue: [[1, 2, 3], [4, 5, 6]],
    name: 'matrix',
    type: 'number[][]',
  }],
  output: { type: 'number[]' },
}

export function flatten(matrix: number[][]) {
  return matrix.flat()
}

export const sumMetadata: ExternalFunctionMetadata = {
  id: 'sum',
  name: 'Sum',
  description: 'Adds all numbers in a numeric array.',
  inputs: [{ defaultValue: [1, 2, 3, 4], name: 'values', type: 'number[]' }],
  output: { type: 'number' },
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

export const firstRowMetadata: ExternalFunctionMetadata = {
  id: 'first-row',
  name: 'First Row',
  description: 'Returns the first row of a numeric matrix.',
  inputs: [{
    defaultValue: [[1, 2, 3], [4, 5, 6]],
    name: 'matrix',
    type: 'number[][]',
  }],
  output: { type: 'number[]' },
}

export function firstRow(matrix: number[][]) {
  return matrix[0] ?? []
}

export const removeZeroSumRowsMetadata: ExternalFunctionMetadata = {
  id: 'remove-zero-sum-rows',
  name: 'Remove Zero-Sum Rows',
  description: 'Returns the rows whose numeric sum is not exactly zero. This makes missing-frame removal visible when reproducing the reference hand preparation.',
  inputs: [{ defaultValue: [[0, 0], [1, 2], [-1, 1]], name: 'matrix', type: 'number[][]' }],
  output: { type: 'number[][]' },
}

export function removeZeroSumRows(matrix: number[][]) {
  return matrix.filter((row) => row.reduce((total, value) => total + value, 0) !== 0)
}

export const arrayToolsLibrary: ExternalFunctionLibrary = {
  id: 'array-tools',
  name: 'Array Tools',
  description: 'Transparent operations for numeric arrays and matrices.',
  functions: [
    { metadata: flattenMetadata, implementation: flatten },
    { metadata: sumMetadata, implementation: sum },
    { metadata: firstRowMetadata, implementation: firstRow },
    { metadata: removeZeroSumRowsMetadata, implementation: removeZeroSumRows },
  ],
}
