import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = join(root, 'node_modules', 'pyodide')
const outputRoot = join(root, 'public', 'pyodide')
const version = '314.0.3'
const numpyWheel = 'numpy-2.4.3-cp314-cp314-pyemscripten_2026_0_wasm32.whl'
const numpySha256 = '0cad9c1b91f0082e4f959bc0e0bf5835a2efbba6ab3b1e9d1fe6e7e564cca98e'
const coreFiles = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
]

await mkdir(outputRoot, { recursive: true })
for (const file of coreFiles) await copyFile(join(packageRoot, file), join(outputRoot, file))

const wheelPath = join(outputRoot, numpyWheel)
let wheel
try {
  wheel = await readFile(wheelPath)
} catch {
  const response = await fetch(`https://cdn.jsdelivr.net/pyodide/v${version}/full/${numpyWheel}`)
  if (!response.ok) throw new Error(`Unable to download the pinned NumPy wheel (${response.status}).`)
  wheel = Buffer.from(await response.arrayBuffer())
  await writeFile(wheelPath, wheel)
}
const digest = createHash('sha256').update(wheel).digest('hex')
if (digest !== numpySha256) {
  throw new Error(`Unexpected NumPy wheel checksum: ${digest}`)
}

console.log(`Prepared Pyodide ${version} with pinned NumPy in public/pyodide.`)
