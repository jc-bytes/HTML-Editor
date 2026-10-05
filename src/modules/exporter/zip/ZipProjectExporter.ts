import JSZip from 'jszip'
import type { ProjectBundle, ProjectPage } from '../../../core/project'
import { applyContentOverrides, createOverrideCss } from '../../design'
import {
  createNavigationConfigSource,
  createNavigationRuntimeSource,
} from '../../../runtime/navigation-runtime'
import type { ProjectExporter } from '../port'
import { relativeProjectPath } from './path-utils'
import {
  createMotionConfigSource,
  createMotionRuntimeSource,
} from '../../../runtime/motion-runtime'
import { createFunctionBlockRuntimeSource } from '../../../runtime/functions/function-block-runtime'
import { createRuntimeValueStoreSource } from '../../../runtime/values/runtime-value-store'
import {
  createPythonLabConfigSource,
  createPythonLabRuntimeSource,
  PYODIDE_ASSET_FILES,
} from '../../../runtime/python/python-lab-runtime'

const textDecoder = new TextDecoder()
const runtimePath = 'builder-runtime/navigation.js'
const overridesPath = 'builder-runtime/overrides.css'
const functionRuntimePath = 'builder-runtime/functions.js'
const valueRuntimePath = 'builder-runtime/runtime-values.js'
const motionRuntimePath = 'motion-runtime/analysis.js'
const pythonRuntimePath = 'builder-runtime/python.js'

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }

  return btoa(binary)
}

function injectNavigationRuntime(
  markup: string,
  bundle: ProjectBundle,
  page: ProjectPage,
) {
  const document = new DOMParser().parseFromString(markup, 'text/html')
  document.querySelectorAll('[data-builder-config], [data-builder-runtime], [data-builder-overrides], [data-builder-runtime-values], [data-builder-function-runtime], [data-builder-python-config], [data-builder-python-runtime], [data-motion-config], [data-motion-runtime]')
    .forEach((node) => node.remove())
  applyContentOverrides(document, bundle.manifest, page.id)

  if (createOverrideCss(bundle.manifest)) {
    const stylesheet = document.createElement('link')
    stylesheet.dataset.builderOverrides = 'true'
    stylesheet.rel = 'stylesheet'
    stylesheet.href = relativeProjectPath(page.file, overridesPath)
    document.head.append(stylesheet)
  }

  const configScript = document.createElement('script')
  configScript.dataset.builderConfig = 'true'
  configScript.textContent = createNavigationConfigSource({
    connections: bundle.manifest.connections,
    currentPage: page.id,
    pageUrls: Object.fromEntries(bundle.manifest.pages.map((target) => [
      target.id,
      relativeProjectPath(page.file, target.file),
    ])),
    transport: 'location',
    dataSources: bundle.manifest.dataSources,
    bindings: bundle.manifest.bindings,
    repeaters: bundle.manifest.repeaters,
    recordToggles: bundle.manifest.recordToggles,
    authentication: bundle.manifest.authentication,
    pageAccess: Object.fromEntries(bundle.manifest.pages.map((target) => [
      target.id,
      target.access ?? (bundle.manifest.authentication
        ? target.id === bundle.manifest.authentication.loginPage
          ? 'guestOnly'
          : 'authenticated'
        : 'public'),
    ])),
    pageRoles: Object.fromEntries(bundle.manifest.pages
      .filter((target) => target.access === 'role')
      .map((target) => [target.id, target.roles ?? []])),
  })

  const runtimeScript = document.createElement('script')
  runtimeScript.dataset.builderRuntime = 'true'
  runtimeScript.src = relativeProjectPath(page.file, runtimePath)
  document.body.append(configScript, runtimeScript)

  if (document.querySelector('[data-builder-runtime-source-id],[data-builder-function-id],[data-builder-js-lab],[data-builder-python-lab],[data-builder-variable-display]')) {
    const valueRuntime = document.createElement('script')
    valueRuntime.dataset.builderRuntimeValues = 'true'
    valueRuntime.src = relativeProjectPath(page.file, valueRuntimePath)
    document.body.append(valueRuntime)
  }

  if (document.querySelector('[data-builder-python-lab]')) {
    const config = document.createElement('script')
    config.dataset.builderPythonConfig = 'true'
    const relativeAssets = relativeProjectPath(page.file, 'pyodide/')
    config.textContent = createPythonLabConfigSource(`__RELATIVE__${relativeAssets}`)
      .replace(JSON.stringify(`__RELATIVE__${relativeAssets}`), `new URL(${JSON.stringify(relativeAssets)},document.baseURI).href`)
    const runtime = document.createElement('script')
    runtime.dataset.builderPythonRuntime = 'true'
    runtime.src = relativeProjectPath(page.file, pythonRuntimePath)
    document.body.append(config, runtime)
  }

  if (document.querySelector('[data-builder-function-id],[data-builder-js-lab]')) {
    const functionRuntime = document.createElement('script')
    functionRuntime.dataset.builderFunctionRuntime = 'true'
    functionRuntime.src = relativeProjectPath(page.file, functionRuntimePath)
    document.body.append(functionRuntime)
  }

  if (bundle.manifest.motionActivities?.some((activity) => activity.pageId === page.id)) {
    const motionConfig = document.createElement('script')
    motionConfig.dataset.motionConfig = 'true'
    motionConfig.textContent = createMotionConfigSource({
      activities: bundle.manifest.motionActivities,
      authentication: bundle.manifest.authentication,
      currentPage: page.id,
      dataSources: bundle.manifest.dataSources,
    })
    const motionRuntime = document.createElement('script')
    motionRuntime.dataset.motionRuntime = 'true'
    motionRuntime.src = relativeProjectPath(page.file, motionRuntimePath)
    document.body.append(motionConfig, motionRuntime)
  }

  return `<!doctype html>\n${document.documentElement.outerHTML}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function startPageDocument(bundle: ProjectBundle) {
  const startPage = bundle.manifest.pages.find((page) => page.id === bundle.manifest.startPage)!
  const href = escapeHtml(startPage.file)
  const serializedHref = JSON.stringify(startPage.file).replaceAll('<', '\\u003c')

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="0;url=${href}">
    <title>${escapeHtml(bundle.manifest.name)}</title>
  </head>
  <body>
    <p>Abriendo <a href="${href}">${escapeHtml(startPage.name)}</a>…</p>
    <script>window.location.replace(${serializedHref});</script>
  </body>
</html>`
}

export class ZipProjectExporter implements ProjectExporter {
  async export(bundle: ProjectBundle) {
    const archive = new JSZip()
    const pagesByFile = new Map(bundle.manifest.pages.map((page) => [page.file, page]))

    for (const file of bundle.files) {
      if (file.path === 'project.json' || file.path === runtimePath || file.path === overridesPath
        || file.path === functionRuntimePath
        || file.path === valueRuntimePath
        || file.path === motionRuntimePath || file.path === pythonRuntimePath) {
        continue
      }

      const page = pagesByFile.get(file.path)
      if (page) {
        archive.file(file.path, injectNavigationRuntime(textDecoder.decode(file.bytes), bundle, page))
      } else if (file.path === 'index.html') {
        continue
      } else {
        archive.file(file.path, bytesToBase64(file.bytes), { base64: true })
      }
    }

    archive.file('project.json', JSON.stringify(bundle.manifest, null, 2))
    archive.file(runtimePath, createNavigationRuntimeSource())
    const usesValueRuntime = bundle.manifest.pages.some((page) => {
      const file = bundle.files.find((candidate) => candidate.path === page.file)
      if (!file) return false
      const markup = textDecoder.decode(file.bytes)
      return markup.includes('data-builder-runtime-source-id')
        || markup.includes('data-builder-function-id')
        || markup.includes('data-builder-variable-display')
    })
    if (usesValueRuntime) archive.file(valueRuntimePath, createRuntimeValueStoreSource())
    const usesFunctionRuntime = bundle.manifest.pages.some((page) => {
      const file = bundle.files.find((candidate) => candidate.path === page.file)
      return file ? textDecoder.decode(file.bytes).includes('data-builder-function-id') : false
    })
    if (usesFunctionRuntime) {
      const bundledFunctionRuntime = bundle.files.find((file) => file.path === functionRuntimePath)
      archive.file(
        functionRuntimePath,
        bundledFunctionRuntime
          ? textDecoder.decode(bundledFunctionRuntime.bytes)
          : createFunctionBlockRuntimeSource(),
      )
    }
    const usesPythonLab = bundle.manifest.pages.some((page) => {
      const file = bundle.files.find((candidate) => candidate.path === page.file)
      return file ? textDecoder.decode(file.bytes).includes('data-builder-python-lab') : false
    })
    if (usesPythonLab) {
      const bundledPythonRuntime = bundle.files.find((file) => file.path === pythonRuntimePath)
      archive.file(pythonRuntimePath, bundledPythonRuntime
        ? textDecoder.decode(bundledPythonRuntime.bytes)
        : createPythonLabRuntimeSource())
      for (const asset of PYODIDE_ASSET_FILES) {
        const assetUrl = new URL(`${import.meta.env.BASE_URL}pyodide/${asset}`, window.location.origin)
        const response = await fetch(assetUrl)
        if (!response.ok) throw new Error(`No se pudo incluir Pyodide: ${asset}.`)
        archive.file(`pyodide/${asset}`, await response.arrayBuffer())
      }
    }
    if (bundle.manifest.motionActivities?.length) {
      archive.file(motionRuntimePath, createMotionRuntimeSource())
    }
    const overrideCss = createOverrideCss(bundle.manifest)
    if (overrideCss) archive.file(overridesPath, overrideCss)
    if (!pagesByFile.has('index.html')) {
      archive.file('index.html', startPageDocument(bundle))
    }

    const bytes = await archive.generateAsync({ type: 'uint8array' })
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' })
  }
}

export const zipProjectExporter = new ZipProjectExporter()
