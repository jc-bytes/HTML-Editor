export default {
  id: 'simple-tools',
  name: 'Simple Tools',
  description: 'Example student-imported scalar functions.',
  functions: [
    {
      metadata: {
        id: 'multiply',
        name: 'Multiply',
        description: 'Multiplies two numbers.',
        inputs: [
          { name: 'left', type: 'number', defaultValue: 6 },
          { name: 'right', type: 'number', defaultValue: 7 },
        ],
        output: { type: 'number' },
      },
      implementation: function multiply(left, right) {
        return left * right
      },
    },
    {
      metadata: {
        id: 'subtract',
        name: 'Subtract',
        description: 'Subtracts the second number from the first.',
        inputs: [
          { name: 'left', type: 'number', defaultValue: 9 },
          { name: 'right', type: 'number', defaultValue: 4 },
        ],
        output: { type: 'number' },
      },
      implementation: function subtract(left, right) {
        return left - right
      },
    },
  ],
}
