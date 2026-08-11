# Imported JavaScript library contract

Functions are discovered and inspected in **Librerías**. Choosing **Usar** inserts
an editable call into the page's single **JS Lab**; if the page has no lab, the
editor creates it automatically. For example, Math Tools provides the function
definition while the student's lab contains `let doubleNumberResult = doubleNumber(5);`.
Functions are intentionally absent from the general **Añadir** palette.
**Ver código** shows the immutable registered implementation; the editable JS Lab
contains the student's code that calls those functions.

JS Lab publishes all simple top-level variables declared with `let`, `const`, or
`var` together as one JSON runtime source named **Variables**. For example,
`let first = 10; const second = 20;` publishes `{ "first": 10, "second": 20 }`.
Values must be finite, JSON-compatible data; functions, circular references,
`NaN`, and `Infinity` are rejected. Execution remains explicit. Existing page
producers are available through readable aliases on the `runtimeValues` object,
such as `runtimeValues.landmarksDeReferencia`.
JS Lab code is persisted with the page and works in Test Preview and static export.
It is always visible while editing and defaults to **Visible** in Test Preview
and static export so its explicit execution buttons remain usable. **Solo editor**
hides it from the published page and therefore offers no manual execution there;
it is intended for a later visible trigger mechanism.

## Editable-code security boundary

JS Lab code is executable JavaScript, compiled locally in the page when the user
presses **Ejecutar JS Lab**. It is not sandboxed and has the JavaScript capabilities
of Preview or the exported page. The editor limits a lab to 100,000 characters,
but that size limit is not a security sandbox. Only run code you understand.

Visual Builder projects can import a local, self-contained `.js` file from the **Librerías** panel. Importing JavaScript executes code. Only import a file whose contents and source you trust.

The file must be an ES module with one default export matching the existing external-library model:

```js
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
          { name: 'right', type: 'number', defaultValue: 7 }
        ],
        output: { type: 'number' }
      },
      implementation: function multiply(left, right) {
        return left * right
      }
    }
  ]
}
```

Array parameters use the same metadata model. For example, a matrix-to-vector function may declare:

```js
{
  metadata: {
    id: 'flatten',
    name: 'Flatten',
    description: 'Joins all matrix rows.',
    inputs: [{ name: 'matrix', type: 'number[][]', defaultValue: [[1, 2], [3, 4]] }],
    output: { type: 'number[]' }
  },
  implementation: function flatten(matrix) {
    return matrix.flat()
  }
}
```

## Supported numeric value types

- `number`: one finite number.
- `number[]`: a one-dimensional array containing only finite numbers.
- `number[][]`: an array of numeric rows. Rows may have different lengths.
- `json`: JSON-compatible structured runtime data composed of finite numbers, strings, booleans, `null`, dense arrays, and plain objects.

Strings, objects, `NaN`, `Infinity`, sparse arrays, and values with the wrong nesting are rejected rather than converted. Array text entered in a JS Lab operation is parsed with `JSON.parse`; it is never evaluated as JavaScript.

The graphical JSON textarea is limited to 200,000 characters (roughly 200 KB for ordinary ASCII JSON). This is a human-input and display safeguard, not the programmatic data limit. The generic runtime accepts up to 2,000,000 numeric leaves, with at most 20,000 matrix rows and 20,000 numbers per row. Future large landmark sequences should pass directly between runtime components/functions rather than being copied through the textarea.

Structured `json` inputs may be bound to a runtime data source in the operation's Properties. Runtime values move in memory and are not copied into a textarea or HTML attribute. On each explicit function execution, the runtime clones the structured value before invoking external code. This protects producer-owned data from accidental mutation, but requires time and temporary memory proportional to the value's size.

Structured values are limited to 64 levels of nesting and 2,100,000 JSON nodes. Cycles, sparse arrays, non-finite numbers, executable values, and non-plain objects are rejected.

## Imported-library restrictions

- Library, function, and input IDs use lowercase letters, numbers, and hyphens and must start with a letter.
- Library IDs and function IDs must not conflict with anything already registered in the project.
- Inputs and outputs support `number`, `number[]`, `number[][]`, and `json` as defined above.
- The file cannot import other modules, packages, URLs, or local files.
- Implementations must be standalone named functions or arrow functions that can be serialized independently.
- An implementation may use its parameters and standard JavaScript globals such as `Math`, but it cannot depend on variables or helper functions declared elsewhere in its module.
- The local file is limited to 256 KiB.

The editor stores normalized metadata and each standalone implementation's source inside the project. Reopening or exporting the project does not require the original `.js` file.

The example at [`examples/external-libraries/simple-tools.js`](../examples/external-libraries/simple-tools.js) is intentionally outside the built-in library catalog and can be selected through **Librerías → Añadir**.

## Security boundary

Selecting a file only reads and preflights it. The editor displays a warning and requires a second confirmation before evaluating the module. Evaluation and later function execution are not sandboxed: imported code has the JavaScript capabilities of the editor, preview, or exported page where it runs. Metadata validation does not make arbitrary JavaScript safe.
