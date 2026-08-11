import { useEffect, useRef, useState } from 'react'
import grapesjs from 'grapesjs'
import type {
  Block,
  Button,
  Component,
  Device,
  Editor,
  ProjectData,
  RichTextEditorAction,
  ToolbarButtonProps,
} from 'grapesjs'
import blocksBasic from 'grapesjs-blocks-basic'
import pluginForms from 'grapesjs-plugin-forms'
import presetWebpage from 'grapesjs-preset-webpage'
import tabs from 'grapesjs-tabs'
import touch from 'grapesjs-touch'
import imageEditor from 'grapesjs-tui-image-editor'
import 'grapesjs/dist/css/grapes.min.css'
import { loadEditorProjectData, saveEditorProjectData } from '../editor-platform'
import type { EditorProjectData } from '../editor-platform'
import {
  AUTH_ACTION_ATTRIBUTE,
  AUTH_DESTINATION_ATTRIBUTE,
  AUTH_METADATA_CONTROL_ATTRIBUTE,
  AUTH_METADATA_DEFINITION_ATTRIBUTE,
  AUTH_METADATA_DIRECTION_ATTRIBUTE,
  AUTH_METADATA_FIELD_ATTRIBUTE,
  AUTH_METADATA_ATTRIBUTE,
  AUTH_METADATA_OPTIONS_ATTRIBUTE,
  AUTH_METADATA_TABLE_ATTRIBUTE,
  readAuthMetadataFields,
  readAuthComponentSettings,
} from '../core/auth-components'
import type {
  AuthComponentSettings,
  AuthLogoutPresentation,
  AuthMetadataField,
} from '../core/auth-components'
import {
  FLOW_ACTION_ATTRIBUTE,
  FLOW_ACTIVE_LABEL_ATTRIBUTE,
  FLOW_CONTEXT_ATTRIBUTE,
  FLOW_CONFIRM_MESSAGE_ATTRIBUTE,
  FLOW_DATA_SOURCE_ATTRIBUTE,
  FLOW_FIELD_MAP_ATTRIBUTE,
  FLOW_FIXED_FIELD_ATTRIBUTE,
  FLOW_FIXED_VALUE_ATTRIBUTE,
  FLOW_RECORD_MODE_ATTRIBUTE,
  FLOW_VALUE_AMOUNT_ATTRIBUTE,
  FLOW_VALUE_INPUT_ATTRIBUTE,
  FLOW_VALUE_SOURCE_ATTRIBUTE,
  FLOW_INACTIVE_LABEL_ATTRIBUTE,
  FLOW_OWNER_FIELD_ATTRIBUTE,
  FLOW_RECORD_FIELD_ATTRIBUTE,
  FLOW_TARGET_ATTRIBUTE,
  FLOW_SUCCESS_MESSAGE_ATTRIBUTE,
  INTERACTION_ANIMATION_ATTRIBUTE,
  type InteractionAnimation,
  type DataActionConnection,
  type DataActionKind,
  type DataActionRecordMode,
  type DataActionValueSource,
  type RecordToggleConnection,
  type ScreenFlowConnection,
  dataActionAttributes,
  readDataActionConnection,
  readInteractionAnimation,
  readRecordToggleConnection,
  readScreenFlowConnection,
  recordToggleAttributes,
  screenFlowAttributes,
} from './flow-connections'
import { DynamicFieldActionDialog, type DynamicFieldActionDraft } from './DynamicFieldActionDialog'
import { createPreviewController } from './preview-controller'
import { editorProjectBundle, exportEditorProject } from './export-project'
import { EditorRuntimePreview } from './EditorRuntimePreview'
import type { EditorPreviewViewport } from './EditorRuntimePreview'
import {
  applyEditorPreviewAction,
  createEditorPreviewSession,
} from './editor-preview-session'
import type { EditorPreviewSession } from './editor-preview-session'
import type { MotionReferenceRuntimeMessage } from '../runtime/motion-runtime'
import {
  DATA_BIND_FIELD_ATTRIBUTE,
  DATA_BIND_TARGET_ATTRIBUTE,
  DATA_SOURCE_ATTRIBUTE,
  DATA_REPEATER_ATTRIBUTE,
  DATA_SCOPE_ATTRIBUTE,
  builtInFields,
  collectionDisplayName,
  normalizedSupabaseConfig,
  relationDisplayField,
  storeSupabaseConfig,
  supabaseDataSourceId,
  uploadAccept,
} from './supabase-data'
import type { SupabaseEditorConfig } from './supabase-data'
import { SupabaseDataPanel } from './SupabaseDataPanel'
import type { DataComponentEditRequest } from './SupabaseDataPanel'
import {
  createDataComponentMarkup,
  DATA_COMPONENT_ATTRIBUTE,
  DATA_DESIGN_PLACEHOLDER_ATTRIBUTE,
  DATA_DESIGN_PREVIEW_COUNT_ATTRIBUTE,
  DATA_PAGE_SIZE_ATTRIBUTE,
  DATA_PAGINATION_ATTRIBUTE,
  dataComponentStyles,
  findDataComponentRoot,
  readDataComponentSettings,
} from './data-component-templates'
import type {
  DataComponentMapping,
  DataComponentOptions,
  DataComponentTemplateId,
} from './data-component-templates'
import { PageImportDialog } from './PageImportDialog'
import { PageRenameDialog } from './PageRenameDialog'
import { prepareImportedPage } from './page-import'
import type { ImportedPageDraft } from './page-import'
import { TemplateGalleryDialog } from './TemplateGalleryDialog'
import { pageTemplateById } from './page-templates'
import {
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
  clampCanvasZoom,
  stepCanvasZoom,
} from './canvas-viewport'
import type { CanvasZoomMode } from './canvas-viewport'
import { attachCanvasGestures } from './canvas-gestures'
import {
  createMotionAnalysisPlugin,
  findMotionActivityComponent,
  MOTION_ANALYSIS_BLOCK_ID,
  MOTION_VIEW_REFERENCE_BLOCK_ID,
} from './motion-analysis'
import { MotionPanel, MotionSettingsDialog } from './MotionPanel'
import {
  createExternalFunctionBlocksPlugin,
  DEFAULT_JS_LAB_CODE,
  ensureJsLab,
  externalFunctionCallStatement,
  findJsLab,
  jsLabRuntimeSourceOptions,
  readJsLabSettings,
  updateJsLabScript,
  JS_LAB_CODE_EDITOR_ATTRIBUTE,
  JS_LAB_BLOCK_ID,
} from './external-function-blocks'
import { ExternalLibrariesPanel } from './ExternalLibrariesPanel'
import {
  loadPreparedImportedLibrary,
  type PreparedImportedLibraryFile,
} from '../external-libraries/imported-library'
import {
  createProjectExternalLibraries,
  type ProjectExternalLibraries,
} from './project-external-libraries'
import { AuthSettingsDialog } from './AuthSettingsDialog'
import {
  applyNavbarLogoutPresentation,
  configureStarterBlocks,
  normalizeStarterNavbars,
  starterNavbarLogoutButton,
  starterNavbarPlugin,
  updateStarterNavbarLink,
} from './starter-blocks'
import {
  NavbarLinkSettingsDialog,
  type NavbarLinkSettings,
} from './NavbarLinkSettingsDialog'
import { GridLayoutPanel } from './GridLayoutPanel'
import {
  appendGridItem,
  createGridLayoutPlugin,
  DEFAULT_SITE_MARGIN,
  ensurePageGrid,
  ensureGridSlots,
  gridItemFor,
  GRID_LAYOUT_STYLES,
  installGridEditorStyles,
  isLayoutRow,
  isPageGrid,
  placeComponentInGrid,
  readSiteMargin,
  updateSiteMargin,
} from './grid-layout'
import {
  createSectionLayoutPlugin,
  isSectionGrid,
  SECTION_LAYOUT_OPEN_EVENT,
  SECTION_LAYOUT_STYLES,
  sectionGridFor,
} from './section-layout'

function normalizedGrapesProjectData(value: Record<string, unknown>): ProjectData {
  return {
    ...value,
    assets: Array.isArray(value.assets) ? value.assets : [],
    dataSources: Array.isArray(value.dataSources) ? value.dataSources : [],
    pages: Array.isArray(value.pages) ? value.pages : [],
    styles: Array.isArray(value.styles) ? value.styles : [],
    symbols: Array.isArray(value.symbols) ? value.symbols : [],
  }
}

function escapeAuthMarkup(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export const AUTH_CHOICE_CARD_CSS = `
.builder-auth-choice-card { transition: border-color .16s ease, background .16s ease, box-shadow .16s ease; }
.builder-auth-choice-card:hover { border-color: #8bb8b3 !important; background: #f7fbfa !important; }
.builder-auth-choice-card:has(input:checked) { border-color: #16847d !important; background: #edf9f7 !important; box-shadow: 0 0 0 1px rgba(22,132,125,.08); }
.builder-auth-choice-card input { accent-color: #16847d; }
.builder-auth-choice-copy strong { color: #294253; font-size: 16px; line-height: 1.25; }
.builder-auth-choice-copy small { color: #667987; font-size: 13px; font-weight: 500; line-height: 1.35; }
`

export function authMetadataFieldMarkup(field: AuthMetadataField) {
  const placeholder = field.placeholder?.trim() || field.label
  const control = field.control ?? 'text'
  const options = field.options ?? []
  const direction = field.direction ?? 'horizontal'
  const required = field.required ? ' required' : ''
  const definitionAttributes = `${AUTH_METADATA_DEFINITION_ATTRIBUTE}="${escapeAuthMarkup(field.key)}" data-builder-auth-metadata-label="${escapeAuthMarkup(field.label)}" ${AUTH_METADATA_CONTROL_ATTRIBUTE}="${control}" ${AUTH_METADATA_OPTIONS_ATTRIBUTE}="${escapeAuthMarkup(JSON.stringify(options))}"${control === 'radio' ? ` ${AUTH_METADATA_DIRECTION_ATTRIBUTE}="${direction}"` : ''}${field.destinationTableId ? ` ${AUTH_METADATA_TABLE_ATTRIBUTE}="${escapeAuthMarkup(field.destinationTableId)}"` : ''}${field.destinationField ? ` ${AUTH_METADATA_FIELD_ATTRIBUTE}="${escapeAuthMarkup(field.destinationField)}"` : ''}`
  if (control === 'textarea') return `<label class="builder-auth-field" ${definitionAttributes}><span>${escapeAuthMarkup(field.label)}</span><textarea ${AUTH_METADATA_ATTRIBUTE} name="${escapeAuthMarkup(field.key)}" autocomplete="off" placeholder="${escapeAuthMarkup(placeholder)}"${required}></textarea></label>`
  if (control === 'select') return `<label class="builder-auth-field" ${definitionAttributes}><span>${escapeAuthMarkup(field.label)}</span><select ${AUTH_METADATA_ATTRIBUTE} name="${escapeAuthMarkup(field.key)}"${required}><option value="">Selecciona una opción</option>${options.map((option) => `<option value="${escapeAuthMarkup(option.value)}">${escapeAuthMarkup(option.label)}</option>`).join('')}</select></label>`
  if (control === 'radio') return `<fieldset class="builder-auth-field builder-auth-options" style="margin:0;padding:0;border:0" ${definitionAttributes}><legend style="margin:0 0 10px;padding:0;font-weight:700">${escapeAuthMarkup(field.label)}</legend><div class="builder-auth-choice-grid" style="display:grid;grid-template-columns:${direction === 'horizontal' ? 'repeat(auto-fit,minmax(180px,1fr))' : '1fr'};gap:10px">${options.map((option, index) => `<label class="builder-auth-choice builder-auth-choice-card" style="display:flex;align-items:flex-start;gap:12px;min-height:74px;padding:14px 16px;cursor:pointer;background:#fff;border:1px solid #d5dfdd;border-radius:12px"><input style="flex:0 0 auto;width:20px!important;height:20px!important;min-height:20px!important;margin:2px 0 0;padding:0" ${AUTH_METADATA_ATTRIBUTE} name="${escapeAuthMarkup(field.key)}" type="radio" value="${escapeAuthMarkup(option.value)}"${required && index === 0 ? ' required' : ''}><span class="builder-auth-choice-copy" style="display:grid;gap:3px"><strong>${escapeAuthMarkup(option.label)}</strong>${option.description?.trim() ? `<small>${escapeAuthMarkup(option.description.trim())}</small>` : ''}</span></label>`).join('')}</div></fieldset>`
  if (control === 'checkbox') return `<label class="builder-auth-field builder-auth-checkbox" style="display:flex;align-items:center;gap:10px;min-height:36px;cursor:pointer" ${definitionAttributes}><input style="flex:0 0 auto;width:18px!important;height:18px!important;min-height:18px!important;margin:0;padding:0" ${AUTH_METADATA_ATTRIBUTE} name="${escapeAuthMarkup(field.key)}" type="checkbox" value="true"${required}><span>${escapeAuthMarkup(field.label)}</span></label>`
  return `<label class="builder-auth-field" ${definitionAttributes}><span>${escapeAuthMarkup(field.label)}</span><input ${AUTH_METADATA_ATTRIBUTE} name="${escapeAuthMarkup(field.key)}" type="text" autocomplete="off" placeholder="${escapeAuthMarkup(placeholder)}"${required}></label>`
}

type ElementSummary = {
  bindingField?: string
  bindingTarget?: string
  bindingScope?: 'context' | 'first'
  dataSourceTableId?: string
  inheritedRepeaterTableId?: string
  interactionAnimation: InteractionAnimation
  isRepeater: boolean
  label: string
  screenFlow?: ScreenFlowConnection
  tag: string
  targetPageId?: string
  recordToggle?: RecordToggleConnection
  dataAction?: DataActionConnection
  repeaterTableId?: string
}

type CanvasViewState = {
  coords: { x: number; y: number }
  mode: CanvasZoomMode
  zoom: number
}

type EditorPageAccess = 'public' | 'authenticated' | 'guestOnly' | 'role'

type EditorPageSummary = {
  access: EditorPageAccess
  id: string
  isHome: boolean
  name: string
  roles: string[]
}

const PAGE_ACCESS_LABELS: Record<EditorPageAccess, string> = {
  public: 'Pública',
  authenticated: 'Privada',
  guestOnly: 'Solo visitantes',
  role: 'Por rol',
}

function pageRoute(pageId: string) {
  const route = pageId
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `/${route || 'pagina'}`
}

function editorPageSummaries(editor: Editor): EditorPageSummary[] {
  const allPages = editor.Pages.getAll()
  const homePageId = allPages.find((page) => page.get('isStartPage') === true)?.getId()
    ?? allPages[0]?.getId()
  const authPageId = allPages.find((page) => editor.getHtml({
    component: page.getMainComponent(),
  }).includes('data-builder-auth-action="login"'))?.getId()

  return allPages.map((page) => {
    const storedAccess = page.get('access')
    const access: EditorPageAccess = page.getId() === authPageId
      ? 'guestOnly'
      : storedAccess === 'public' || storedAccess === 'authenticated' || storedAccess === 'role'
        ? storedAccess
        : authPageId ? 'authenticated' : 'public'
    const storedRoles = page.get('roles')
    return {
      access,
      id: page.getId(),
      isHome: page.getId() === homePageId,
      name: page.getName() || 'Sin título',
      roles: Array.isArray(storedRoles)
        ? storedRoles.filter((role): role is string => typeof role === 'string')
        : [],
    }
  })
}

function ensureEditorStartPage(editor: Editor) {
  const allPages = editor.Pages.getAll()
  const current = allPages.find((page) => page.get('isStartPage') === true) ?? allPages[0]
  allPages.forEach((page) => page.set('isStartPage', page === current))
  return current?.getId()
}

export function reorderedPageIndex(
  sourceIndex: number,
  targetIndex: number,
  position: 'before' | 'after',
) {
  let destination = targetIndex + (position === 'after' ? 1 : 0)
  if (sourceIndex < destination) destination -= 1
  return Math.max(0, destination)
}

const DATA_COMPONENT_BLOCK_ID = 'builder-data-component'
const GUEST_PROJECT_STORAGE_KEY = 'builder-editor-guest-project-v1'
const BLANK_PAGE = { id: 'page-1', name: 'Página 1', component: '' } as const
const EMPTY_SUPABASE_CONFIG: SupabaseEditorConfig = {
  projectUrl: '',
  publishableKey: '',
  tables: [],
}
const SUPABASE_BLOCK_ICONS = {
  login: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="19" cy="15" r="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M7 39c1-8 5-12 12-12 4 0 7 1 9 4M31 17h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/></svg>',
  signup: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="15" r="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M6 39c1-8 5-12 12-12 6 0 10 3 12 9M37 16v12m-6-6h12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3"/></svg>',
  logout: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M25 8H10v32h15M20 24h23m-7-7 7 7-7 7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/></svg>',
  email: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="10" width="38" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="m7 14 17 13 17-13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/></svg>',
  data: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="8" width="38" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M5 18h38M16 18v22M29 18v22" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
} as const

const INLINE_FONT_FAMILIES = [
  ['inherit', 'Predeterminada'],
  ['Arial, sans-serif', 'Arial'],
  ['Georgia, serif', 'Georgia'],
  ['"Times New Roman", serif', 'Times New Roman'],
  ['Verdana, sans-serif', 'Verdana'],
  ['"Trebuchet MS", sans-serif', 'Trebuchet MS'],
  ['"Courier New", monospace', 'Courier New'],
  ['system-ui, sans-serif', 'Sistema'],
] as const
const INLINE_FONT_SIZES = [
  '12', '14', '16', '18', '20', '24', '32', '40', '48', '56', '64', '72', '96', '128',
] as const
const INLINE_LINE_HEIGHTS = ['0.9', '1', '1.15', '1.3', '1.5', '1.75', '2'] as const
const INTERACTION_STYLES = `
  [data-builder-interaction] {
    transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
    transform-origin: center;
  }
  [data-builder-interaction="lift"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 24px rgba(0, 0, 0, .22);
  }
  [data-builder-interaction="pulse"]:hover { animation: builder-interaction-pulse .48s ease both; }
  [data-builder-interaction="pulse"]:active { transform: scale(.96); }
  [data-builder-interaction="glow"]:hover {
    filter: brightness(1.08);
    box-shadow: 0 0 0 4px rgba(124, 92, 255, .24), 0 8px 24px rgba(0, 0, 0, .18);
  }
  @keyframes builder-interaction-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.055); }
  }
`

export function disableCanvasResizing(component: Component) {
  const descendants = (parent: Component): Component[] => parent.components().models.flatMap(
    (child) => [child, ...descendants(child)],
  )
  const components = [component, ...descendants(component)]
  components.forEach((candidate) => candidate.set('resizable', false))
  return components.length
}

type InlineStyleRte = {
  doc: Document
  el: HTMLElement
  selection: () => Selection | null
}

export function applyInlineTextStyle(
  rte: InlineStyleRte,
  property: 'color' | 'font-family' | 'font-size' | 'line-height',
  value: string,
) {
  const selection = rte.selection()
  if (!selection?.rangeCount || selection.isCollapsed || !value) return false

  const range = selection.getRangeAt(0)
  const RangeConstructor = rte.doc.defaultView?.Range
  let ancestor: HTMLElement | null = range.startContainer instanceof rte.doc.defaultView!.HTMLElement
    ? range.startContainer
    : range.startContainer.parentElement
  while (ancestor && ancestor !== rte.el) {
    const ancestorRange = rte.doc.createRange()
    ancestorRange.selectNodeContents(ancestor)
    const coversAncestor = RangeConstructor
      ? range.compareBoundaryPoints(RangeConstructor.START_TO_START, ancestorRange) <= 0
        && range.compareBoundaryPoints(RangeConstructor.END_TO_END, ancestorRange) >= 0
      : false
    if (coversAncestor) {
      ancestor.style.removeProperty(property)
      if (!ancestor.getAttribute('style')) ancestor.removeAttribute('style')
    }
    ancestor = ancestor.parentElement
  }

  const wrapper = rte.doc.createElement('span')
  wrapper.style.setProperty(property, value)
  try {
    range.surroundContents(wrapper)
  } catch {
    wrapper.append(range.extractContents())
    range.insertNode(wrapper)
  }

  wrapper.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    element.style.removeProperty(property)
    if (!element.getAttribute('style')) element.removeAttribute('style')
  })

  range.selectNodeContents(wrapper)
  selection.removeAllRanges()
  selection.addRange(range)
  const EventConstructor = rte.doc.defaultView?.Event ?? Event
  rte.el.dispatchEvent(new EventConstructor('input', { bubbles: true }))
  return true
}

export function applyComponentLineHeight(component: Component, rte: InlineStyleRte, value: string) {
  if (!value) return false
  component.addStyle({ 'line-height': value })
  component.find('*').forEach((descendant) => descendant.removeStyle('line-height'))
  rte.el.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    element.style.removeProperty('line-height')
    if (!element.getAttribute('style')) element.removeAttribute('style')
  })
  const EventConstructor = rte.doc.defaultView?.Event ?? Event
  rte.el.dispatchEvent(new EventConstructor('input', { bubbles: true }))
  return true
}

function richTextSelect(action: RichTextEditorAction) {
  return action.btn?.querySelector<HTMLSelectElement>('select') ?? null
}

function selectedRichTextStyle(
  rte: InlineStyleRte,
  property: 'color' | 'font-family' | 'font-size' | 'line-height',
) {
  const node = rte.selection()?.anchorNode
  const element = node instanceof rte.doc.defaultView!.Element ? node : node?.parentElement
  return element && rte.doc.defaultView ? rte.doc.defaultView.getComputedStyle(element).getPropertyValue(property) : ''
}

export function cssColorToHex(value: string) {
  if (/^#[\da-f]{6}$/i.test(value)) return value.toLowerCase()
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  return channels?.length === 3
    ? `#${channels.map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')).join('')}`
    : '#000000'
}

export function keepToolbarInsideBounds(toolbar: HTMLElement, bounds: DOMRect, padding = 12) {
  const rect = toolbar.getBoundingClientRect()
  if (!rect.width || !rect.height) return false
  const scaleX = toolbar.offsetWidth ? rect.width / toolbar.offsetWidth : 1
  const scaleY = toolbar.offsetHeight ? rect.height / toolbar.offsetHeight : scaleX
  const usableLeft = bounds.left + padding
  const usableRight = bounds.right - padding
  const usableTop = bounds.top + padding
  const usableBottom = bounds.bottom - padding
  const horizontalShift = rect.width >= usableRight - usableLeft
    ? usableLeft - rect.left
    : rect.left < usableLeft
      ? usableLeft - rect.left
      : rect.right > usableRight ? usableRight - rect.right : 0
  const verticalShift = rect.height >= usableBottom - usableTop
    ? usableTop - rect.top
    : rect.top < usableTop
      ? usableTop - rect.top
      : rect.bottom > usableBottom ? usableBottom - rect.bottom : 0
  const currentLeft = Number.parseFloat(toolbar.style.left)
  const currentTop = Number.parseFloat(toolbar.style.top)
  if (horizontalShift && Number.isFinite(currentLeft)) {
    toolbar.style.left = `${Math.round(currentLeft + horizontalShift / Math.max(scaleX, 0.01))}px`
  }
  if (verticalShift && Number.isFinite(currentTop)) {
    toolbar.style.top = `${Math.round(currentTop + verticalShift / Math.max(scaleY, 0.01))}px`
  }
  return Boolean(horizontalShift || verticalShift)
}

const DIRECT_COLOR_TAGS = new Set(['article', 'aside', 'div', 'footer', 'header', 'main', 'nav', 'section'])
const BACKGROUND_COLOR_COMMAND = 'builder:set-background-color'
const BORDER_COLOR_COMMAND = 'builder:set-border-color'
const CONTAINER_POSITION_COMMAND = 'builder:set-container-position'
const CONTAINER_HORIZONTAL_POSITION_COMMAND = 'builder:set-container-horizontal-position'
const AUTH_SETTINGS_COMMAND = 'builder:open-auth-settings'
const DATA_COMPONENT_SETTINGS_COMMAND = 'builder:open-data-component-settings'
const BACKGROUND_COLOR_ICON = '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5.2 9.1 5.3-5.3 5.7 5.7-5.3 5.3a2 2 0 0 1-2.8 0l-2.9-2.9a2 2 0 0 1 0-2.8Z" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"/><path d="m8 6.3 5.7 5.7M4 16.2h12" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/></svg>'
const BORDER_COLOR_ICON = '<svg aria-hidden="true" viewBox="0 0 20 20"><rect x="3.5" y="3.5" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6.7 6.7h6.6v6.6H6.7z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="1.4 1.4"/></svg>'
const CONTAINER_POSITION_ICON = '<svg aria-hidden="true" viewBox="0 0 20 20"><rect x="3.5" y="3.5" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 10h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="m10 6-1.8 2h3.6L10 6Zm0 8 1.8-2H8.2l1.8 2Z" fill="currentColor"/></svg>'
const CONTAINER_HORIZONTAL_POSITION_ICON = '<svg aria-hidden="true" viewBox="0 0 20 20"><rect x="3.5" y="3.5" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="m6 10 2-1.8v3.6L6 10Zm8 0-2 1.8V8.2L14 10Z" fill="currentColor"/></svg>'
const AUTH_SETTINGS_ICON = '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M7.8 3.8h4.4l.5 1.8 1.7 1 .1 1.9 1.4 1.5-1 1.6.1 1.9-1.7 1-.6 1.7H8.3l-.6-1.7-1.7-1 .1-1.9-1-1.6 1.4-1.5.1-1.9 1.7-1 .5-1.8Z" fill="none" stroke="currentColor" stroke-width="1.35"/><circle cx="10" cy="10" r="2.2" fill="none" stroke="currentColor" stroke-width="1.45"/></svg>'
const DATA_COMPONENT_SETTINGS_ICON = '<svg aria-hidden="true" viewBox="0 0 20 20"><rect x="3.5" y="4" width="13" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.8 8h12.4M8 4.3v11.4" fill="none" stroke="currentColor" stroke-width="1.35"/><path d="m10.5 12.8 1.4-1.4 1.2 1.2 2-2" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>'
let directColorPickerAnchor: DOMRect | null = null

type EyeDropperResult = { sRGBHex: string }
type EyeDropperApi = { open: () => Promise<EyeDropperResult> }
type EyeDropperConstructor = new () => EyeDropperApi

const COLOR_PICKER_PALETTE = [
  ['#ffffff', '#f4f4f5', '#d4d4d8', '#a1a1aa', '#71717a', '#3f3f46', '#18181b', '#000000'],
  ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'],
  ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#7c2d12', '#166534', '#155e75', '#1e3a8a'],
]

/** Adds the browser eyedropper and clearer direct-entry affordances to Spectrum. */
export function enhanceColorPicker(
  picker: HTMLElement,
  EyeDropperClass = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper,
) {
  if (picker.dataset.builderEnhanced === 'true') return false
  picker.dataset.builderEnhanced = 'true'

  const input = picker.querySelector<HTMLInputElement>('.sp-input')
  const inputContainer = picker.querySelector<HTMLElement>('.sp-input-container')
  if (!input || !inputContainer) return false

  input.setAttribute('aria-label', 'Valor del color')
  input.placeholder = '#RRGGBB, rgb() o hsl()'

  const sampleButton = document.createElement('button')
  sampleButton.type = 'button'
  sampleButton.className = 'visual-editor-eyedropper'
  sampleButton.setAttribute('aria-label', 'Tomar un color de la pantalla')
  sampleButton.title = EyeDropperClass
    ? 'Tomar un color de cualquier lugar de la pantalla'
    : 'El navegador no permite tomar colores de la pantalla'
  sampleButton.disabled = !EyeDropperClass
  sampleButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="m13.8 2.7 3.5 3.5-2.1 2.1-.8-.8-6.9 6.9-2 .5-.4-.4.5-2 6.9-6.9-.8-.8 2.1-2.1Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m5.6 12.5 1.9 1.9M3.5 16.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  inputContainer.append(sampleButton)

  sampleButton.addEventListener('click', async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!EyeDropperClass) return
    try {
      const { sRGBHex } = await new EyeDropperClass().open()
      input.value = sRGBHex
      // Spectrum owns the real color input. Its visible text field commits a
      // valid value on change, which keeps inspector and direct-toolbar flows
      // on the same GrapesJS undo/save path.
      input.dispatchEvent(new Event('change', { bubbles: true }))
      input.focus()
    } catch (cause) {
      // Escape/cancel is expected and should leave the current color intact.
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        sampleButton.title = 'No se pudo tomar el color. Inténtalo de nuevo.'
      }
    }
  })
  return true
}

export function applyContainerVerticalAlignment(component: Component, alignment: 'top' | 'center' | 'bottom') {
  const parent = component.parent()
  if (!parent || parent.get('type') === 'wrapper') return false
  const isLayoutColumn = Object.prototype.hasOwnProperty.call(parent.getAttributes(), 'data-builder-layout-column')
  parent.addStyle({
    display: 'flex',
    'flex-direction': 'column',
    'justify-content': alignment === 'top' ? 'flex-start' : alignment === 'bottom' ? 'flex-end' : 'center',
    ...(isLayoutColumn ? { 'align-self': 'stretch', height: '100%' } : {}),
  })
  return true
}

export function applyContainerHorizontalAlignment(component: Component, alignment: 'left' | 'center' | 'right') {
  const parent = component.parent()
  if (!parent || parent.get('type') === 'wrapper') return false
  parent.addStyle({ display: 'flex', 'flex-direction': 'column' })
  const currentWidth = String(component.getStyle().width ?? '').trim()
  const fillsContainer = currentWidth === '100%' || currentWidth === '100vw'
  component.addStyle({
    'align-self': alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center',
    // A full-width child has nowhere to move. Preserve custom widths, but give
    // default 100%-wide elements enough room for alignment to be visible.
    ...(fillsContainer ? { width: '90%' } : {}),
  })
  return true
}

export function addComponentPositionToolbar(component: Component) {
  const parent = component.parent()
  if (!parent || parent.get('type') === 'wrapper') return false
  component.initToolbar()
  const toolbar = [...(component.get('toolbar') ?? [])] as ToolbarButtonProps[]
  const positionItems: ToolbarButtonProps[] = []
  if (!toolbar.some((item) => item.id === CONTAINER_POSITION_COMMAND)) positionItems.push({
    id: CONTAINER_POSITION_COMMAND,
    command: CONTAINER_POSITION_COMMAND,
    label: CONTAINER_POSITION_ICON,
    attributes: {
      'aria-label': 'Posición vertical en el contenedor',
      class: 'builder-position-toolbar-button',
      title: 'Posición vertical en el contenedor',
    },
  })
  if (!toolbar.some((item) => item.id === CONTAINER_HORIZONTAL_POSITION_COMMAND)) positionItems.push({
    id: CONTAINER_HORIZONTAL_POSITION_COMMAND,
    command: CONTAINER_HORIZONTAL_POSITION_COMMAND,
    label: CONTAINER_HORIZONTAL_POSITION_ICON,
    attributes: {
      'aria-label': 'Posición horizontal en el contenedor',
      class: 'builder-position-toolbar-button',
      title: 'Posición horizontal en el contenedor',
    },
  })
  if (!positionItems.length) return false
  const deleteIndex = toolbar.findIndex((item) => item.command === 'tlb-delete')
  toolbar.splice(deleteIndex < 0 ? toolbar.length : deleteIndex, 0, ...positionItems)
  component.set('toolbar', toolbar)
  return true
}

export function addComponentColorToolbar(component: Component) {
  const tagName = String(component.get('tagName') ?? '').toLowerCase()
  if (!DIRECT_COLOR_TAGS.has(tagName) || component.get('type') === 'wrapper') return false
  component.initToolbar()
  const toolbar = [...(component.get('toolbar') ?? [])] as ToolbarButtonProps[]
  if (toolbar.some((item) => item.id === BACKGROUND_COLOR_COMMAND)) return false
  const colorItems: ToolbarButtonProps[] = [
    {
      id: BACKGROUND_COLOR_COMMAND,
      command: BACKGROUND_COLOR_COMMAND,
      label: BACKGROUND_COLOR_ICON,
      attributes: { 'aria-label': 'Color de fondo', class: 'builder-color-toolbar-button', title: 'Color de fondo' },
    },
    {
      id: BORDER_COLOR_COMMAND,
      command: BORDER_COLOR_COMMAND,
      label: BORDER_COLOR_ICON,
      attributes: { 'aria-label': 'Color del borde', class: 'builder-color-toolbar-button', title: 'Color del borde' },
    },
  ]
  const deleteIndex = toolbar.findIndex((item) => item.command === 'tlb-delete')
  toolbar.splice(deleteIndex < 0 ? toolbar.length : deleteIndex, 0, ...colorItems)
  component.set('toolbar', toolbar)
  return true
}

export function applyDirectComponentColor(
  component: Component,
  property: 'background-color' | 'border-color',
  color: string,
) {
  const style: Record<string, string> = { [property]: color }
  if (property === 'border-color') {
    const element = component.getEl()
    const view = element?.ownerDocument.defaultView
    const computed = element && view ? view.getComputedStyle(element) : null
    const hasVisibleBorder = computed
      ? ['Top', 'Right', 'Bottom', 'Left'].some((side) => Number.parseFloat(computed.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0)
      : false
    if (!hasVisibleBorder) {
      style['border-style'] = 'solid'
      style['border-width'] = '1px'
    }
  }
  component.addStyle(style)
  return style
}

function openDirectComponentColorPicker(editor: Editor, property: 'background-color' | 'border-color') {
  const component = editor.getSelected()
  const element = component?.getEl()
  if (!component || !element) return
  const view = element.ownerDocument.defaultView
  const computedColor = view?.getComputedStyle(element).getPropertyValue(property) ?? ''
  const transparent = computedColor === 'transparent' || /rgba\([^)]*,\s*0\s*\)$/.test(computedColor)
  document.querySelector('.gjs-direct-color-picker-host')?.remove()
  const toolbar = document.querySelector<HTMLElement>('.gjs-toolbar')
  directColorPickerAnchor = toolbar?.getBoundingClientRect() ?? null
  const host = document.createElement('span')
  host.className = 'gjs-direct-color-picker-host'
  const input = document.createElement('input')
  host.append(input)
  document.body.append(host)

  const initialColor = transparent
    ? property === 'background-color' ? '#ffffff' : '#000000'
    : cssColorToHex(computedColor)
  const cleanup = () => {
    directColorPickerAnchor = null
    host.remove()
  }
  const applyColor = (color: { toHexString?: () => string } | string) => {
    const value = typeof color === 'string' ? color : color?.toHexString?.()
    if (value) applyDirectComponentColor(component, property, value)
  }
  const model = editor.getModel() as unknown as {
    initBaseColorPicker: (element: HTMLInputElement, options: Record<string, unknown>) => {
      spectrum: (action: string) => void
    }
  }
  const picker = model.initBaseColorPicker(input, {
    color: initialColor,
    showAlpha: false,
    showInput: true,
    preferredFormat: 'hex',
    move: applyColor,
    change: applyColor,
    hide: cleanup,
  })
  const showPicker = () => window.setTimeout(() => {
    if (host.isConnected) picker.spectrum('show')
  }, 0)
  // GrapesJS starts toolbar commands on pointer-down. Spectrum treats the
  // matching pointer-up as an outside interaction, so opening before release
  // makes the picker disappear unless the button stays held. Wait until that
  // initiating pointer has fully finished, then show the picker.
  const pressedToolbarButton = document.querySelector('.gjs-toolbar-item:active')
  if (pressedToolbarButton) {
    const pointerFinished = () => {
      document.removeEventListener('pointercancel', pointerCancelled, true)
      showPicker()
    }
    const pointerCancelled = () => {
      document.removeEventListener('pointerup', pointerFinished, true)
      cleanup()
    }
    document.addEventListener('pointerup', pointerFinished, { capture: true, once: true })
    document.addEventListener('pointercancel', pointerCancelled, { capture: true, once: true })
  } else {
    showPicker()
  }
}

function openContainerPositionMenu(editor: Editor, axis: 'vertical' | 'horizontal' = 'vertical') {
  const component = editor.getSelected()
  if (!component?.parent()) return
  document.querySelector('.gjs-container-position-menu')?.remove()
  const toolbar = document.querySelector<HTMLElement>('.gjs-toolbar')
  const anchor = toolbar?.getBoundingClientRect()
  if (!anchor) return

  const menu = document.createElement('div')
  menu.className = 'gjs-container-position-menu'
  menu.setAttribute('role', 'menu')
  const positions = axis === 'vertical' ? [
    ['top', 'Arriba', 'M4 5h12M10 7v8m-3-3 3 3 3-3'],
    ['center', 'Centro', 'M4 10h12M10 5v10m-3-8 3-2 3 2m-6 6 3 2 3-2'],
    ['bottom', 'Abajo', 'M4 15h12M10 5v8m-3-3 3 3 3-3'],
  ] as const : [
    ['left', 'Izquierda', 'M5 4v12m2-6h8m-3-3 3 3-3 3'],
    ['center', 'Centro', 'M10 4v12M5 10h10M7 7l-2 3 2 3m6-6 2 3-2 3'],
    ['right', 'Derecha', 'M15 4v12m-2-6H5m3-3-3 3 3 3'],
  ] as const
  positions.forEach(([value, label, path]) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('role', 'menuitem')
    button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 20 20"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${label}</span>`
    button.addEventListener('click', () => {
      if (axis === 'vertical') applyContainerVerticalAlignment(component, value as 'top' | 'center' | 'bottom')
      else applyContainerHorizontalAlignment(component, value as 'left' | 'center' | 'right')
      menu.remove()
    })
    menu.append(button)
  })
  document.body.append(menu)
  const menuRect = menu.getBoundingClientRect()
  const left = Math.min(Math.max(12, anchor.right - menuRect.width), window.innerWidth - menuRect.width - 12)
  const below = anchor.bottom + 8
  const top = below + menuRect.height <= window.innerHeight - 12 ? below : anchor.top - menuRect.height - 8
  menu.style.left = `${Math.round(left)}px`
  menu.style.top = `${Math.max(12, Math.round(top))}px`

  window.setTimeout(() => {
    const dismiss = (event: PointerEvent) => {
      if (!menu.contains(event.target as Node)) menu.remove()
    }
    document.addEventListener('pointerdown', dismiss, { once: true })
  }, 0)
}

function alignmentIcon(alignment: 'left' | 'center' | 'right' | 'justify') {
  const widths = alignment === 'left'
    ? [18, 13, 18, 10]
    : alignment === 'center'
      ? [18, 12, 18, 14]
      : alignment === 'right'
        ? [18, 13, 18, 10]
        : [18, 18, 18, 18]
  const positions = alignment === 'center'
    ? widths.map((width) => (20 - width) / 2)
    : alignment === 'right'
      ? widths.map((width) => 20 - width)
      : widths.map(() => 1)
  return `<svg aria-hidden="true" viewBox="0 0 22 22">${widths.map((width, index) =>
    `<path d="M${positions[index]} ${4 + index * 5}h${width}"/>`).join('')}</svg>`
}

function installInlineTypographyControls(editor: Editor) {
  const fontOptions = INLINE_FONT_FAMILIES.map(([value, label]) =>
    `<option value="${value.replaceAll('"', '&quot;')}">${label}</option>`).join('')
  editor.RichTextEditor.add('inline-font-family', {
    attributes: { 'data-rte-control': 'font-family', title: 'Fuente' },
    event: 'change',
    icon: `<select aria-label="Fuente" class="gjs-rte-select gjs-rte-font-family"><option value="">Fuente</option>${fontOptions}</select>`,
    result: (rte, action) => {
      const value = richTextSelect(action)?.value ?? ''
      if (value) applyInlineTextStyle(rte, 'font-family', value)
    },
    update: (rte, action) => {
      const select = richTextSelect(action)
      if (!select) return 0
      const current = selectedRichTextStyle(rte, 'font-family').replaceAll('"', '').toLowerCase()
      const match = INLINE_FONT_FAMILIES.find(([value]) => {
        if (value === 'inherit') return false
        return current.startsWith(value.replaceAll('"', '').toLowerCase().split(',')[0])
      })
      select.value = match?.[0] ?? ''
      return 0
    },
  })
  editor.RichTextEditor.add('inline-font-size', {
    attributes: { 'data-rte-control': 'font-size', title: 'Tamaño de fuente' },
    event: 'change',
    icon: `<select aria-label="Tamaño de fuente" class="gjs-rte-select gjs-rte-font-size"><option value="">Tamaño</option><option value="inherit">Predeterminado</option>${INLINE_FONT_SIZES.map((size) => `<option value="${size}px">${size}</option>`).join('')}</select>`,
    result: (rte, action) => {
      const value = richTextSelect(action)?.value ?? ''
      if (value) applyInlineTextStyle(rte, 'font-size', value)
    },
    update: (rte, action) => {
      const select = richTextSelect(action)
      if (!select) return 0
      const current = Math.round(Number.parseFloat(selectedRichTextStyle(rte, 'font-size')))
      select.value = INLINE_FONT_SIZES.includes(String(current) as typeof INLINE_FONT_SIZES[number]) ? `${current}px` : ''
      return 0
    },
  })
  editor.RichTextEditor.add('inline-line-height', {
    attributes: { 'data-rte-control': 'line-height', title: 'Interlineado' },
    event: 'change',
    icon: `<select aria-label="Interlineado" class="gjs-rte-select gjs-rte-line-height"><option value="">Líneas</option><option value="normal">Predeterminado</option>${INLINE_LINE_HEIGHTS.map((height) => `<option value="${height}">${height}×</option>`).join('')}</select>`,
    result: (rte, action) => {
      const value = richTextSelect(action)?.value ?? ''
      const component = editor.getSelected()
      if (component && value) applyComponentLineHeight(component, rte, value)
    },
    update: (rte, action) => {
      const select = richTextSelect(action)
      if (!select) return 0
      const currentLineHeight = selectedRichTextStyle(rte, 'line-height')
      if (currentLineHeight === 'normal') {
        select.value = 'normal'
        return 0
      }
      const lineHeight = Number.parseFloat(currentLineHeight)
      const fontSize = Number.parseFloat(selectedRichTextStyle(rte, 'font-size'))
      const ratio = lineHeight / fontSize
      const match = INLINE_LINE_HEIGHTS.find((height) => Math.abs(Number(height) - ratio) < 0.04)
      select.value = match ?? ''
      return 0
    },
  })
  editor.RichTextEditor.add('inline-text-color', {
    attributes: { 'data-rte-control': 'color', title: 'Color del texto' },
    event: 'change',
    icon: '<label class="gjs-rte-color-label"><span>A</span><input aria-label="Color del texto" class="gjs-rte-color" type="color" value="#000000"></label>',
    result: (rte, action) => {
      const value = action.btn?.querySelector<HTMLInputElement>('input[type="color"]')?.value ?? ''
      if (value) applyInlineTextStyle(rte, 'color', value)
    },
    update: (rte, action) => {
      const input = action.btn?.querySelector<HTMLInputElement>('input[type="color"]')
      if (input) input.value = cssColorToHex(selectedRichTextStyle(rte, 'color'))
      return 0
    },
  })

  const alignments = [
    ['left', 'Alinear a la izquierda', 'justifyLeft'],
    ['center', 'Centrar texto', 'justifyCenter'],
    ['right', 'Alinear a la derecha', 'justifyRight'],
    ['justify', 'Justificar texto', 'justifyFull'],
  ] as const
  alignments.forEach(([alignment, title, command]) => {
    editor.RichTextEditor.add(`inline-align-${alignment}`, {
      attributes: { 'data-rte-alignment': alignment, title },
      icon: alignmentIcon(alignment),
      result: (rte) => rte.exec(command),
      state: (_rte, document) => document.queryCommandState(command) ? 1 : 0,
    })
  })

  const familyButton = editor.RichTextEditor.get('inline-font-family')?.btn
  const sizeButton = editor.RichTextEditor.get('inline-font-size')?.btn
  const lineHeightButton = editor.RichTextEditor.get('inline-line-height')?.btn
  const colorButton = editor.RichTextEditor.get('inline-text-color')?.btn
  const actionbar = familyButton?.parentElement
  if (actionbar && familyButton && sizeButton && lineHeightButton && colorButton) {
    const rowBreak = document.createElement('span')
    rowBreak.className = 'gjs-rte-row-break'
    rowBreak.setAttribute('aria-hidden', 'true')
    actionbar.prepend(rowBreak)
    actionbar.prepend(colorButton)
    actionbar.prepend(lineHeightButton)
    actionbar.prepend(sizeButton)
    actionbar.prepend(familyButton)
  }
}

function loadGuestProjectData(): EditorProjectData {
  const saved = JSON.parse(localStorage.getItem(GUEST_PROJECT_STORAGE_KEY) ?? 'null') as EditorProjectData | null
  return saved && typeof saved === 'object' ? saved : {}
}

function saveGuestProjectData(projectData: EditorProjectData) {
  localStorage.setItem(GUEST_PROJECT_STORAGE_KEY, JSON.stringify(projectData))
}

export function isEditableCanvasTarget(target: Element, components: Component[]) {
  let element: Element | null = target
  while (element) {
    const component = components.find((candidate) => candidate.getEl() === element)
    if (component?.get('editable')) return true
    element = element.parentElement
  }
  return false
}

function summarizeComponent(component?: Component | null): ElementSummary | null {
  if (!component) return null

  const tag = String(component.get('tagName') || component.get('type') || 'element').toUpperCase()
  const attributes = component.getAttributes()
  const content = component.get('content')
  const element = component.getEl()
  const directText = element
    ? Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .join(' ')
    : ''
  const rawLabel = attributes['aria-label']
    || attributes.alt
    || attributes.title
    || (typeof content === 'string' ? content.replace(/<[^>]+>/g, ' ') : '')
    || directText
    || component.getName()
    || tag
  const label = String(rawLabel).replace(/\s+/g, ' ').trim()
  const flowConnection = readScreenFlowConnection(attributes)
  const recordToggle = readRecordToggleConnection(attributes)
  const dataAction = readDataActionConnection(attributes)
  let ancestor = component.parent()
  let inheritedRepeaterTableId: string | undefined
  while (ancestor && !inheritedRepeaterTableId) {
    const value = ancestor.getAttributes()[DATA_REPEATER_ATTRIBUTE]
    if (typeof value === 'string' && value !== 'true') inheritedRepeaterTableId = value
    ancestor = ancestor.parent()
  }

  return {
    tag,
    label: label.length > 48 ? `${label.slice(0, 47)}…` : label,
    bindingField: typeof attributes[DATA_BIND_FIELD_ATTRIBUTE] === 'string'
      ? attributes[DATA_BIND_FIELD_ATTRIBUTE] as string
      : undefined,
    bindingTarget: typeof attributes[DATA_BIND_TARGET_ATTRIBUTE] === 'string'
      ? attributes[DATA_BIND_TARGET_ATTRIBUTE] as string
      : undefined,
    bindingScope: attributes[DATA_SCOPE_ATTRIBUTE] === 'first' ? 'first' : 'context',
    dataSourceTableId: typeof attributes[DATA_SOURCE_ATTRIBUTE] === 'string'
      ? attributes[DATA_SOURCE_ATTRIBUTE] as string
      : undefined,
    interactionAnimation: readInteractionAnimation(attributes),
    isRepeater: typeof attributes[DATA_REPEATER_ATTRIBUTE] === 'string',
    inheritedRepeaterTableId,
    repeaterTableId: typeof attributes[DATA_REPEATER_ATTRIBUTE] === 'string'
      && attributes[DATA_REPEATER_ATTRIBUTE] !== 'true'
      ? attributes[DATA_REPEATER_ATTRIBUTE] as string
      : undefined,
    ...(flowConnection ? { screenFlow: flowConnection, targetPageId: flowConnection.targetPageId } : {}),
    ...(recordToggle ? { recordToggle } : {}),
    ...(dataAction ? { dataAction } : {}),
  }
}

function formInputNames(component?: Component | null) {
  let form = component ?? null
  while (form && String(form.get('tagName')).toUpperCase() !== 'FORM') form = form.parent() ?? null
  if (!form) return []
  const descendants = (parent: Component): Component[] => parent.components().models.flatMap(
    (child) => [child, ...descendants(child)],
  )
  return [...new Set([form, ...descendants(form)].flatMap((candidate) => {
    const tag = String(candidate.get('tagName')).toUpperCase()
    const name = candidate.getAttributes().name
    return ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) && typeof name === 'string'
      && /^[a-z][a-z0-9_-]*$/.test(name.trim())
      ? [name.trim()]
      : []
  }))]
}

function incomingRecordTableIds(editor: Editor | null, targetPageId: string) {
  if (!editor || !targetPageId) return []
  const descendants = (parent: Component): Component[] => parent.components().models.flatMap(
    (child) => [child, ...descendants(child)],
  )
  const tableIds: string[] = []
  editor.Pages.getAll().forEach((page) => {
    const root = page.getMainComponent()
    ;[root, ...descendants(root)].forEach((component) => {
      if (component.getAttributes()[FLOW_TARGET_ATTRIBUTE] !== targetPageId) return
      const flowConnection = readScreenFlowConnection(component.getAttributes())
      if (flowConnection?.dataSourceTableId) {
        tableIds.push(flowConnection.dataSourceTableId)
        return
      }
      let ancestor: Component | null | undefined = component
      while (ancestor) {
        const tableId = ancestor.getAttributes()[DATA_REPEATER_ATTRIBUTE]
        if (typeof tableId === 'string' && tableId && tableId !== 'true') {
          tableIds.push(tableId)
          break
        }
        ancestor = ancestor.parent()
      }
    })
  })
  return [...new Set(tableIds)]
}

function positionColorPicker() {
  requestAnimationFrame(() => {
    const picker = document.querySelector<HTMLElement>('.visual-editor-color-picker:not(.sp-hidden)')
    const trigger = document.querySelector<HTMLElement>('.sp-replacer.sp-active')
    if (!picker) return

    enhanceColorPicker(picker)

    const triggerRect = directColorPickerAnchor ?? trigger?.getBoundingClientRect()
    const pickerRect = picker.getBoundingClientRect()
    const idealTop = directColorPickerAnchor && triggerRect
      ? triggerRect.bottom + 8
      : triggerRect ? triggerRect.bottom - pickerRect.height : 96
    const top = Math.min(Math.max(56, idealTop), window.innerHeight - pickerRect.height - 12)
    const right = directColorPickerAnchor && triggerRect
      ? Math.max(12, window.innerWidth - Math.min(window.innerWidth - 12, triggerRect.right))
      : 12
    picker.style.setProperty('--picker-top', `${top}px`)
    picker.style.setProperty('--picker-right', `${right}px`)
  })
}

function ensureDataDesignPlaceholders(editor: Editor) {
  let changedCount = 0
  editor.Pages.getAll().forEach((page) => {
    page.getMainComponent().find([
      `[${DATA_COMPONENT_ATTRIBUTE}] video.builder-data-card__media`,
      `[${DATA_COMPONENT_ATTRIBUTE}] video.builder-data-list__media`,
      `[${DATA_COMPONENT_ATTRIBUTE}] video.builder-data-featured__media`,
    ].join(',')).forEach((video) => {
      const attributes = video.getAttributes()
      if (attributes.controls !== undefined) {
        video.removeAttributes('controls')
        changedCount += 1
      }
      const thumbnailAttributes = {
        'aria-hidden': 'true',
        muted: '',
        playsinline: '',
        preload: 'metadata',
        tabindex: '-1',
      }
      if (Object.entries(thumbnailAttributes).some(([name, value]) => attributes[name] !== value)) {
        video.addAttributes(thumbnailAttributes)
        changedCount += 1
      }
    })
    page.getMainComponent().find(`[${DATA_REPEATER_ATTRIBUTE}]`).forEach((template) => {
      const parent = template.parent()
      if (!parent) return
      const requestedPageSize = Number.parseInt(String(template.getAttributes()[DATA_PAGE_SIZE_ATTRIBUTE] ?? ''), 10)
      if (!Number.isInteger(requestedPageSize) || requestedPageSize < 2 || requestedPageSize > 100) return
      const requestedPreviewCount = Number.parseInt(String(
        template.getAttributes()[DATA_DESIGN_PREVIEW_COUNT_ATTRIBUTE] ?? '',
      ), 10)
      const fallbackPreviewCount = parent.getClasses().includes('builder-data-carousel')
        ? 4
        : parent.getClasses().includes('builder-data-list') ? 2 : 8
      const previewCount = Number.isInteger(requestedPreviewCount)
        && requestedPreviewCount > 0
        && requestedPreviewCount <= 12
        ? Math.min(requestedPageSize, requestedPreviewCount)
        : Math.min(requestedPageSize, fallbackPreviewCount)
      if (String(template.getAttributes()[DATA_DESIGN_PREVIEW_COUNT_ATTRIBUTE] ?? '') !== String(previewCount)) {
        template.addAttributes({ [DATA_DESIGN_PREVIEW_COUNT_ATTRIBUTE]: String(previewCount) })
        changedCount += 1
      }
      const existingPlaceholders = parent.components().models.filter((component) =>
        component.getAttributes()[DATA_DESIGN_PLACEHOLDER_ATTRIBUTE] === 'true')
      existingPlaceholders.slice(Math.max(0, previewCount - 1)).forEach((placeholder) => {
        placeholder.remove()
        changedCount += 1
      })
      const retainedPlaceholders = existingPlaceholders.slice(0, Math.max(0, previewCount - 1))
      retainedPlaceholders.forEach((placeholder) => {
        if (placeholder.getAttributes()['aria-hidden'] !== undefined) {
          placeholder.removeAttributes('aria-hidden')
          changedCount += 1
        }
      })
      const missingCount = Math.max(0, previewCount - 1 - retainedPlaceholders.length)
      Array.from({ length: missingCount }).forEach(() => {
        const placeholder = template.clone()
        const boundElements = [placeholder, ...placeholder.find(`[${DATA_BIND_FIELD_ATTRIBUTE}]`)]
        boundElements.forEach((component) => component.removeAttributes([
          DATA_BIND_FIELD_ATTRIBUTE,
          DATA_BIND_TARGET_ATTRIBUTE,
          DATA_SOURCE_ATTRIBUTE,
          DATA_SCOPE_ATTRIBUTE,
        ]))
        const interactiveElements = [placeholder, ...placeholder.find(`[${FLOW_ACTION_ATTRIBUTE}]`)]
        interactiveElements.forEach((component) => component.removeAttributes([
          FLOW_ACTION_ATTRIBUTE,
          FLOW_TARGET_ATTRIBUTE,
          FLOW_DATA_SOURCE_ATTRIBUTE,
          FLOW_OWNER_FIELD_ATTRIBUTE,
          FLOW_RECORD_FIELD_ATTRIBUTE,
          FLOW_CONTEXT_ATTRIBUTE,
          FLOW_ACTIVE_LABEL_ATTRIBUTE,
          FLOW_INACTIVE_LABEL_ATTRIBUTE,
        ]))
        placeholder.removeAttributes([
          DATA_REPEATER_ATTRIBUTE,
          DATA_PAGE_SIZE_ATTRIBUTE,
          DATA_PAGINATION_ATTRIBUTE,
          DATA_DESIGN_PREVIEW_COUNT_ATTRIBUTE,
        ])
        placeholder.addAttributes({
          [DATA_DESIGN_PLACEHOLDER_ATTRIBUTE]: 'true',
        })
        parent.append(placeholder)
        changedCount += 1
      })
    })
  })
  return changedCount
}

const EDITOR_VIEWPORT_GUARD_ATTRIBUTE = 'data-builder-editor-viewport-guard'
const DEFAULT_EDITOR_VIEWPORT_HEIGHT_CAP = 720

export function installEditorCanvasLayoutGuards(
  document: Document,
  heightCap = DEFAULT_EDITOR_VIEWPORT_HEIGHT_CAP,
) {
  const window = document.defaultView
  const body = document.body
  if (!window || !body) return 0

  let style = document.head.querySelector<HTMLStyleElement>('style[data-builder-editor-layout-guards]')
  if (!style) {
    style = document.createElement('style')
    style.dataset.builderEditorLayoutGuards = 'true'
    document.head.append(style)
  }
  style.textContent = `
    ${dataComponentStyles}
    :root {
      --builder-editor-viewport-height: ${heightCap}px !important;
      --builder-editor-data-card-height: 320px;
      --builder-editor-data-list-height: 180px;
    }
    html,
    body {
      min-height: var(--builder-editor-viewport-height) !important;
    }
    :where(.demo-page, .screen, .tpl-wrap, .tpl-dash-side, .builder-auth-page, .builder-auth-brand, .builder-auth-content, .lsp-page) {
      min-height: var(--builder-editor-viewport-height) !important;
    }
    [${EDITOR_VIEWPORT_GUARD_ATTRIBUTE}] {
      min-height: var(--builder-editor-viewport-height) !important;
    }
    .builder-data-grid {
      max-height: calc(var(--builder-editor-data-card-height) + var(--builder-editor-data-card-height) + 3.25rem) !important;
      overflow: hidden !important;
    }
    .builder-data-grid > .builder-data-card,
    .builder-data-carousel > .builder-data-carousel__item {
      height: var(--builder-editor-data-card-height) !important;
    }
    .builder-data-card__media {
      height: 170px !important;
      aspect-ratio: auto !important;
    }
    .builder-data-card__content {
      max-height: 150px !important;
      overflow: hidden !important;
    }
    .builder-data-item--without-media > .builder-data-card__content {
      max-height: var(--builder-editor-data-card-height) !important;
    }
    .builder-data-card__content h2,
    .builder-data-card__content h3,
    .builder-data-card__content p {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
    }
    .builder-data-card__content h2,
    .builder-data-card__content h3 { -webkit-line-clamp: 2; }
    .builder-data-card__content p { -webkit-line-clamp: 3; }
    .builder-data-list {
      max-height: calc(var(--builder-editor-data-list-height) + var(--builder-editor-data-list-height) + 3rem) !important;
      overflow: hidden !important;
    }
    .builder-data-list > .builder-data-list__item {
      height: var(--builder-editor-data-list-height) !important;
      overflow: hidden !important;
    }
    .builder-data-list__media {
      height: 146px !important;
      aspect-ratio: auto !important;
    }
    .builder-data-list__content p {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
    }
    .builder-data-carousel {
      display: grid !important;
      grid-template-columns: repeat(var(--builder-data-cols-desktop, 4), minmax(0, 1fr)) !important;
      max-height: calc(var(--builder-editor-data-card-height) + 2rem) !important;
      overflow: hidden !important;
    }
    .builder-data-carousel > .builder-data-carousel__item {
      width: auto !important;
      min-width: 0 !important;
    }
    @media (max-width: 900px) {
      .builder-data-carousel {
        grid-template-columns: repeat(var(--builder-data-cols-tablet, 3), minmax(0, 1fr)) !important;
      }
    }
    @media (max-width: 600px) {
      .builder-data-carousel {
        grid-template-columns: repeat(var(--builder-data-cols-mobile, 1), minmax(0, 1fr)) !important;
      }
    }
    @supports (container-type: inline-size) {
      @container builder-data-component (max-width: 900px) {
        .builder-data-carousel {
          grid-template-columns: repeat(var(--builder-data-cols-tablet, 3), minmax(0, 1fr)) !important;
        }
      }
      @container builder-data-component (max-width: 600px) {
        .builder-data-carousel {
          grid-template-columns: repeat(var(--builder-data-cols-mobile, 1), minmax(0, 1fr)) !important;
        }
      }
    }
    .builder-data-featured {
      height: 420px !important;
      overflow: hidden !important;
    }
  `

  const viewportHeight = window.innerHeight
  const runawayMinimum = Math.max(heightCap * 2, viewportHeight * 0.9)
  const normalizedPageShells = body.querySelectorAll('.lsp-page').length

  let guardedCount = 0
  ;[body, ...Array.from(body.querySelectorAll<HTMLElement>('*'))].forEach((element) => {
    const minHeight = Number.parseFloat(window.getComputedStyle(element).minHeight)
    if (!Number.isFinite(minHeight) || minHeight < runawayMinimum) return
    element.setAttribute(EDITOR_VIEWPORT_GUARD_ATTRIBUTE, 'true')
    guardedCount += 1
  })
  return guardedCount + normalizedPageShells
}

function findPreviewButton(editor: Editor): Button | null {
  const directButton = editor.Panels.getButton('options', 'preview')
    ?? editor.Panels.getButton('options', 'core:preview')
  if (directButton) return directButton

  const buttons = editor.Panels.getPanel('options')?.get('buttons') as {
    find: (predicate: (button: Button) => boolean) => Button | undefined
  } | undefined
  return buttons?.find((button) => {
    const command = button.get('command')
    return command === 'preview' || command === 'core:preview' || command === 'builder-preview'
  }) ?? null
}

function floatingMenuPosition(buttonRect: DOMRect, menuWidth: number, menuHeight: number) {
  const viewportMargin = 8
  const left = Math.min(
    window.innerWidth - menuWidth - viewportMargin,
    Math.max(viewportMargin, buttonRect.right - menuWidth),
  )
  const preferredTop = buttonRect.bottom + 3
  const top = preferredTop + menuHeight <= window.innerHeight - viewportMargin
    ? preferredTop
    : Math.max(viewportMargin, buttonRect.top - menuHeight - 3)
  return { left, top }
}

export function OpenSourceEditor({ accountEmail, editorProjectId, isGuest = false, onSignOut }: {
  accountEmail: string
  editorProjectId: string
  isGuest?: boolean
  onSignOut: () => Promise<void>
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const canvasColumnRef = useRef<HTMLElement>(null)
  const blocksRef = useRef<HTMLDivElement>(null)
  const layersRef = useRef<HTMLDivElement>(null)
  const nativeDevicesRef = useRef<HTMLDivElement>(null)
  const nativeOptionsRef = useRef<HTMLDivElement>(null)
  const stylesRef = useRef<HTMLDivElement>(null)
  const traitsRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const previewControllerRef = useRef<ReturnType<typeof createPreviewController> | null>(null)
  const canvasZoomModeRef = useRef<CanvasZoomMode>('fit')
  const canvasViewsRef = useRef(new Map<string, CanvasViewState>())
  const currentCanvasDeviceRef = useRef('desktop')
  const editingDataComponentRef = useRef<Component | null>(null)
  const authSettingsComponentRef = useRef<Component | null>(null)
  const navbarLinkSettingsComponentRef = useRef<Component | null>(null)
  const draggedBlockRef = useRef<Block | null>(null)
  const panToolLockedRef = useRef(false)
  const initialSupabaseConfigRef = useRef(EMPTY_SUPABASE_CONFIG)
  const supabaseConfigRef = useRef(initialSupabaseConfigRef.current)
  const projectExternalLibrariesRef = useRef<ProjectExternalLibraries | null>(null)
  const jsLabSaveTimerRef = useRef<number | null>(null)
  const jsLabStoreQueueRef = useRef<Promise<void>>(Promise.resolve())
  if (!projectExternalLibrariesRef.current) {
    const initialLibraries = createProjectExternalLibraries()
    if (!initialLibraries.ok) throw new Error(initialLibraries.error)
    projectExternalLibrariesRef.current = initialLibraries.value
  }
  const [error, setError] = useState<string | null>(null)
  const [pages, setPages] = useState<EditorPageSummary[]>([
    { access: 'public', id: BLANK_PAGE.id, isHome: true, name: BLANK_PAGE.name, roles: [] },
  ])
  const [activePageId, setActivePageId] = useState<string>(BLANK_PAGE.id)
  const [rightPanel, setRightPanel] = useState<'styles' | 'properties' | 'motion' | 'flow'>('styles')
  const [leftPanel, setLeftPanel] = useState<'layers' | 'data' | 'libraries'>('layers')
  const [blocksOpen, setBlocksOpen] = useState(false)
  const [blockDropActive, setBlockDropActive] = useState(false)
  const [dataComponentEditRequest, setDataComponentEditRequest] = useState<DataComponentEditRequest | null>(null)
  const [dataComponentRequest, setDataComponentRequest] = useState(0)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [createMenuPosition, setCreateMenuPosition] = useState({ left: 0, top: 0 })
  const [pageMenuId, setPageMenuId] = useState<string | null>(null)
  const [pageMenuPosition, setPageMenuPosition] = useState({ left: 0, top: 0 })
  const [pageAccessMenuOpen, setPageAccessMenuOpen] = useState(false)
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null)
  const [pageDropTarget, setPageDropTarget] = useState<{
    id: string
    position: 'before' | 'after'
  } | null>(null)
  const [pageImportOpen, setPageImportOpen] = useState(false)
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false)
  const [renamingPage, setRenamingPage] = useState<{ id: string; name: string } | null>(null)
  const [selectedElement, setSelectedElement] = useState<ElementSummary | null>(null)
  const [selectedGridItem, setSelectedGridItem] = useState<Component | null>(null)
  const [, setGridLayoutRevision] = useState(0)
  const [siteMargin, setSiteMargin] = useState(DEFAULT_SITE_MARGIN)
  const [selectedMotionComponent, setSelectedMotionComponent] = useState<Component | null>(null)
  const [motionNotice, setMotionNotice] = useState('')
  const [motionDialogOpen, setMotionDialogOpen] = useState(false)
  const [authSettings, setAuthSettings] = useState<AuthComponentSettings | null>(null)
  const [navbarLinkSettings, setNavbarLinkSettings] = useState<NavbarLinkSettings | null>(null)
  const [activePageHasAuth, setActivePageHasAuth] = useState(false)
  const [flowTargetPageId, setFlowTargetPageId] = useState('')
  const [flowNavigationDataSourceTableId, setFlowNavigationDataSourceTableId] = useState('')
  const [flowNavigationRecordField, setFlowNavigationRecordField] = useState('')
  const [flowAction, setFlowAction] = useState<'navigate' | 'toggle-record' | DataActionKind>('navigate')
  const [flowDataSourceTableId, setFlowDataSourceTableId] = useState('')
  const [flowOwnerField, setFlowOwnerField] = useState('user_id')
  const [flowRecordField, setFlowRecordField] = useState('practice_id')
  const [flowActiveLabel, setFlowActiveLabel] = useState('★ Guardado')
  const [flowInactiveLabel, setFlowInactiveLabel] = useState('☆ Guardar')
  const [flowFieldMappings, setFlowFieldMappings] = useState<Array<{ field: string; inputName: string }>>([])
  const [flowSuccessMessage, setFlowSuccessMessage] = useState('Registro creado.')
  const [flowConfirmMessage, setFlowConfirmMessage] = useState('')
  const [flowFixedField, setFlowFixedField] = useState('')
  const [flowFixedValue, setFlowFixedValue] = useState('')
  const [flowRecordMode, setFlowRecordMode] = useState<DataActionRecordMode>('context')
  const [flowValueSource, setFlowValueSource] = useState<DataActionValueSource>('fixed')
  const [flowValueInputName, setFlowValueInputName] = useState('')
  const [flowValueAmount, setFlowValueAmount] = useState(1)
  const [dynamicActionDialogOpen, setDynamicActionDialogOpen] = useState(false)
  const [flowNotice, setFlowNotice] = useState('')
  const [previewActive, setPreviewActive] = useState(false)
  const [canvasZoom, setCanvasZoom] = useState(100)
  const [canvasZoomMode, setCanvasZoomMode] = useState<CanvasZoomMode>('fit')
  const [panToolActive, setPanToolActive] = useState(false)
  const [previewSession, setPreviewSession] = useState<EditorPreviewSession | null>(null)
  const [previewViewport, setPreviewViewport] = useState<EditorPreviewViewport>({
    label: 'Escritorio',
    width: '100%',
  })
  const [supabaseConfig, setSupabaseConfig] = useState(initialSupabaseConfigRef.current)
  const [availableExternalLibraries, setAvailableExternalLibraries] = useState(
    () => projectExternalLibrariesRef.current!.listLibraries(),
  )

  async function persistProjectSnapshot(
    grapesjsData: Record<string, unknown>,
    libraries: ProjectExternalLibraries = projectExternalLibrariesRef.current!,
  ) {
    const projectData: EditorProjectData = {
      externalLibraries: libraries.imported,
      grapesjs: grapesjsData,
      supabaseConfig: supabaseConfigRef.current as unknown as Record<string, unknown>,
    }
    if (isGuest) saveGuestProjectData(projectData)
    else await saveEditorProjectData(editorProjectId, projectData)
  }

  async function addImportedLibrary(prepared: PreparedImportedLibraryFile) {
    const loaded = await loadPreparedImportedLibrary(prepared)
    if (!loaded.ok) throw new Error(loaded.error)

    const next = createProjectExternalLibraries([
      ...projectExternalLibrariesRef.current!.imported,
      loaded.value,
    ])
    if (!next.ok) throw new Error(next.error)

    const editor = editorRef.current
    if (!editor) throw new Error('El editor todavía no está listo para añadir bibliotecas.')
    const previousLibraries = projectExternalLibrariesRef.current!
    projectExternalLibrariesRef.current = next.value
    try {
      await persistProjectSnapshot(
        editor.getProjectData() as Record<string, unknown>,
        next.value,
      )
    } catch (cause) {
      projectExternalLibrariesRef.current = previousLibraries
      throw cause
    }
    setAvailableExternalLibraries(next.value.listLibraries())
  }

  async function useExternalFunction(libraryId: string, functionId: string) {
    const editor = editorRef.current
    if (!editor) throw new Error('El editor todavía no está listo para usar funciones.')
    const library = projectExternalLibrariesRef.current!.listLibraries()
      .find((candidate) => candidate.id === libraryId)
    const registration = library?.functions.find(({ metadata }) => metadata.id === functionId)
    if (!library || !registration) throw new Error('La función seleccionada ya no está disponible.')

    const lab = ensureJsLab(editor).component
    const current = readJsLabSettings(lab)
    const existingCode = current.code === DEFAULT_JS_LAB_CODE ? '' : current.code.trimEnd()
    const runtimeSources = jsLabRuntimeSourceOptions(editor)
    const call = externalFunctionCallStatement(registration.metadata, existingCode, runtimeSources)
    const code = `${existingCode ? `${existingCode}\n` : ''}${call.statement}`
    updateJsLabScript(lab, { code })
    editor.select(lab)
    setLeftPanel('libraries')
    if (jsLabSaveTimerRef.current !== null) {
      window.clearTimeout(jsLabSaveTimerRef.current)
      jsLabSaveTimerRef.current = null
    }
    await queueJsLabStore(editor)
  }

  function scheduleJsLabSave(editor: Editor) {
    if (jsLabSaveTimerRef.current !== null) window.clearTimeout(jsLabSaveTimerRef.current)
    jsLabSaveTimerRef.current = window.setTimeout(() => {
      jsLabSaveTimerRef.current = null
      void queueJsLabStore(editor).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'No se pudo guardar el código de JS Lab.')
      })
    }, 350)
  }

  function queueJsLabStore(editor: Editor) {
    const save = jsLabStoreQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await editor.store()
      })
    jsLabStoreQueueRef.current = save
    return save
  }

  useEffect(() => {
    if (!error) return
    const dismissTimer = window.setTimeout(() => setError(null), 5000)
    return () => window.clearTimeout(dismissTimer)
  }, [error])

  useEffect(() => {
    if (
      !canvasRef.current
      || !blocksRef.current
      || !layersRef.current
      || !nativeDevicesRef.current
      || !nativeOptionsRef.current
      || !stylesRef.current
      || !traitsRef.current
      || editorRef.current
    ) return

    let canvasResizeObserver: ResizeObserver | undefined
    const canvasDoubleClickCleanups: Array<() => void> = []
    const canvasDoubleClickDocuments = new WeakSet<Document>()
    const authDoubleClickElements = new WeakSet<HTMLElement>()
    const authTabElements = new WeakSet<HTMLElement>()
    const sectionDoubleClickElements = new WeakSet<HTMLElement>()
    try {
      const editorAccountStoragePlugin = (editor: Editor) => {
        editor.Storage.add('editor-account', {
          async load() {
            try {
              const projectData = isGuest
                ? loadGuestProjectData()
                : await loadEditorProjectData(editorProjectId)
              const restoredLibraries = createProjectExternalLibraries(projectData.externalLibraries ?? [])
              if (!restoredLibraries.ok) {
                setError(`No se pudieron restaurar las bibliotecas: ${restoredLibraries.error}`)
              } else {
                projectExternalLibrariesRef.current = restoredLibraries.value
                setAvailableExternalLibraries(restoredLibraries.value.listLibraries())
              }
              if (projectData.supabaseConfig) {
                const nextConfig = normalizedSupabaseConfig(
                  projectData.supabaseConfig as unknown as SupabaseEditorConfig,
                )
                supabaseConfigRef.current = nextConfig
                setSupabaseConfig(nextConfig)
                storeSupabaseConfig(nextConfig)
              }

              if (projectData.grapesjs && Object.keys(projectData.grapesjs).length > 0) {
                return normalizedGrapesProjectData(projectData.grapesjs)
              }

              const nextConfig = normalizedSupabaseConfig(EMPTY_SUPABASE_CONFIG)
              supabaseConfigRef.current = nextConfig
              setSupabaseConfig(nextConfig)
              storeSupabaseConfig(nextConfig)
            } catch (cause: unknown) {
              setError(cause instanceof Error ? cause.message : 'No se pudo cargar el proyecto guardado.')
            }

            return editor.getProjectData()
          },
          async store(data) {
            try {
              await persistProjectSnapshot(data as Record<string, unknown>)
            } catch (cause: unknown) {
              setError(cause instanceof Error ? cause.message : isGuest
                ? 'No se pudo guardar el proyecto en este navegador.'
                : 'No se pudo guardar el proyecto en tu cuenta.')
            }
            return data
          },
        })
      }

      const editor = grapesjs.init({
        container: canvasRef.current,
        height: '100%',
        width: 'auto',
        panels: { defaults: [] },
        blockManager: {
          appendTo: blocksRef.current,
          appendOnClick: false,
        },
        layerManager: { appendTo: layersRef.current },
        selectorManager: { componentFirst: true },
        styleManager: { appendTo: stylesRef.current },
        traitManager: { appendTo: traitsRef.current },
        colorPicker: {
          appendTo: document.body,
          containerClassName: 'gjs-editor-sp visual-editor-color-picker',
          showInput: true,
          showInitial: true,
          showPalette: true,
          showSelectionPalette: true,
          preferredFormat: 'hex',
          allowEmpty: true,
          maxSelectionSize: 12,
          palette: COLOR_PICKER_PALETTE,
          show: positionColorPicker,
        },
        canvas: {
          infiniteCanvas: true,
        },
        deviceManager: {
          default: 'desktop',
          devices: [
            { id: 'desktop', name: 'Desktop', width: '1280px' },
            { id: 'tablet', name: 'Tablet', width: '768px', widthMedia: '991px' },
            { id: 'mobilePortrait', name: 'Mobile portrait', width: '390px', widthMedia: '767px' },
          ],
        },
        storageManager: {
          type: 'editor-account',
          autosave: true,
          autoload: true,
          stepsBeforeSave: 1,
        },
        plugins: [
          editorAccountStoragePlugin,
          createGridLayoutPlugin,
          createSectionLayoutPlugin,
          createMotionAnalysisPlugin(),
          createExternalFunctionBlocksPlugin(),
          presetWebpage,
          blocksBasic,
          pluginForms,
          starterNavbarPlugin,
          tabs,
          imageEditor,
          touch,
        ],
        pluginsOpts: {
          [presetWebpage as unknown as string]: {
            useCustomTheme: false,
            showStylesOnChange: false,
          },
          [blocksBasic as unknown as string]: {
            flexGrid: true,
          },
          [tabs as unknown as string]: {
            tabsBlock: { category: 'Extra' },
          },
          [imageEditor as unknown as string]: {
            labelImageEditor: 'Editar imagen',
            labelApply: 'Aplicar',
            config: {
              includeUI: { initMenu: 'filter' },
            },
          },
        },
        pageManager: {
          pages: [BLANK_PAGE],
        },
        style: '',
        assetManager: {
          assets: [],
          uploadFile: (event) => {
            const uploadEvent = event as unknown as {
              dataTransfer?: DataTransfer | null
              target?: { files?: FileList | null }
            }
            const files = uploadEvent.dataTransfer?.files ?? uploadEvent.target?.files

            Array.from(files ?? []).forEach((file) => {
              if (!file.type.startsWith('image/')) return
              const reader = new FileReader()
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  editorRef.current?.Assets.add({
                    name: file.name,
                    src: reader.result,
                  })
                }
              }
              reader.readAsDataURL(file)
            })
          },
        },
      })

      // Some GrapesJS plugins initialize their selector settings after the base
      // configuration. Reassert component-first styling so dimensions always
      // belong to the selected component instead of a reusable CSS class.
      editor.SelectorManager.setComponentFirst(true)
      editorRef.current = editor
      editor.Commands.add(BACKGROUND_COLOR_COMMAND, {
        run: (currentEditor) => openDirectComponentColorPicker(currentEditor, 'background-color'),
      })
      editor.Commands.add(BORDER_COLOR_COMMAND, {
        run: (currentEditor) => openDirectComponentColorPicker(currentEditor, 'border-color'),
      })
      editor.Commands.add(CONTAINER_POSITION_COMMAND, {
        run: (currentEditor) => openContainerPositionMenu(currentEditor),
      })
      editor.Commands.add(CONTAINER_HORIZONTAL_POSITION_COMMAND, {
        run: (currentEditor) => openContainerPositionMenu(currentEditor, 'horizontal'),
      })
      const authActionComponentFor = (component?: Component | null) => {
        let current = component ?? null
        while (current) {
          if (readAuthComponentSettings(current.getAttributes())) return current
          current = current.parent() ?? null
        }
        const tabAction = component?.getAttributes()['data-builder-auth-tab']
        return typeof tabAction === 'string'
          ? editor.getWrapper()?.find(`[${AUTH_ACTION_ATTRIBUTE}="${tabAction}"]`)[0] ?? null
          : null
      }
      const openAuthSettingsForComponent = (component?: Component | null) => {
        const authComponent = authActionComponentFor(component)
        const settings = authComponent ? readAuthComponentSettings(authComponent.getAttributes()) : null
        if (!authComponent || !settings) return false
        authSettingsComponentRef.current = authComponent
        editor.select(authComponent)
        setAuthSettings({
          ...settings,
          ...(settings.action === 'signup' && authComponent.getEl()
            ? { metadataFields: readAuthMetadataFields(authComponent.getEl()!) }
            : {}),
        })
        return true
      }
      const dataComponentFor = (component?: Component | null) => {
        let current = component ?? null
        while (current) {
          const attributes = current.getAttributes()
          const classes = current.getClasses()
          if (typeof attributes[DATA_COMPONENT_ATTRIBUTE] === 'string'
            || classes.some((className) => [
              'builder-data-grid',
              'builder-data-carousel',
              'builder-data-list',
              'builder-data-featured',
            ].includes(className))) return current
          current = current.parent() ?? null
        }
        return null
      }
      const openDataSettingsForComponent = (component?: Component | null) => {
        const dataComponent = dataComponentFor(component)
        const element = dataComponent?.getEl() as HTMLElement | undefined
        const settings = element ? readDataComponentSettings(element) : null
        if (!dataComponent || !settings) return false
        editingDataComponentRef.current = dataComponent
        editor.select(dataComponent)
        syncSelectedElement(dataComponent)
        setBlocksOpen(false)
        setLeftPanel('data')
        setDataComponentEditRequest((current) => ({
          ...settings,
          requestId: (current?.requestId ?? 0) + 1,
        }))
        return true
      }
      editor.Commands.add(AUTH_SETTINGS_COMMAND, {
        run: (currentEditor) => openAuthSettingsForComponent(currentEditor.getSelected()),
      })
      editor.Commands.add(DATA_COMPONENT_SETTINGS_COMMAND, {
        run: (currentEditor) => openDataSettingsForComponent(currentEditor.getSelected()),
      })
      editor.Pages.select(BLANK_PAGE.id)
      installInlineTypographyControls(editor)
      editor.BlockManager.get('tabs')?.set('category', 'Extra')

      const authFormStyle = 'display:grid;gap:12px;max-width:420px;padding:24px;background:#fff;border:1px solid #d8e3e1;border-radius:12px'
      const authInputStyle = 'width:100%;min-height:42px;padding:0 12px;border:1px solid #b8c9c6;border-radius:7px'
      const authButtonStyle = 'min-height:42px;padding:0 16px;color:#fff;background:#167f78;border:0;border-radius:7px;font-weight:700;cursor:pointer'
      editor.BlockManager.add('builder-auth-login', {
        label: 'Inicio de sesión',
        category: 'Supabase',
        media: SUPABASE_BLOCK_ICONS.login,
        content: `<form data-builder-auth-action="login" style="${authFormStyle}">
          <h2 style="margin:0">Iniciar sesión</h2>
          <label>Correo<input name="email" type="email" autocomplete="email" required style="${authInputStyle}"></label>
          <label>Contraseña<input name="password" type="password" autocomplete="current-password" required style="${authInputStyle}"></label>
          <button type="submit" style="${authButtonStyle}">Entrar</button>
          <p data-builder-auth-status style="min-height:20px;margin:0" aria-live="polite"></p>
        </form>`,
      })
      editor.BlockManager.add('builder-auth-signup', {
        label: 'Crear cuenta',
        category: 'Supabase',
        media: SUPABASE_BLOCK_ICONS.signup,
        content: `<form data-builder-auth-action="signup" style="${authFormStyle}">
          <h2 style="margin:0">Crear cuenta</h2>
          <label>Correo<input name="email" type="email" autocomplete="email" required style="${authInputStyle}"></label>
          <label>Contraseña<input name="password" type="password" autocomplete="new-password" minlength="6" required style="${authInputStyle}"></label>
          <button type="submit" style="${authButtonStyle}">Registrarme</button>
          <p data-builder-auth-status style="min-height:20px;margin:0" aria-live="polite"></p>
        </form>`,
      })
      editor.BlockManager.add('builder-auth-logout', {
        label: 'Cerrar sesión',
        category: 'Supabase',
        media: SUPABASE_BLOCK_ICONS.logout,
        content: starterNavbarLogoutButton,
      })
      editor.BlockManager.add('builder-auth-email', {
        label: 'Correo del usuario',
        category: 'Supabase',
        media: SUPABASE_BLOCK_ICONS.email,
        content: '<span data-builder-auth-field="email">correo@ejemplo.com</span>',
      })
      editor.BlockManager.add(DATA_COMPONENT_BLOCK_ID, {
        label: 'Datos dinámicos',
        category: 'Supabase',
        attributes: {
          title: 'Añadir tarjetas, carrusel, lista o detalle desde una tabla',
        },
        content: '<section data-builder-data-component-launcher></section>',
        media: SUPABASE_BLOCK_ICONS.data,
        onClick: () => {
          setBlocksOpen(false)
          setLeftPanel('data')
          setDataComponentRequest((current) => current + 1)
        },
      })
      configureStarterBlocks(editor)

      const previewController = createPreviewController({
        onStart: () => {
          try {
            const bundle = editorProjectBundle(
              editor,
              supabaseConfigRef.current,
              projectExternalLibrariesRef.current!.listFunctionRegistrations(),
            )
            const selectedPageId = editor.Pages.getSelected()?.getId()
            setBlocksOpen(false)
            setPreviewSession(createEditorPreviewSession(bundle, selectedPageId))
            setPreviewActive(true)
            setError(null)
            setFlowNotice('Vista previa activa con los mismos datos y conexiones de la exportación.')
            return true
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo iniciar la vista previa.')
            const previewButton = findPreviewButton(editor)
            requestAnimationFrame(() => previewButton?.set('active', false))
            return false
          }
        },
        onStop: () => {
          setPreviewActive(false)
          setPreviewSession(null)
          setFlowNotice('Vista previa finalizada.')
        },
      })
      previewControllerRef.current = previewController
      editor.Commands.add('builder-preview', {
        run: () => previewController.start(),
        stop: () => previewController.stop(),
      })
      editor.Commands.add('builder-export-project', {
        run: async () => {
          try {
            setError(null)
            await exportEditorProject(
              editor,
              supabaseConfigRef.current,
              projectExternalLibrariesRef.current!.listFunctionRegistrations(),
            )
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo exportar el sitio.')
          }
        },
      })

      editor.Panels.addButton('options', {
        id: 'visual-editor-assets',
        command: 'open-assets',
        label: '▧',
        attributes: { title: 'Imágenes', 'aria-label': 'Imágenes' },
      })
      editor.Panels.addButton('options', {
        id: 'visual-editor-export-zip',
        command: 'builder-export-project',
        label: '⇩',
        attributes: { title: 'Exportar ZIP', 'aria-label': 'Exportar ZIP' },
      })
      editor.Panels.getPanel('views')?.set('visible', false)
      editor.Panels.getPanel('commands')?.set('visible', false)

      const syncPages = () => {
        setPages(editorPageSummaries(editor))
        setActivePageId(editor.Pages.getSelected()?.getId() ?? '')
        setActivePageHasAuth(Boolean(editor.getWrapper()?.find(`[${AUTH_ACTION_ATTRIBUTE}]`).length))
      }

      const syncSelectedElement = (component?: Component | null) => {
        const summary = summarizeComponent(component)
        const motionComponent = findMotionActivityComponent(component)
        setSelectedElement(summary)
        setSelectedGridItem(sectionGridFor(component)
          ?? gridItemFor(component)
          ?? (component && isLayoutRow(component) ? component : null))
        setSelectedMotionComponent(motionComponent)
        if (!motionComponent) setMotionNotice('')
        setFlowTargetPageId(summary?.targetPageId ?? '')
        setFlowNavigationDataSourceTableId(summary?.screenFlow?.dataSourceTableId ?? '')
        setFlowNavigationRecordField(summary?.screenFlow?.recordField ?? '')
        setFlowAction(summary?.recordToggle ? 'toggle-record' : summary?.dataAction?.action ?? 'navigate')
        setFlowDataSourceTableId(summary?.recordToggle?.dataSourceTableId ?? summary?.dataAction?.dataSourceTableId ?? '')
        setFlowOwnerField(summary?.recordToggle?.ownerField ?? summary?.dataAction?.ownerField ?? 'user_id')
        setFlowRecordField(summary?.recordToggle?.recordField ?? 'practice_id')
        setFlowActiveLabel(summary?.recordToggle?.activeLabel ?? '★ Guardado')
        setFlowInactiveLabel(summary?.recordToggle?.inactiveLabel ?? '☆ Guardar')
        setFlowFieldMappings(summary?.dataAction?.fieldMappings ?? [])
        setFlowSuccessMessage(summary?.dataAction?.successMessage ?? 'Registro creado.')
        setFlowConfirmMessage(summary?.dataAction?.confirmMessage ?? '')
        setFlowFixedField(summary?.dataAction?.fixedField ?? '')
        setFlowFixedValue(summary?.dataAction?.fixedValue ?? '')
        setFlowRecordMode(summary?.dataAction?.recordMode ?? 'context')
        setFlowValueSource(summary?.dataAction?.valueSource ?? (summary?.dataAction?.fixedValue === '$now' ? 'now' : 'fixed'))
        setFlowValueInputName(summary?.dataAction?.valueInputName ?? '')
        setFlowValueAmount(summary?.dataAction?.valueAmount ?? 1)
        setFlowNotice('')
        setRightPanel((current) => motionComponent
          ? 'motion'
          : summary && ['BUTTON', 'A', 'FORM'].includes(summary.tag)
            ? 'flow'
            : current === 'motion' ? 'properties' : current)
      }
      editor.on(SECTION_LAYOUT_OPEN_EVENT, (component: Component) => {
        editor.select(component)
        syncSelectedElement(component)
        setRightPanel('properties')
      })

      const installDataComponentDoubleClick = () => {
        const canvasDocument = editor.Canvas.getDocument()
        if (!canvasDocument) return
        const root = editor.Pages.getSelected()?.getMainComponent()
        const descendants = (parent: Component): Component[] => parent.components().models.flatMap(
          (child) => [child, ...descendants(child)],
        )
        const pageComponents = root ? [root, ...descendants(root)] : []
        const openAuthComponentOptions = (event: MouseEvent) => {
          const rootElement = event.currentTarget as HTMLElement | null
          if (!rootElement) return
          const authAction = rootElement.getAttribute(AUTH_ACTION_ATTRIBUTE)
          const candidates = editor.getWrapper()?.find(`[${AUTH_ACTION_ATTRIBUTE}]`) ?? []
          const component = candidates.find((candidate) => candidate.getEl() === rootElement
            || Boolean(rootElement.id && (
              candidate.getId() === rootElement.id
              || candidate.getAttributes().id === rootElement.id
            ))) ?? candidates.find((candidate) => candidate.getAttributes()[AUTH_ACTION_ATTRIBUTE] === authAction)
          const settings = component ? readAuthComponentSettings(component.getAttributes()) : null
          if (!component || !settings) return
          event.preventDefault()
          event.stopPropagation()
          authSettingsComponentRef.current = component
          editor.select(component)
          syncSelectedElement(component)
          setAuthSettings({
            ...settings,
            ...(settings.action === 'signup'
              ? { metadataFields: readAuthMetadataFields(rootElement) }
              : {}),
          })
        }
        canvasDocument.querySelectorAll<HTMLElement>('[data-builder-auth-tab]').forEach((tab) => {
          if (authTabElements.has(tab)) return
          authTabElements.add(tab)
          const selectAuthTab = (event: MouseEvent) => {
            event.preventDefault()
            const selected = tab.dataset.builderAuthTab
            const applyCanvasAuthTab = () => {
              const currentTab = [...canvasDocument.querySelectorAll<HTMLElement>('[data-builder-auth-tab]')]
                .find((candidate) => candidate.dataset.builderAuthTab === selected)
              const root = currentTab?.closest('[data-builder-auth-visible="signed-out"]') ?? canvasDocument
              root.querySelectorAll<HTMLElement>('[data-builder-auth-tab]').forEach((candidate) => {
                const active = candidate.dataset.builderAuthTab === selected
                candidate.setAttribute('aria-selected', String(active))
                candidate.setAttribute('tabindex', active ? '0' : '-1')
              })
              root.querySelectorAll<HTMLElement>('[data-builder-auth-panel]').forEach((panel) => {
                panel.hidden = panel.dataset.builderAuthPanel !== selected
              })
            }
            applyCanvasAuthTab()
            requestAnimationFrame(applyCanvasAuthTab)
          }
          tab.addEventListener('click', selectAuthTab, true)
          canvasDoubleClickCleanups.push(() => tab.removeEventListener('click', selectAuthTab, true))
        })
        canvasDocument.querySelectorAll<HTMLElement>(`[${AUTH_ACTION_ATTRIBUTE}]`).forEach((element) => {
          if (authDoubleClickElements.has(element)) return
          authDoubleClickElements.add(element)
          element.setAttribute('data-builder-auth-configurable', 'true')
          if (!element.title) element.title = 'Doble clic para configurar Supabase Auth'
          element.addEventListener('dblclick', openAuthComponentOptions, true)
          canvasDoubleClickCleanups.push(() => element.removeEventListener('dblclick', openAuthComponentOptions, true))
        })
        pageComponents.filter(isSectionGrid).forEach((component) => {
          const element = component.getEl() as HTMLElement | undefined
          if (!element) return
          if (sectionDoubleClickElements.has(element)) return
          sectionDoubleClickElements.add(element)
          if (!element.title) element.title = 'Doble clic para configurar las columnas de esta sección'
          const openSectionLayoutOptions = (event: MouseEvent) => {
            const target = event.target as Element | null
            if (!target
              || isEditableCanvasTarget(target, pageComponents)
              || findDataComponentRoot(target)
              || target.closest?.(`[data-motion-activity],[${AUTH_ACTION_ATTRIBUTE}]`)) return
            event.preventDefault()
            event.stopPropagation()
            editor.select(component)
            syncSelectedElement(component)
            setRightPanel('properties')
          }
          element.addEventListener('dblclick', openSectionLayoutOptions, true)
          canvasDoubleClickCleanups.push(() => element.removeEventListener('dblclick', openSectionLayoutOptions, true))
        })
        canvasDocument.querySelectorAll<HTMLElement>('.builder-navbar-menu-link').forEach((element) => {
          element.dataset.builderNavbarConfigurable = 'true'
          if (!element.title) element.title = 'Doble clic para editar este enlace de navegación'
        })
        if (canvasDoubleClickDocuments.has(canvasDocument)) return
        canvasDoubleClickDocuments.add(canvasDocument)
        const openNavbarLinkOptions = (event: MouseEvent) => {
          const target = event.target as Element | null
          const linkElement = target?.closest?.('.builder-navbar-menu-link') as HTMLElement | null
          if (!linkElement) return
          const currentRoot = editor.Pages.getSelected()?.getMainComponent()
          const currentComponents = currentRoot ? [currentRoot, ...descendants(currentRoot)] : []
          const component = currentComponents.find((candidate) => candidate.getEl() === linkElement)
          if (!component) return
          event.preventDefault()
          event.stopPropagation()
          navbarLinkSettingsComponentRef.current = component
          editor.select(component)
          syncSelectedElement(component)
          setNavbarLinkSettings({
            active: component.getClasses().includes('is-active'),
            label: linkElement.textContent?.trim() || 'Enlace',
          })
        }
        canvasDocument.addEventListener('dblclick', openNavbarLinkOptions, true)
        const openDynamicActionOptions = (event: MouseEvent) => {
          const target = event.target as Element | null
          const actionElement = target?.closest?.(`[${FLOW_ACTION_ATTRIBUTE}="set-record-field"]`) as HTMLElement | null
          if (!actionElement) return
          const component = pageComponents.find((candidate) => candidate.getEl() === actionElement)
          if (!component) return
          event.preventDefault()
          event.stopImmediatePropagation()
          editor.select(component)
          syncSelectedElement(component)
          setRightPanel('flow')
          setDynamicActionDialogOpen(true)
        }
        canvasDocument.addEventListener('dblclick', openDynamicActionOptions, true)
        const openMotionComponentOptions = (event: MouseEvent) => {
          const target = event.target as Element | null
          const rootElement = target?.closest?.(`[data-motion-activity]`) as HTMLElement | null
          if (!rootElement) return
          const component = editor.getWrapper()?.find('[data-motion-activity]')
            .find((candidate) => candidate.getEl() === rootElement)
          if (!component) return
          event.preventDefault()
          event.stopPropagation()
          editor.select(component)
          syncSelectedElement(component)
          setRightPanel('motion')
          setMotionDialogOpen(true)
        }
        canvasDocument.addEventListener('dblclick', openMotionComponentOptions, true)
        canvasDoubleClickCleanups.push(() => {
          canvasDocument.removeEventListener('dblclick', openNavbarLinkOptions, true)
          canvasDocument.removeEventListener('dblclick', openDynamicActionOptions, true)
          canvasDocument.removeEventListener('dblclick', openMotionComponentOptions, true)
        })
      }

      const applyFitViewport = () => {
        if (editor.Canvas.getFrames().length === 0) return
        canvasZoomModeRef.current = 'fit'
        setCanvasZoomMode('fit')
        editor.Canvas.fitViewport({
          gap: { x: 24, y: 24 },
          ignoreHeight: true,
          zoom: clampCanvasZoom,
        })
      }

      const syncPreviewViewport = (device?: Device | null, previousDevice?: Device | null) => {
        const selected = device ?? editor.Devices.getSelected()
        const name = selected?.get('name')?.toLowerCase() ?? 'desktop'
        const width = selected?.get('width')?.trim() || '100%'
        const deviceId = String(selected?.get('id') ?? name)
        const previousDeviceId = previousDevice
          ? String(previousDevice.get('id') ?? previousDevice.get('name') ?? '')
          : currentCanvasDeviceRef.current
        const label = name.includes('mobile')
          ? 'Móvil'
          : name.includes('tablet')
            ? 'Tableta'
            : 'Escritorio'
        setPreviewViewport({ label, width })
        requestAnimationFrame(() => {
          if (previousDevice && previousDeviceId) {
            canvasViewsRef.current.set(previousDeviceId, {
              coords: editor.Canvas.getCoords(),
              mode: canvasZoomModeRef.current,
              zoom: editor.Canvas.getZoom(),
            })
          }

          currentCanvasDeviceRef.current = deviceId
          const savedView = canvasViewsRef.current.get(deviceId)
          if (savedView?.mode === 'manual') {
            canvasZoomModeRef.current = 'manual'
            setCanvasZoomMode('manual')
            editor.Canvas.setZoom(savedView.zoom, { from: 'device-restore' })
            editor.Canvas.setCoords(savedView.coords.x, savedView.coords.y)
          } else {
            applyFitViewport()
          }
        })
      }

      const moveNativePanel = (panelId: string, target: HTMLElement) => {
        const panel = editor.Panels.getPanel(panelId)
        const element = panel?.view?.el as HTMLElement | undefined
        if (!element) return
        element.classList.add('gjs-native-toolbar-panel')
        target.append(element)
      }

      const stabilizeEditorCanvas = () => {
        const canvasDocument = editor.Canvas.getDocument()
        const visibleCanvasHeight = canvasColumnRef.current?.clientHeight ?? DEFAULT_EDITOR_VIEWPORT_HEIGHT_CAP
        const heightCap = Math.min(960, Math.max(480, visibleCanvasHeight))
        if (!canvasDocument) return
        const guardedLayoutCount = installEditorCanvasLayoutGuards(canvasDocument, heightCap)
        const frameHeight = editor.Canvas.getFrameEl()?.getBoundingClientRect().height ?? 0
        if (guardedLayoutCount === 0 && frameHeight > 0) return
        canvasViewsRef.current.clear()
        editor.Canvas.setCoords(0, 0)
        requestAnimationFrame(() => {
          editor.Canvas.setCoords(0, 0)
          applyFitViewport()
        })
      }

      const installEditorViewport = () => {
        const canvasDocument = editor.Canvas.getDocument()
        const visibleCanvasHeight = canvasColumnRef.current?.clientHeight ?? DEFAULT_EDITOR_VIEWPORT_HEIGHT_CAP
        const heightCap = Math.min(960, Math.max(480, visibleCanvasHeight))
        if (canvasDocument) installEditorCanvasLayoutGuards(canvasDocument, heightCap)
      }
      const installJsLabCanvasEditing = () => {
        const canvasDocument = editor.Canvas.getDocument()
        if (!canvasDocument || canvasDocument.documentElement.dataset.builderJsLabEditing === 'true') return
        canvasDocument.documentElement.setAttribute('data-builder-js-lab-editing', 'true')
        canvasDocument.addEventListener('input', (event) => {
          const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
          const labElement = target?.closest?.('[data-builder-js-lab]')
          const lab = labElement ? findJsLab(editor) : undefined
          if (!target || !lab) return
          if (target.hasAttribute(JS_LAB_CODE_EDITOR_ATTRIBUTE)) {
            updateJsLabScript(lab, { code: target.value })
          } else return
          scheduleJsLabSave(editor)
        }, true)
      }
      const handleCanvasBodyLoad = () => {
        stabilizeEditorCanvas()
        installGridEditorStyles(editor)
        installDataComponentDoubleClick()
        installJsLabCanvasEditing()
      }
      editor.on('canvas:frame:load:head', installEditorViewport)
      editor.on('canvas:frame:load:body', handleCanvasBodyLoad)
      editor.onReady(() => {
        editor.SelectorManager.setComponentFirst(true)
        const migratedNavbarClassCount = normalizeStarterNavbars(editor)
        const hadStartPage = editor.Pages.getAll().some((page) => page.get('isStartPage') === true)
        ensureEditorStartPage(editor)
        syncPages()
        syncPreviewViewport()
        const initialPageGrid = ensurePageGrid(editor)
        if (migratedNavbarClassCount > 0 || !hadStartPage) void editor.store()
        const selectedRoot = editor.Pages.getSelected()?.getMainComponent()
        if (selectedRoot) disableCanvasResizing(selectedRoot)
        const savedSiteMargin = readSiteMargin(editor)
        editor.Css.addRules(GRID_LAYOUT_STYLES)
        setSiteMargin(updateSiteMargin(editor, savedSiteMargin))
        editor.Css.addRules(dataComponentStyles)
        editor.Css.addRules(INTERACTION_STYLES)
        editor.Css.addRules(SECTION_LAYOUT_STYLES)
        installGridEditorStyles(editor)
        installEditorViewport()
        stabilizeEditorCanvas()
        installDataComponentDoubleClick()
        installJsLabCanvasEditing()
        if (ensureDataDesignPlaceholders(editor) > 0) {
          void editor.store().catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los espacios de diseño.')
          })
        }
        if (initialPageGrid) {
          void editor.store().catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : 'No se pudo guardar la cuadrícula inicial.')
          })
        }
        editor.stopCommand('open-sm')
        editor.stopCommand('core:preview')
        const previewButton = findPreviewButton(editor)
        if (previewButton) {
          previewButton.set('active', false)
          previewButton.set('command', 'builder-preview')
          previewButton.set('togglable', true)
          previewButton.set('attributes', {
            title: 'Vista previa',
            'aria-label': 'Vista previa',
          })
        }
        const fullscreenButton = editor.Panels.getButton('options', 'fullscreen')
        if (fullscreenButton && canvasColumnRef.current) {
          fullscreenButton.set('options', { target: canvasColumnRef.current })
          fullscreenButton.set('attributes', {
            title: 'Pantalla completa',
            'aria-label': 'Pantalla completa',
          })
        }
        ;[
          ['set-device-desktop', 'Escritorio · 1280 px'],
          ['set-device-tablet', 'Tableta · 768 px'],
          ['set-device-mobile', 'Móvil · 390 px'],
        ].forEach(([id, label]) => {
          editor.Panels.getButton('devices-c', id)?.set('attributes', {
            title: label,
            'aria-label': label,
          })
        })
        editor.Panels.getButton('views', 'open-sm')?.set('active', false)
        editor.Panels.removePanel('views-container')
        moveNativePanel('devices-c', nativeDevicesRef.current!)
        moveNativePanel('options', nativeOptionsRef.current!)
      })
      editor.on('page:add', syncPages)
      editor.on('page:remove', syncPages)
      editor.on('page:select', () => {
        syncPages()
        const pageGrid = ensurePageGrid(editor)
        const selectedRoot = editor.Pages.getSelected()?.getMainComponent()
        if (selectedRoot) disableCanvasResizing(selectedRoot)
        if (pageGrid) {
          void editor.store().catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : 'No se pudo guardar la cuadrícula de la página.')
          })
        }
        requestAnimationFrame(() => {
          installGridEditorStyles(editor)
          installDataComponentDoubleClick()
          installJsLabCanvasEditing()
        })
      })
      editor.on('page:update', syncPages)
      editor.on('device:select', (device: Device | null | undefined, previousDevice: Device | null | undefined) => {
        syncPreviewViewport(device, previousDevice)
      })
      editor.on('canvas:zoom', ({ options }: { options?: { from?: string } }) => {
        const zoom = clampCanvasZoom(editor.Canvas.getZoom())
        if (zoom !== editor.Canvas.getZoom()) {
          editor.Canvas.setZoom(zoom, { from: 'zoom-clamp' })
          return
        }
        setCanvasZoom(zoom)
        if (options?.from !== 'fitViewport') {
          canvasZoomModeRef.current = 'manual'
          setCanvasZoomMode('manual')
        }
      })
      const showSelectedAuthCanvasTab = (component: Component) => {
        const selected = component.getAttributes()['data-builder-auth-tab']
          ?? (component.getEl() as HTMLElement | undefined)?.dataset.builderAuthTab
        if (typeof selected !== 'string' || !selected) return
        editor.getWrapper()?.find('[data-builder-auth-tab]').forEach((candidate) => {
          const active = candidate.getAttributes()['data-builder-auth-tab'] === selected
          candidate.addAttributes({ 'aria-selected': String(active), tabindex: active ? '0' : '-1' })
        })
        editor.getWrapper()?.find('[data-builder-auth-panel]').forEach((panel) => {
          if (panel.getAttributes()['data-builder-auth-panel'] === selected) panel.removeAttributes('hidden')
          else panel.addAttributes({ hidden: true })
        })
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const canvasDocument = editor.Canvas.getDocument()
          if (!canvasDocument) return
          const currentTab = [...canvasDocument.querySelectorAll<HTMLElement>('[data-builder-auth-tab]')]
            .find((candidate) => candidate.dataset.builderAuthTab === selected)
          const root = currentTab?.closest('[data-builder-auth-visible="signed-out"]') ?? canvasDocument
          root.querySelectorAll<HTMLElement>('[data-builder-auth-tab]').forEach((candidate) => {
            const active = candidate.dataset.builderAuthTab === selected
            candidate.setAttribute('aria-selected', String(active))
            candidate.setAttribute('tabindex', active ? '0' : '-1')
          })
          root.querySelectorAll<HTMLElement>('[data-builder-auth-panel]').forEach((panel) => {
            panel.hidden = panel.dataset.builderAuthPanel !== selected
          })
        }))
      }
      editor.on('component:selected', (component: Component) => {
        component.set('resizable', false)
        addComponentPositionToolbar(component)
        addComponentColorToolbar(component)
        if (dataComponentFor(component)) {
          component.initToolbar()
          const toolbar = [...(component.get('toolbar') ?? [])] as ToolbarButtonProps[]
          if (!toolbar.some((item) => item.id === DATA_COMPONENT_SETTINGS_COMMAND)) {
            const deleteIndex = toolbar.findIndex((item) => item.command === 'tlb-delete')
            toolbar.splice(deleteIndex < 0 ? toolbar.length : deleteIndex, 0, {
              id: DATA_COMPONENT_SETTINGS_COMMAND,
              command: DATA_COMPONENT_SETTINGS_COMMAND,
              label: DATA_COMPONENT_SETTINGS_ICON,
              attributes: {
                'aria-label': 'Editar datos de esta tarjeta',
                title: 'Editar datos de esta tarjeta',
              },
            })
            component.set('toolbar', toolbar)
          }
        }
        if (authActionComponentFor(component)) {
          component.initToolbar()
          const toolbar = [...(component.get('toolbar') ?? [])] as ToolbarButtonProps[]
          if (!toolbar.some((item) => item.id === AUTH_SETTINGS_COMMAND)) {
            const deleteIndex = toolbar.findIndex((item) => item.command === 'tlb-delete')
            toolbar.splice(deleteIndex < 0 ? toolbar.length : deleteIndex, 0, {
              id: AUTH_SETTINGS_COMMAND,
              command: AUTH_SETTINGS_COMMAND,
              label: AUTH_SETTINGS_ICON,
              attributes: {
                'aria-label': 'Configurar Supabase Auth',
                title: 'Configurar Supabase Auth',
              },
            })
            component.set('toolbar', toolbar)
          }
        }
        syncSelectedElement(component)
        showSelectedAuthCanvasTab(component)
        requestAnimationFrame(() => {
          const toolbar = editor.Canvas.getToolsEl()?.querySelector('.gjs-toolbar') as HTMLElement | null
          const bounds = canvasColumnRef.current?.getBoundingClientRect()
          if (toolbar && bounds) keepToolbarInsideBounds(toolbar, bounds)
        })
      })
      editor.on('component:deselected', () => {
        syncSelectedElement(editor.getSelected())
      })
      editor.on('component:add', (component: Component) => requestAnimationFrame(() => {
        disableCanvasResizing(component)
        installDataComponentDoubleClick()
      }))
      const keepCanvasToolbarsVisible = () => requestAnimationFrame(() => {
        const bounds = canvasColumnRef.current?.getBoundingClientRect()
        if (!bounds) return
        const componentToolbar = editor.Canvas.getToolsEl()?.querySelector('.gjs-toolbar') as HTMLElement | null
        const textToolbar = editor.RichTextEditor.getToolbarEl()
        if (componentToolbar) keepToolbarInsideBounds(componentToolbar, bounds)
        if (textToolbar) keepToolbarInsideBounds(textToolbar, bounds)
      })
      editor.on('rte:enable', () => requestAnimationFrame(() => {
        const toolbar = editor.RichTextEditor.getToolbarEl()
        const canvasBounds = canvasColumnRef.current?.getBoundingClientRect()
        if (canvasBounds) keepToolbarInsideBounds(toolbar, canvasBounds)
      }))
      editor.on('canvas:scroll', keepCanvasToolbarsVisible)
      editor.on('component:remove', (removedComponent: Component, options?: { action?: string }) => requestAnimationFrame(() => {
        if (editorRef.current !== editor) return
        if (options?.action === 'move-component') return
        const removedPageGrid = isPageGrid(removedComponent)
        const pageGrid = ensurePageGrid(editor)
        const addedSlotCount = ensureGridSlots(editor)
        installGridEditorStyles(editor)
        if (pageGrid && (removedPageGrid || addedSlotCount > 0)) {
          void editor.store().catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : 'No se pudo restaurar la cuadrícula de la página.')
          })
        }
      }))
      const completeBlockInsertion = (component: Component, block: Block) => {
        setBlocksOpen(false)
        if (block.getId() === JS_LAB_BLOCK_ID) {
          const existingLab = findJsLab(editor)
          if (existingLab && existingLab !== component) {
            component.remove()
            editor.select(existingLab)
          } else {
            editor.select(component)
          }
          setRightPanel('properties')
        }
        if ([
          MOTION_VIEW_REFERENCE_BLOCK_ID,
          MOTION_ANALYSIS_BLOCK_ID,
        ].includes(block.getId())) {
          editor.select(component)
          setRightPanel('motion')
          setMotionDialogOpen(true)
        }
        if (block.getId() === DATA_COMPONENT_BLOCK_ID) {
          component.remove()
          setLeftPanel('data')
          setDataComponentRequest((current) => current + 1)
          return
        }
        void editor.store().catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : 'No se pudo guardar el elemento añadido.')
        })
      }
      editor.on('block:click', (block: Block) => {
        draggedBlockRef.current = null
        setBlockDropActive(false)
        if (block.getId() === JS_LAB_BLOCK_ID) {
          const lab = ensureJsLab(editor).component
          editor.select(lab)
          setBlocksOpen(false)
          setRightPanel('properties')
          void editor.store().catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : 'No se pudo guardar JS Lab.')
          })
          return
        }
        const blockContent = block.getContent()
        const content = typeof blockContent === 'function' ? blockContent() : blockContent
        if (!content) return
        const component = appendGridItem(editor, content)
        if (component) {
          editor.select(component)
          completeBlockInsertion(component, block)
        }
      })
      editor.on('block:drag:start', (block: Block) => {
        draggedBlockRef.current = block
        setBlockDropActive(true)
      })
      editor.on('block:drag:stop', (component: Component | undefined, block: Block) => {
        draggedBlockRef.current = null
        setBlockDropActive(false)
        if (!component) return
        placeComponentInGrid(editor, component)
        completeBlockInsertion(component, block)
      })
      if (typeof ResizeObserver !== 'undefined' && canvasColumnRef.current) {
        canvasResizeObserver = new ResizeObserver(() => {
          if (canvasZoomModeRef.current === 'fit') applyFitViewport()
        })
        canvasResizeObserver.observe(canvasColumnRef.current)
      }

      const isTextInput = (target: EventTarget | null) => {
        const element = target instanceof HTMLElement ? target : null
        return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'))
      }
      const startTemporaryPan = (event: KeyboardEvent) => {
        if (event.code !== 'Space' || event.repeat || isTextInput(event.target) || editor.Canvas.isInputFocused()) return
        event.preventDefault()
        if (!editor.Commands.isActive('core:canvas-move')) editor.runCommand('core:canvas-move')
        setPanToolActive(true)
      }
      const stopTemporaryPan = (event: KeyboardEvent) => {
        if (event.code !== 'Space' || panToolLockedRef.current) return
        editor.stopCommand('core:canvas-move')
        setPanToolActive(false)
      }
      window.addEventListener('keydown', startTemporaryPan)
      window.addEventListener('keyup', stopTemporaryPan)

      const removePanShortcuts = () => {
        window.removeEventListener('keydown', startTemporaryPan)
        window.removeEventListener('keyup', stopTemporaryPan)
      }
      ;(editor as Editor & { __removePanShortcuts?: () => void }).__removePanShortcuts = removePanShortcuts
      ;(editor as Editor & { __removeCanvasGestures?: () => void }).__removeCanvasGestures = attachCanvasGestures(
        editor,
        () => {
          canvasZoomModeRef.current = 'manual'
          setCanvasZoomMode('manual')
        },
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar el editor.')
    }

    return () => {
      if (jsLabSaveTimerRef.current !== null) {
        window.clearTimeout(jsLabSaveTimerRef.current)
        jsLabSaveTimerRef.current = null
      }
      canvasResizeObserver?.disconnect()
      canvasDoubleClickCleanups.forEach((cleanup) => cleanup())
      ;(editorRef.current as (Editor & { __removePanShortcuts?: () => void }) | null)?.__removePanShortcuts?.()
      ;(editorRef.current as (Editor & { __removeCanvasGestures?: () => void }) | null)?.__removeCanvasGestures?.()
      previewControllerRef.current?.stop()
      previewControllerRef.current = null
      editorRef.current?.destroy()
      editorRef.current = null
    }
  }, [editorProjectId])

  useEffect(() => {
    if (!blocksOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBlocksOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [blocksOpen])

  useEffect(() => {
    if (!blockDropActive) return
    const clearAbandonedDrop = (event: Event) => {
      const target = event.target
      if (target instanceof Element && target.closest('.gjs-canvas-block-drop')) return
      draggedBlockRef.current = null
      setBlockDropActive(false)
    }
    window.addEventListener('dragend', clearAbandonedDrop)
    window.addEventListener('pointerup', clearAbandonedDrop)
    return () => {
      window.removeEventListener('dragend', clearAbandonedDrop)
      window.removeEventListener('pointerup', clearAbandonedDrop)
    }
  }, [blockDropActive])

  function beginBlockPointerDrag(target: EventTarget | null) {
    const editor = editorRef.current
    const blockElement = target instanceof Element ? target.closest('.gjs-block') : null
    if (!editor || !blockElement) return
    const title = blockElement.getAttribute('title') ?? ''
    const block = editor.BlockManager.getAll().models.find((candidate) => {
      const attributes = candidate.get('attributes') as { title?: string } | undefined
      return String(attributes?.title ?? candidate.getLabel()) === title
    })
    if (!block) return
    draggedBlockRef.current = block
    setBlockDropActive(true)
  }

  function dropBlockOnCanvas() {
    const editor = editorRef.current
    const block = draggedBlockRef.current
    draggedBlockRef.current = null
    setBlockDropActive(false)
    if (!editor || !block) return
    if (block.getId() === JS_LAB_BLOCK_ID) {
      const lab = ensureJsLab(editor).component
      editor.select(lab)
      setBlocksOpen(false)
      setRightPanel('properties')
      void editor.store().catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'No se pudo guardar JS Lab.')
      })
      return
    }

    const blockContent = block.getContent()
    const content = typeof blockContent === 'function' ? blockContent() : blockContent
    if (!content) return
    const component = appendGridItem(editor, content)
    if (!component) return

    editor.select(component)
    setBlocksOpen(false)
    if ([
      MOTION_VIEW_REFERENCE_BLOCK_ID,
      MOTION_ANALYSIS_BLOCK_ID,
    ].includes(block.getId())) {
      setRightPanel('motion')
      setMotionDialogOpen(true)
    }
    if (block.getId() === DATA_COMPONENT_BLOCK_ID) {
      component.remove()
      setLeftPanel('data')
      setDataComponentRequest((current) => current + 1)
    }
  }

  function setManualCanvasZoom(nextZoom: number) {
    const editor = editorRef.current
    if (!editor) return
    canvasZoomModeRef.current = 'manual'
    setCanvasZoomMode('manual')
    editor.Canvas.setZoom(clampCanvasZoom(nextZoom), { from: 'zoom-toolbar' })
  }

  function fitCanvasToWorkspace() {
    const editor = editorRef.current
    if (!editor) return
    canvasZoomModeRef.current = 'fit'
    setCanvasZoomMode('fit')
    editor.Canvas.fitViewport({
      gap: { x: 24, y: 24 },
      ignoreHeight: true,
      zoom: clampCanvasZoom,
    })
  }

  function toggleCanvasPanTool() {
    const editor = editorRef.current
    if (!editor) return
    const nextActive = !panToolLockedRef.current
    panToolLockedRef.current = nextActive
    setPanToolActive(nextActive)
    if (nextActive) editor.runCommand('core:canvas-move')
    else editor.stopCommand('core:canvas-move')
  }

  function selectPage(pageId: string) {
    setPageAccessMenuOpen(false)
    editorRef.current?.Pages.select(pageId)
  }

  function movePageTo(pageId: string, targetPageId: string, position: 'before' | 'after') {
    const editor = editorRef.current
    if (!editor || pageId === targetPageId) return
    const allPages = editor.Pages.getAll()
    const sourceIndex = allPages.findIndex((page) => page.getId() === pageId)
    const targetIndex = allPages.findIndex((page) => page.getId() === targetPageId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const destination = Math.min(
      allPages.length - 1,
      reorderedPageIndex(sourceIndex, targetIndex, position),
    )
    editor.Pages.move(pageId, { at: destination })
    setPages(editorPageSummaries(editor))
    setDraggingPageId(null)
    setPageDropTarget(null)
    setPageMenuId(null)
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el orden de las páginas.')
    })
  }

  function movePageBy(pageId: string, offset: -1 | 1) {
    const allPages = editorRef.current?.Pages.getAll() ?? []
    const sourceIndex = allPages.findIndex((page) => page.getId() === pageId)
    const target = allPages[sourceIndex + offset]
    if (sourceIndex < 0 || !target) return
    movePageTo(pageId, target.getId(), offset < 0 ? 'before' : 'after')
  }

  function setActivePageAccess(access: Exclude<EditorPageAccess, 'guestOnly'>) {
    const editor = editorRef.current
    const page = editor?.Pages.get(activePageId)
    if (!editor || !page) return
    page.set('access', access)
    if (access !== 'role') page.set('roles', [])
    setPages(editorPageSummaries(editor))
    if (access !== 'role') setPageAccessMenuOpen(false)
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el acceso de la página.')
    })
  }

  function setActivePageRoles(value: string) {
    const editor = editorRef.current
    const page = editor?.Pages.get(activePageId)
    if (!editor || !page) return
    const roles = [...new Set(value.split(',').map((role) => role.trim()).filter(Boolean))]
    page.set('roles', roles)
    setPages(editorPageSummaries(editor))
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los roles de la página.')
    })
  }

  function uniquePageId(prefix = 'page') {
    const editor = editorRef.current
    let candidate = `${prefix}-${crypto.randomUUID?.() ?? Date.now().toString(36)}`
    while (editor?.Pages.get(candidate)) candidate = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    return candidate
  }

  function renamePage(pageId: string) {
    const editor = editorRef.current
    const page = editor?.Pages.get(pageId)
    if (!editor || !page) return
    setRenamingPage({ id: pageId, name: page.getName() || 'Sin título' })
  }

  function savePageName(nextName: string) {
    const editor = editorRef.current
    const page = renamingPage ? editor?.Pages.get(renamingPage.id) : undefined
    if (!editor || !page) return
    page.setName(nextName)
    setRenamingPage(null)
    setPages(editorPageSummaries(editor))
    void editor.store()
  }

  function duplicatePage(pageId: string) {
    const editor = editorRef.current
    const page = editor?.Pages.get(pageId)
    const component = page?.getMainComponent()
    if (!editor || !page || !component) return
    const name = `${page.getName() || 'Página'} copia`
    editor.Pages.add({
      id: uniquePageId('copy'),
      name,
      access: page.get('access'),
      roles: page.get('roles'),
      component: editor.getHtml({ component }),
      styles: editor.getCss({ component, keepUnusedStyles: true }),
    }, { select: true })
    void editor.store()
  }

  function deletePage(pageId: string) {
    const editor = editorRef.current
    const page = editor?.Pages.get(pageId)
    if (!editor || !page) return
    if (editor.Pages.getAll().length === 1) {
      window.alert('El proyecto debe conservar al menos una página.')
      return
    }

    const inboundConnections = editor.Pages.getAll().flatMap((candidate) => (
      candidate.getMainComponent()?.find(`[${FLOW_TARGET_ATTRIBUTE}="${pageId}"]`) ?? []
    ))
    const inboundAuthDestinations = editor.Pages.getAll().flatMap((candidate) => (
      candidate.getMainComponent()?.find(`[${AUTH_DESTINATION_ATTRIBUTE}="${pageId}"]`) ?? []
    ))
    const linkedCount = inboundConnections.length + inboundAuthDestinations.length
    const connectionWarning = linkedCount
      ? `\n\nTambién se eliminarán ${linkedCount} destinos configurados que apuntan a esta página.`
      : ''
    if (!window.confirm(`¿Eliminar “${page.getName() || 'Sin título'}”? Esta acción no se puede deshacer.${connectionWarning}`)) return

    inboundConnections.forEach((component) => {
      component.removeAttributes([
        FLOW_ACTION_ATTRIBUTE,
        FLOW_TARGET_ATTRIBUTE,
        FLOW_DATA_SOURCE_ATTRIBUTE,
        FLOW_RECORD_FIELD_ATTRIBUTE,
      ])
    })
    inboundAuthDestinations.forEach((component) => component.removeAttributes(AUTH_DESTINATION_ATTRIBUTE))
    const fallback = editor.Pages.getAll().find((candidate) => candidate.getId() !== pageId)
    if (editor.Pages.getSelected()?.getId() === pageId && fallback) editor.Pages.select(fallback)
    editor.Pages.remove(page)
    ensureEditorStartPage(editor)
    setPages(editorPageSummaries(editor))
    void editor.store()
  }

  function importPages(drafts: ImportedPageDraft[]) {
    const editor = editorRef.current
    if (!editor) return
    let firstImportedId = ''
    drafts.forEach((draft) => {
      const id = uniquePageId('import')
      const prepared = prepareImportedPage(draft, id)
      editor.Pages.add({
        id: prepared.id,
        name: prepared.name,
        component: prepared.html,
        styles: prepared.css,
      })
      if (!firstImportedId) firstImportedId = id
    })
    if (firstImportedId) editor.Pages.select(firstImportedId)
    setPageImportOpen(false)
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar las páginas importadas.')
    })
  }

  const availableFlowPages = pages.filter((page) => page.id !== activePageId)
  const resolvedFlowTargetPageId = availableFlowPages.some((page) => page.id === flowTargetPageId)
    ? flowTargetPageId
    : availableFlowPages[0]?.id ?? ''
  const flowNavigationSourceTableId = selectedElement?.repeaterTableId
    ?? selectedElement?.inheritedRepeaterTableId
  const flowNavigationSourceTable = supabaseConfig.tables.find((table) =>
    table.id === flowNavigationSourceTableId)
  const flowNavigationRelatedRecords = (flowNavigationSourceTable?.relations ?? []).flatMap((relation) => {
    const target = supabaseConfig.tables.find((table) => table.id === relation.targetTableId)
    return target && target.access !== 'private' ? [{ relation, target }] : []
  })
  const resolvedFlowNavigationRecord = flowNavigationRelatedRecords.find(({ relation, target }) =>
    relation.column === flowNavigationRecordField && target.id === flowNavigationDataSourceTableId)
  const writableFlowTables = supabaseConfig.tables.filter((table) => table.access === 'user_owned')
  const singleUserFlowTables = writableFlowTables.filter((table) => table.recordMode === 'single_per_user')
  const managedFlowTables = (action: 'select' | 'insert' | 'update' | 'delete') =>
    supabaseConfig.tables.filter((table) => table.management?.actions.includes(action))
  const uniqueFlowTables = (tables: typeof supabaseConfig.tables) => [...new Map(
    tables.map((table) => [table.id, table]),
  ).values()]
  const detectedContextTableIds = [...new Set([
    ...(selectedElement?.inheritedRepeaterTableId ? [selectedElement.inheritedRepeaterTableId] : []),
    ...incomingRecordTableIds(editorRef.current, activePageId),
  ])]
  const canUpdateTable = (table: (typeof supabaseConfig.tables)[number]) =>
    table.access === 'user_owned' || Boolean(table.management?.actions.includes('update'))
  const dynamicContextTables = supabaseConfig.tables.filter((table) =>
    detectedContextTableIds.includes(table.id) && canUpdateTable(table))
  const dynamicCurrentUserTables = singleUserFlowTables
  const recordActionFlowTables = flowAction === 'save-current-user-record'
    ? singleUserFlowTables
    : flowAction === 'set-record-field' ? uniqueFlowTables([...dynamicContextTables, ...dynamicCurrentUserTables])
      : flowAction === 'create-record' ? uniqueFlowTables([...writableFlowTables, ...managedFlowTables('insert')])
        : flowAction === 'update-record' ? uniqueFlowTables([...writableFlowTables, ...managedFlowTables('update')])
          : flowAction === 'delete-record' ? uniqueFlowTables([...writableFlowTables, ...managedFlowTables('delete')])
            : writableFlowTables
  const resolvedFlowDataSourceTableId = recordActionFlowTables.some((table) =>
    table.id === flowDataSourceTableId)
    ? flowDataSourceTableId
    : recordActionFlowTables.find((table) => /favorite/i.test(table.name))?.id
      ?? recordActionFlowTables[0]?.id
      ?? ''
  const flowDataSourceTable = recordActionFlowTables.find((table) =>
    table.id === resolvedFlowDataSourceTableId)
  const isFlowRoleTable = Boolean(flowDataSourceTable
    && /(^|_)roles?($|_)/i.test(flowDataSourceTable.name)
    && flowDataSourceTable.fields.some((field) => field.name === 'role'))
  const flowFieldNames = [...new Set([
    ...(flowAction === 'set-record-field' && flowDataSourceTable
      ? builtInFields(flowDataSourceTable.access).filter((field) => field === 'published')
      : []),
    ...(isFlowRoleTable && (flowAction === 'create-record' || flowAction === 'update-record')
      ? ['user_id']
      : []),
    ...(flowDataSourceTable?.fields.map((field) => field.name) ?? []),
    ...(flowDataSourceTable?.verifiedSchema?.fields.map((field) => field.name) ?? []),
  ])]
  const flowInputNames = formInputNames(editorRef.current?.getSelected())
  const resolvedFlowFieldMappings = flowFieldMappings.filter((mapping) =>
    flowFieldNames.includes(mapping.field) && flowInputNames.includes(mapping.inputName))
  const isRecordDataAction = flowAction === 'create-record'
    || flowAction === 'update-record'
    || flowAction === 'delete-record'
    || flowAction === 'save-current-user-record'
    || flowAction === 'set-record-field'

  function addCurrentUserFormFields() {
    const editor = editorRef.current
    let form = editor?.getSelected() ?? null
    while (form && String(form.get('tagName')).toUpperCase() !== 'FORM') form = form.parent() ?? null
    if (!editor || !form || !flowDataSourceTable) return
    const existingNames = new Set(formInputNames(form))
    const missingFields = flowDataSourceTable.fields.filter((field) => !existingNames.has(field.name))
    const submitButton = form.find('button[type="submit"]')[0]
    const at = submitButton?.index()
    missingFields.forEach((field, index) => {
      const label = field.name.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
      const relation = flowDataSourceTable.relations.find((candidate) =>
        candidate.column === field.name && candidate.targetTableId !== 'auth.users')
      const relationTarget = relation
        ? supabaseConfig.tables.find((candidate) => candidate.id === relation.targetTableId)
        : undefined
      const control = field.type === 'long_text' || field.type === 'json'
        ? { tagName: 'textarea', attributes: { name: field.name, rows: '4' } }
        : relation && relationTarget ? {
          tagName: 'select',
          attributes: {
            name: field.name,
            'data-builder-relation-source': supabaseDataSourceId(relationTarget.id),
            'data-builder-relation-label': relationDisplayField(supabaseConfig, relation),
            'data-builder-relation-value': relation.targetColumn,
          },
          components: [{ tagName: 'option', attributes: { value: '' }, components: `Selecciona ${collectionDisplayName(relationTarget)}` }],
        }
        : field.upload ? {
          tagName: 'input',
          attributes: {
            accept: uploadAccept(field.upload.kind),
            name: field.name,
            type: 'file',
            ...(field.type === 'media_list' ? { multiple: 'multiple' } : {}),
            'data-builder-upload-bucket': field.upload.bucket,
            'data-builder-upload-kind': field.upload.kind,
            'data-builder-upload-max-bytes': String(Math.round(field.upload.maxSizeMb * 1024 * 1024)),
          },
        }
        : {
          tagName: 'input',
          attributes: {
            name: field.name,
            type: field.type === 'number' ? 'number'
              : field.type === 'boolean' ? 'checkbox'
                : field.type === 'date' ? 'date'
                  : field.type === 'datetime' ? 'datetime-local'
                    : field.type === 'url' || field.type === 'media' ? 'url' : 'text',
          },
        }
      form.append({
        tagName: 'label',
        attributes: { class: 'builder-current-user-field' },
        components: field.type === 'boolean'
          ? [control, { tagName: 'span', components: label }]
          : [{ tagName: 'span', components: label }, control],
      }, at === undefined ? undefined : { at: at + index })
    })
    const nextMappings = flowDataSourceTable.fields.map((field) => ({
      field: field.name,
      inputName: field.name,
    }))
    setFlowFieldMappings(nextMappings)
    setSelectedElement(summarizeComponent(form))
    setFlowNotice(missingFields.length
      ? `Se añadieron ${missingFields.length} campos. Puedes cambiar su diseño en el lienzo.`
      : 'Todos los campos de esta colección ya están en el formulario.')
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudieron añadir los campos.')
    })
  }

  function saveDynamicFieldAction(draft: DynamicFieldActionDraft) {
    const editor = editorRef.current
    const component = editor?.getSelected()
    if (!editor || !component || !draft.tableId || !draft.field) return
    component.removeAttributes([
      FLOW_ACTION_ATTRIBUTE,
      FLOW_TARGET_ATTRIBUTE,
      FLOW_DATA_SOURCE_ATTRIBUTE,
      FLOW_OWNER_FIELD_ATTRIBUTE,
      FLOW_RECORD_FIELD_ATTRIBUTE,
      FLOW_CONTEXT_ATTRIBUTE,
      FLOW_ACTIVE_LABEL_ATTRIBUTE,
      FLOW_INACTIVE_LABEL_ATTRIBUTE,
      FLOW_FIELD_MAP_ATTRIBUTE,
      FLOW_FIXED_FIELD_ATTRIBUTE,
      FLOW_FIXED_VALUE_ATTRIBUTE,
      FLOW_RECORD_MODE_ATTRIBUTE,
      FLOW_VALUE_SOURCE_ATTRIBUTE,
      FLOW_VALUE_INPUT_ATTRIBUTE,
      FLOW_VALUE_AMOUNT_ATTRIBUTE,
      FLOW_SUCCESS_MESSAGE_ATTRIBUTE,
      FLOW_CONFIRM_MESSAGE_ATTRIBUTE,
    ])
    component.addAttributes(dataActionAttributes({
      action: 'set-record-field',
      dataSourceTableId: draft.tableId,
      contextKey: 'record',
      fieldMappings: [],
      fixedField: draft.field,
      fixedValue: draft.fixedValue,
      recordMode: draft.recordMode,
      valueSource: draft.valueSource,
      ...(draft.valueSource === 'form' ? { valueInputName: draft.valueInputName } : {}),
      ...(draft.valueSource === 'increment' ? { valueAmount: draft.valueAmount } : {}),
      ...(draft.recordMode === 'current_user' ? { ownerField: 'user_id' } : {}),
      successMessage: draft.successMessage.trim() || 'Información actualizada.',
      ...(draft.confirmMessage.trim() ? { confirmMessage: draft.confirmMessage.trim() } : {}),
    }))
    setFlowAction('set-record-field')
    setFlowDataSourceTableId(draft.tableId)
    setFlowFixedField(draft.field)
    setFlowFixedValue(draft.fixedValue)
    setFlowRecordMode(draft.recordMode)
    setFlowValueSource(draft.valueSource)
    setFlowValueInputName(draft.valueInputName)
    setFlowValueAmount(draft.valueAmount)
    setFlowSuccessMessage(draft.successMessage.trim() || 'Información actualizada.')
    setFlowConfirmMessage(draft.confirmMessage.trim())
    setSelectedElement(summarizeComponent(component))
    setFlowNotice('La acción del botón quedó configurada.')
    setDynamicActionDialogOpen(false)
    void editor.store()
  }

  function saveFlowConnection() {
    const editor = editorRef.current
    const component = editor?.getSelected()
    if (!editor || !component) return
    if (flowAction === 'navigate' && !resolvedFlowTargetPageId) return
    if (flowAction === 'toggle-record'
      && (!resolvedFlowDataSourceTableId || !flowOwnerField.trim() || !flowRecordField.trim())) return
    if (isRecordDataAction && !resolvedFlowDataSourceTableId) return
    if (flowAction === 'set-record-field' && (!flowFixedField
      || (flowValueSource === 'fixed' && flowFixedValue === '')
      || (flowValueSource === 'form' && !flowValueInputName))) return
    if ((flowAction === 'create-record' || flowAction === 'update-record'
      || flowAction === 'save-current-user-record')
      && !resolvedFlowFieldMappings.length) return

    component.removeAttributes([
      FLOW_ACTION_ATTRIBUTE,
      FLOW_TARGET_ATTRIBUTE,
      FLOW_DATA_SOURCE_ATTRIBUTE,
      FLOW_OWNER_FIELD_ATTRIBUTE,
      FLOW_RECORD_FIELD_ATTRIBUTE,
      FLOW_CONTEXT_ATTRIBUTE,
      FLOW_ACTIVE_LABEL_ATTRIBUTE,
      FLOW_INACTIVE_LABEL_ATTRIBUTE,
      FLOW_FIELD_MAP_ATTRIBUTE,
      FLOW_FIXED_FIELD_ATTRIBUTE,
      FLOW_FIXED_VALUE_ATTRIBUTE,
      FLOW_RECORD_MODE_ATTRIBUTE,
      FLOW_VALUE_SOURCE_ATTRIBUTE,
      FLOW_VALUE_INPUT_ATTRIBUTE,
      FLOW_VALUE_AMOUNT_ATTRIBUTE,
      FLOW_SUCCESS_MESSAGE_ATTRIBUTE,
      FLOW_CONFIRM_MESSAGE_ATTRIBUTE,
    ])
    if (flowAction === 'navigate') {
      component.addAttributes(screenFlowAttributes(
        resolvedFlowTargetPageId,
        resolvedFlowNavigationRecord ? {
          dataSourceTableId: resolvedFlowNavigationRecord.target.id,
          recordField: resolvedFlowNavigationRecord.relation.column,
        } : undefined,
      ))
    } else if (flowAction === 'toggle-record') {
      component.addAttributes(recordToggleAttributes({
        dataSourceTableId: resolvedFlowDataSourceTableId,
        ownerField: flowOwnerField.trim(),
        recordField: flowRecordField.trim(),
        contextKey: 'record',
        activeLabel: flowActiveLabel.trim() || '★ Guardado',
        inactiveLabel: flowInactiveLabel.trim() || '☆ Guardar',
      }))
    } else {
      component.addAttributes(dataActionAttributes({
        action: flowAction,
        dataSourceTableId: resolvedFlowDataSourceTableId,
        contextKey: 'record',
        fieldMappings: flowAction === 'delete-record' ? [] : resolvedFlowFieldMappings,
        ...((flowAction === 'create-record' || flowAction === 'save-current-user-record')
          && flowOwnerField.trim()
          ? { ownerField: flowAction === 'save-current-user-record' ? 'user_id' : flowOwnerField.trim() }
          : {}),
        successMessage: flowSuccessMessage.trim() || (flowAction === 'create-record'
          ? 'Registro creado.' : flowAction === 'update-record' || flowAction === 'save-current-user-record'
            ? 'Cambios guardados.' : flowAction === 'set-record-field'
              ? 'Estado actualizado.' : 'Registro eliminado.'),
        ...(flowConfirmMessage.trim() ? { confirmMessage: flowConfirmMessage.trim() } : {}),
        ...(flowAction === 'set-record-field' ? {
          fixedField: flowFixedField,
          fixedValue: flowFixedValue,
          recordMode: flowRecordMode,
          valueSource: flowValueSource,
          ...(flowValueInputName ? { valueInputName: flowValueInputName } : {}),
          ...(flowValueSource === 'increment' ? { valueAmount: flowValueAmount } : {}),
          ...(flowRecordMode === 'current_user' ? { ownerField: 'user_id' } : {}),
        } : {}),
      }))
    }
    setSelectedElement(summarizeComponent(component))
    if (flowAction === 'navigate') {
      setFlowTargetPageId(resolvedFlowTargetPageId)
      const destination = pages.find((page) => page.id === resolvedFlowTargetPageId)
      setFlowNotice(`Conexión guardada hacia ${destination?.name ?? 'la pantalla seleccionada'}.`)
    } else if (flowAction === 'toggle-record') {
      setFlowDataSourceTableId(resolvedFlowDataSourceTableId)
      setFlowNotice('El botón ahora guarda o quita el registro para la persona conectada.')
    } else {
      setFlowDataSourceTableId(resolvedFlowDataSourceTableId)
      setFlowNotice(flowAction === 'create-record' ? 'El formulario ahora crea un registro.'
        : flowAction === 'update-record' ? 'El formulario ahora actualiza el registro actual.'
          : flowAction === 'save-current-user-record' ? 'El formulario ahora guarda los datos de la persona conectada.'
            : flowAction === 'set-record-field' ? 'El botón ahora cambia el estado del registro actual.'
          : 'El botón ahora elimina el registro actual.')
    }
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la conexión.')
    })
  }

  function removeFlowConnection() {
    const editor = editorRef.current
    const component = editor?.getSelected()
    if (!editor || !component) return

    component.removeAttributes([
      FLOW_ACTION_ATTRIBUTE,
      FLOW_TARGET_ATTRIBUTE,
      FLOW_DATA_SOURCE_ATTRIBUTE,
      FLOW_OWNER_FIELD_ATTRIBUTE,
      FLOW_RECORD_FIELD_ATTRIBUTE,
      FLOW_CONTEXT_ATTRIBUTE,
      FLOW_ACTIVE_LABEL_ATTRIBUTE,
      FLOW_INACTIVE_LABEL_ATTRIBUTE,
      FLOW_FIELD_MAP_ATTRIBUTE,
      FLOW_FIXED_FIELD_ATTRIBUTE,
      FLOW_FIXED_VALUE_ATTRIBUTE,
      FLOW_RECORD_MODE_ATTRIBUTE,
      FLOW_VALUE_SOURCE_ATTRIBUTE,
      FLOW_VALUE_INPUT_ATTRIBUTE,
      FLOW_VALUE_AMOUNT_ATTRIBUTE,
      FLOW_SUCCESS_MESSAGE_ATTRIBUTE,
      FLOW_CONFIRM_MESSAGE_ATTRIBUTE,
    ])
    setSelectedElement(summarizeComponent(component))
    setFlowAction('navigate')
    setFlowTargetPageId('')
    setFlowFieldMappings([])
    setFlowNotice('Conexión eliminada.')
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el cambio.')
    })
  }

  function saveInteractionAnimation(animation: InteractionAnimation) {
    const editor = editorRef.current
    const component = editor?.getSelected()
    if (!editor || !component) return

    if (animation === 'none') component.removeAttributes(INTERACTION_ANIMATION_ATTRIBUTE)
    else component.addAttributes({ [INTERACTION_ANIMATION_ATTRIBUTE]: animation })
    setSelectedElement(summarizeComponent(component))
    setFlowNotice(animation === 'none' ? 'Animación eliminada.' : 'Animación guardada.')
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la animación.')
    })
  }

  function saveAuthSettings(
    destinationPageId: string,
    metadataFields: AuthMetadataField[],
    presentation?: AuthLogoutPresentation,
  ) {
    const editor = editorRef.current
    const component = authSettingsComponentRef.current
    if (!editor || !component) return

    if (destinationPageId) component.addAttributes({ [AUTH_DESTINATION_ATTRIBUTE]: destinationPageId })
    else component.removeAttributes(AUTH_DESTINATION_ATTRIBUTE)
    const action = readAuthComponentSettings(component.getAttributes())?.action
    if (action === 'logout' && presentation) applyNavbarLogoutPresentation(component, presentation)
    if (action === 'signup') {
      editor.addStyle(AUTH_CHOICE_CARD_CSS)
      component.find(`[${AUTH_METADATA_DEFINITION_ATTRIBUTE}]`).forEach((definition) => definition.remove())
      component.find(`[${AUTH_METADATA_ATTRIBUTE}]`).forEach((fieldComponent) => {
        const label = fieldComponent.parent()
        if (label?.get('tagName') === 'label') label.remove()
        else fieldComponent.remove()
      })
      const submitButton = component.find('button[type="submit"]')[0]
      component.append(
        metadataFields.map(authMetadataFieldMarkup).join(''),
        submitButton ? { at: submitButton.index() } : undefined,
      )
    }
    setAuthSettings(null)
    authSettingsComponentRef.current = null
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la configuración de acceso.')
    })
  }

  function saveNavbarLinkSettings(settings: NavbarLinkSettings) {
    const editor = editorRef.current
    const component = navbarLinkSettingsComponentRef.current
    if (!editor || !component) return
    updateStarterNavbarLink(component, settings)
    setNavbarLinkSettings(null)
    navbarLinkSettingsComponentRef.current = null
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el enlace de navegación.')
    })
  }

  function editAuthAction(action: 'login' | 'signup') {
    const editor = editorRef.current
    if (!editor) return
    const component = editor.getWrapper()?.find(`[${AUTH_ACTION_ATTRIBUTE}="${action}"]`)[0]
    const settings = component ? readAuthComponentSettings(component.getAttributes()) : null
    if (!component || !settings) return
    editor.getWrapper()?.find('[data-builder-auth-tab]').forEach((tab) => {
      const active = tab.getAttributes()['data-builder-auth-tab'] === action
      tab.addAttributes({ 'aria-selected': String(active), tabindex: active ? '0' : '-1' })
    })
    editor.getWrapper()?.find('[data-builder-auth-panel]').forEach((panel) => {
      if (panel.getAttributes()['data-builder-auth-panel'] === action) panel.removeAttributes('hidden')
      else panel.addAttributes({ hidden: true })
    })
    authSettingsComponentRef.current = component
    editor.select(component)
    setAuthSettings({
      ...settings,
      ...(action === 'signup' && component.getEl()
        ? { metadataFields: readAuthMetadataFields(component.getEl()!) }
        : {}),
    })
  }

  function saveSupabaseConfig(next: SupabaseEditorConfig) {
    supabaseConfigRef.current = next
    setSupabaseConfig(next)
    storeSupabaseConfig(next)
    void editorRef.current?.store()
  }

  function defaultBindingTarget() {
    if (selectedElement?.tag === 'IMG' || selectedElement?.tag === 'VIDEO'
      || selectedElement?.tag === 'IFRAME') return 'src'
    if (selectedElement?.tag === 'INPUT' || selectedElement?.tag === 'TEXTAREA') return 'value'
    if (selectedElement?.tag === 'A') return 'href'
    return 'text'
  }

  function saveDataBinding(tableId: string, field: string, target: string, scope: 'context' | 'first') {
    const editor = editorRef.current
    const component = editor?.getSelected()
    if (!editor || !component || !field) return
    component.addAttributes({
      [DATA_BIND_FIELD_ATTRIBUTE]: field,
      [DATA_BIND_TARGET_ATTRIBUTE]: target,
      [DATA_SOURCE_ATTRIBUTE]: tableId,
      [DATA_SCOPE_ATTRIBUTE]: scope,
    })
    setSelectedElement(summarizeComponent(component))
    void editor.store()
  }

  function removeDataBinding() {
    const editor = editorRef.current
    const component = editor?.getSelected()
    if (!editor || !component) return
    component.removeAttributes([
      DATA_BIND_FIELD_ATTRIBUTE,
      DATA_BIND_TARGET_ATTRIBUTE,
      DATA_SOURCE_ATTRIBUTE,
      DATA_SCOPE_ATTRIBUTE,
    ])
    setSelectedElement(summarizeComponent(component))
    void editor.store()
  }

  function toggleDataRepeater(tableId: string) {
    const editor = editorRef.current
    const component = editor?.getSelected()
    if (!editor || !component) return
    if (selectedElement?.isRepeater) component.removeAttributes([DATA_REPEATER_ATTRIBUTE])
    else component.addAttributes({ [DATA_REPEATER_ATTRIBUTE]: tableId })
    setSelectedElement(summarizeComponent(component))
    void editor.store()
  }

  function insertDataComponent(
    templateId: DataComponentTemplateId,
    tableId: string,
    mapping: DataComponentMapping,
    options: DataComponentOptions,
  ) {
    const editor = editorRef.current
    if (!editor) return
    const markup = createDataComponentMarkup(templateId, tableId, mapping, options)
    const component = appendGridItem(editor, markup)
    editor.Css.addRules(dataComponentStyles)
    if (component) {
      editor.select(component)
      setSelectedElement(summarizeComponent(component))
    }
    setFlowNotice('Componente responsive añadido y conectado con la tabla seleccionada.')
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el componente con datos.')
    })
  }

  function updateDataComponent(
    templateId: DataComponentTemplateId,
    tableId: string,
    mapping: DataComponentMapping,
    options: DataComponentOptions,
  ) {
    const editor = editorRef.current
    const component = editingDataComponentRef.current
    if (!editor || !component) return
    const generatedClasses = new Set([
      'builder-data-responsive-frame',
      'builder-data-grid',
      'builder-data-carousel',
      'builder-data-list',
      'builder-data-featured',
    ])
    const interactionComponent = [
      component,
      ...component.find(`[${FLOW_ACTION_ATTRIBUTE}],[${INTERACTION_ANIMATION_ATTRIBUTE}]`),
    ].find((candidate) => {
      const attributes = candidate.getAttributes()
      return typeof attributes[FLOW_ACTION_ATTRIBUTE] === 'string'
        || typeof attributes[INTERACTION_ANIMATION_ATTRIBUTE] === 'string'
    })
    const interactionAttributes = Object.fromEntries(Object.entries(
      interactionComponent?.getAttributes() ?? {},
    ).filter(([name]) => name.startsWith('data-builder-flow-')
      || name === INTERACTION_ANIMATION_ATTRIBUTE))
    const isStandaloneGeneratedRoot = !component.getAttributes()[DATA_COMPONENT_ATTRIBUTE]
      && component.getClasses().some((className) => generatedClasses.has(className))
    const preservedClasses = component.getClasses().filter((className) => !generatedClasses.has(className))
    const preservedAttributes = Object.fromEntries(Object.entries(component.getAttributes()).filter(([name]) =>
      name !== 'class'
      && name !== 'style'
      && name !== 'aria-label'
      && name !== 'tabindex'
      && name !== DATA_COMPONENT_ATTRIBUTE
      && !name.startsWith('data-builder-flow-')
      && name !== INTERACTION_ANIMATION_ATTRIBUTE
      && !(isStandaloneGeneratedRoot && name.startsWith('data-builder-'))))
    const preservedStyles = Object.fromEntries(Object.entries(component.getStyle()).filter(([name]) =>
      !name.startsWith('--builder-data-')))
    const replacements = component.replaceWith(createDataComponentMarkup(templateId, tableId, mapping, options))
    const replacement = replacements[0]
    editingDataComponentRef.current = null
    setDataComponentEditRequest(null)
    if (!replacement) return
    if (preservedClasses.length) replacement.addClass(preservedClasses)
    if (Object.keys(preservedAttributes).length) replacement.addAttributes(preservedAttributes)
    if (Object.keys(preservedStyles).length) replacement.addStyle(preservedStyles)
    if (Object.keys(interactionAttributes).length) {
      const interactionTarget = replacement.getAttributes()[DATA_REPEATER_ATTRIBUTE]
        ? replacement
        : replacement.find(`[${DATA_REPEATER_ATTRIBUTE}]`)[0] ?? replacement
      interactionTarget.addAttributes(interactionAttributes)
    }
    editor.Css.addRules(dataComponentStyles)
    editor.select(replacement)
    setSelectedElement(summarizeComponent(replacement))
    setFlowNotice('Opciones del componente con datos actualizadas.')
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el componente con datos.')
    })
  }

  function handlePreviewRuntimeAction(message: Parameters<typeof applyEditorPreviewAction>[1]) {
    setPreviewSession((current) => {
      if (!current) return current
      const transition = applyEditorPreviewAction(current, message)
      if (transition.externalUrl) {
        window.open(transition.externalUrl, '_blank', 'noopener,noreferrer')
      }
      if (transition.session.pageId !== current.pageId) {
        requestAnimationFrame(() => editorRef.current?.Pages.select(transition.session.pageId))
      }
      return transition.session
    })
  }

  function handleMotionReference(message: MotionReferenceRuntimeMessage) {
    const editor = editorRef.current
    const match = /^(.*)-motion-(\d+)$/.exec(message.activityId)
    if (!editor || !match) return
    const page = editor.Pages.get(match[1])
    const activities = page?.getMainComponent().find(`[data-motion-activity]`) ?? []
    const component = activities[Number(match[2]) - 1]
    if (!component) return
    component.addAttributes({
      'data-motion-reference-source': 'template',
      'data-motion-reference-template': encodeURIComponent(JSON.stringify(message.template)),
    })
    editor.select(component)
    setSelectedMotionComponent(component)
    setMotionNotice('Referencia compilada e incrustada en el proyecto. Cambia a Comparar para utilizarla.')
    setRightPanel('motion')
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la referencia compilada.')
    })
  }

  function addPage() {
    const editor = editorRef.current
    if (!editor) return
    const pageNumber = editor.Pages.getAll().length + 1
    editor.Pages.add({
      name: `Página ${pageNumber}`,
      component: '',
    }, { select: true })
    ensurePageGrid(editor)
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la página nueva.')
    })
    requestAnimationFrame(() => {
      installGridEditorStyles(editor)
    })
  }

  function handleGridLayoutChange(options: { margin?: number; select?: Component } = {}) {
    const editor = editorRef.current
    if (!editor) return
    if (options.margin !== undefined) setSiteMargin(options.margin)
    if (options.select) {
      setSelectedGridItem(sectionGridFor(options.select)
        ?? gridItemFor(options.select)
        ?? (isLayoutRow(options.select) ? options.select : null))
    }
    setGridLayoutRevision((current) => current + 1)
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el diseño de cuadrícula.')
    })
  }

  function addTemplatePage(templateId: string) {
    const editor = editorRef.current
    const template = pageTemplateById(templateId)
    if (!editor || !template) return
    const existingPage = template.id === 'auth'
      ? editor.Pages.getAll().find((page) => editor.getHtml({
        component: page.getMainComponent(),
      }).includes('data-builder-auth-action="login"'))
      : undefined
    if (existingPage && template.id === 'auth') {
      editor.Pages.select(existingPage)
      setCreateMenuOpen(false)
      setTemplateGalleryOpen(false)
      setFlowNotice('La página de acceso ya existe. Las demás páginas requieren sesión al probar o exportar.')
      return
    }
    editor.Pages.add({
      id: uniquePageId(template.id),
      name: template.pageName,
      component: template.html,
      styles: template.css,
    }, { select: true })
    setCreateMenuOpen(false)
    setTemplateGalleryOpen(false)
    setFlowNotice(template.id === 'auth'
      ? 'Autenticación activada. Todas las demás páginas requieren iniciar sesión.'
      : `Plantilla “${template.name}” añadida. Selecciona cualquier elemento para editarlo.`)
    void editor.store().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la plantilla.')
    })
  }

  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0]
  const hasAuthPage = pages.some((page) => page.access === 'guestOnly')
  const roleTable = supabaseConfig.tables.find((table) => /(^|_)roles?($|_)/i.test(table.name))

  return (
    <main className="grapes-editor-shell">
      {error && <div className="grapes-editor-error" role="alert">{error}</div>}

      <header className="gjs-workspace-toolbar">
        <div className="gjs-workspace-brand" title="Editor visual">
          <span aria-hidden="true">G</span>
        </div>

        <div className="gjs-device-selector">
          <div className="gjs-native-devices" aria-label="Tamaño del lienzo" ref={nativeDevicesRef} />
          <output aria-live="polite" className="gjs-device-size">
            {previewViewport.label} · {previewViewport.width.replace('px', ' px')}
          </output>
        </div>
        <div className="gjs-toolbar-account-area">
          <div className="gjs-native-options" aria-label="Herramientas del editor" ref={nativeOptionsRef} />
          <div className="gjs-editor-account"><span aria-hidden="true">{accountEmail.slice(0, 1).toUpperCase()}</span><small>{accountEmail}</small></div>
          <button
            aria-label={isGuest ? 'Salir del modo invitado' : 'Cerrar sesión'}
            className="gjs-editor-signout"
            onClick={() => void onSignOut()}
            title={isGuest ? 'Salir del modo invitado' : `Cerrar sesión de ${accountEmail}`}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></svg>
            <span>{isGuest ? 'Salir' : 'Cerrar sesión'}</span>
          </button>
        </div>
      </header>

      <div className={`gjs-workspace-grid ${blocksOpen ? 'blocks-open' : ''}`}>
        <aside className={`gjs-left-panel ${blocksOpen ? 'is-inserting' : ''}`} onClick={() => {
          setCreateMenuOpen(false)
          setPageMenuId(null)
        }}>
          <div className="gjs-left-organizer" hidden={blocksOpen}>
          <section className="gjs-sidebar-section gjs-pages-section">
            <div className="gjs-sidebar-heading">
              <strong>Páginas</strong>
              <div className="gjs-page-create-control">
                <button
                  aria-expanded={createMenuOpen}
                  aria-label="Añadir o importar página"
                  data-tooltip="Añadir o importar página"
                  onClick={(event) => {
                    event.stopPropagation()
                    setPageMenuId(null)
                    setCreateMenuPosition(floatingMenuPosition(
                      event.currentTarget.getBoundingClientRect(),
                      196,
                      114,
                    ))
                    setCreateMenuOpen((open) => !open)
                  }}
                  type="button"
                >+</button>
                {createMenuOpen && (
                  <div
                    className="gjs-page-menu gjs-page-create-menu gjs-page-menu-floating"
                    role="menu"
                    style={createMenuPosition}
                  >
                    <button onClick={addPage} role="menuitem" type="button">Página nueva</button>
                    <button onClick={() => {
                      setCreateMenuOpen(false)
                      setTemplateGalleryOpen(true)
                    }} role="menuitem" type="button">Explorar plantillas</button>
                    <button onClick={() => {
                      setCreateMenuOpen(false)
                      setPageImportOpen(true)
                    }} role="menuitem" type="button">Importar</button>
                  </div>
                )}
              </div>
            </div>
            <nav className="gjs-page-list" aria-label="Páginas">
              {pages.map((page, pageIndex) => (
                <div
                  className={`gjs-page-row ${page.id === activePageId ? 'active' : ''} ${pageDropTarget?.id === page.id ? `drop-${pageDropTarget.position}` : ''}`}
                  key={page.id}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPageDropTarget(null)
                  }}
                  onDragOver={(event) => {
                    if (!draggingPageId || draggingPageId === page.id) return
                    event.preventDefault()
                    const bounds = event.currentTarget.getBoundingClientRect()
                    setPageDropTarget({
                      id: page.id,
                      position: event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after',
                    })
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (draggingPageId && pageDropTarget?.id === page.id) {
                      movePageTo(draggingPageId, page.id, pageDropTarget.position)
                    }
                  }}
                >
                  <button
                    aria-label={`Reordenar ${page.name}`}
                    className="gjs-page-drag-handle"
                    draggable
                    onClick={(event) => event.stopPropagation()}
                    onDragEnd={() => {
                      setDraggingPageId(null)
                      setPageDropTarget(null)
                    }}
                    onDragStart={(event) => {
                      event.stopPropagation()
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', page.id)
                      setDraggingPageId(page.id)
                      setPageMenuId(null)
                    }}
                    title={`Reordenar ${page.name}`}
                    type="button"
                  ><span aria-hidden="true">⠿</span></button>
                  <button className="gjs-page-select" onClick={() => selectPage(page.id)} type="button">
                    <span>{page.name}</span>
                    {page.isHome && (
                      <span className="gjs-page-home" title="Página de inicio" aria-label="Página de inicio">
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path d="m3 10.5 9-7.5 9 7.5M5.5 9.5V21h13V9.5M9 21v-7h6v7" />
                        </svg>
                      </span>
                    )}
                    <i
                      aria-label={PAGE_ACCESS_LABELS[page.access]}
                      className={`gjs-page-access-indicator ${page.access}`}
                      title={page.access === 'role' && page.roles.length
                        ? `${PAGE_ACCESS_LABELS[page.access]}: ${page.roles.join(', ')}`
                        : PAGE_ACCESS_LABELS[page.access]}
                    />
                  </button>
                  <button
                    aria-expanded={pageMenuId === page.id}
                    aria-label={`Acciones de ${page.name}`}
                    className="gjs-page-more"
                    onClick={(event) => {
                      event.stopPropagation()
                      setCreateMenuOpen(false)
                      const buttonRect = event.currentTarget.getBoundingClientRect()
                      setPageMenuPosition(floatingMenuPosition(buttonRect, 164, 174))
                      setPageMenuId((current) => current === page.id ? null : page.id)
                    }}
                    type="button"
                  >•••</button>
                  {pageMenuId === page.id && (
                    <div
                      className="gjs-page-menu gjs-page-menu-floating"
                      role="menu"
                      style={pageMenuPosition}
                    >
                      <button disabled={pageIndex === 0} onClick={() => movePageBy(page.id, -1)} role="menuitem" type="button">Mover arriba</button>
                      <button disabled={pageIndex === pages.length - 1} onClick={() => movePageBy(page.id, 1)} role="menuitem" type="button">Mover abajo</button>
                      <button onClick={() => renamePage(page.id)} role="menuitem" type="button">Renombrar</button>
                      <button onClick={() => duplicatePage(page.id)} role="menuitem" type="button">Duplicar</button>
                      <button className="danger" onClick={() => deletePage(page.id)} role="menuitem" type="button">Eliminar</button>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </section>

          <div className="gjs-left-content-tabs" role="tablist" aria-label="Organizador">
            <button
              aria-selected={leftPanel === 'layers'}
              className={leftPanel === 'layers' ? 'active' : ''}
              onClick={() => setLeftPanel('layers')}
              role="tab"
              type="button"
            >Capas</button>
            <button
              aria-selected={leftPanel === 'data'}
              className={leftPanel === 'data' ? 'active' : ''}
              onClick={() => setLeftPanel('data')}
              role="tab"
              type="button"
            >Datos</button>
            <button
              aria-selected={leftPanel === 'libraries'}
              className={leftPanel === 'libraries' ? 'active' : ''}
              onClick={() => setLeftPanel('libraries')}
              role="tab"
              type="button"
            >Librerías</button>
          </div>

          <section className={`gjs-sidebar-section gjs-layers-section ${leftPanel === 'layers' ? '' : 'hidden'}`}>
            <div className="gjs-manager-container gjs-layers-container" ref={layersRef} />
          </section>

          <div className={`gjs-left-data-container ${leftPanel === 'data' ? '' : 'hidden'}`}>
            <SupabaseDataPanel
              config={supabaseConfig}
              dataComponentEditRequest={dataComponentEditRequest}
              dataComponentRequest={dataComponentRequest}
              editorProjectId={editorProjectId}
              isGuest={isGuest}
              onChange={saveSupabaseConfig}
              onInsertDataComponent={insertDataComponent}
              onRemoveBinding={removeDataBinding}
              onSaveBinding={saveDataBinding}
              onToggleRepeater={toggleDataRepeater}
              onUpdateDataComponent={updateDataComponent}
              scope="project"
              selectedElement={null}
            />
          </div>

          <div className={`gjs-left-libraries-container ${leftPanel === 'libraries' ? '' : 'hidden'}`}>
            <ExternalLibrariesPanel
              libraries={availableExternalLibraries}
              onAddLibrary={addImportedLibrary}
              onUseFunction={useExternalFunction}
            />
          </div>

          <button
            aria-expanded={blocksOpen}
            className="gjs-add-blocks"
            hidden={leftPanel !== 'layers'}
            onClick={() => setBlocksOpen(true)}
            type="button"
          >
            <span aria-hidden="true">+</span> Añadir
          </button>
          </div>

          <section
            aria-label="Añadir elementos"
            className="gjs-insert-panel"
            hidden={!blocksOpen}
          >
            <div className="gjs-insert-heading">
              <button aria-label="Volver a páginas y capas" onClick={() => setBlocksOpen(false)} type="button">
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <div>
                <strong>Añadir</strong>
              </div>
              <button aria-label="Cerrar Añadir" onClick={() => setBlocksOpen(false)} type="button">×</button>
            </div>
            <div
              className="gjs-manager-container gjs-insert-blocks"
              onPointerDownCapture={(event) => beginBlockPointerDrag(event.target)}
              ref={blocksRef}
            />
          </section>
        </aside>

        <section className="gjs-canvas-column" onClick={() => setPageAccessMenuOpen(false)} ref={canvasColumnRef}>
          {!previewActive && activePage && (
            <div className="gjs-page-settings-bar" onClick={(event) => event.stopPropagation()}>
              <span aria-hidden="true" className="gjs-page-route-icon">⌂</span>
              <code>{pageRoute(activePage.id)}</code>
              <select
                aria-label="Cambiar página"
                onChange={(event) => selectPage(event.target.value)}
                value={activePage.id}
              >
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>{page.name} · {pageRoute(page.id)}</option>
                ))}
              </select>
              {activePageHasAuth && (
                <div className="gjs-page-auth-actions" aria-label="Editar formularios de acceso">
                  <button onClick={() => editAuthAction('login')} type="button">Editar ingreso</button>
                  <button onClick={() => editAuthAction('signup')} type="button">Editar registro</button>
                </div>
              )}
              <div className="gjs-page-access-control">
                <button
                  aria-expanded={pageAccessMenuOpen}
                  className={`gjs-page-access-button ${activePage.access}`}
                  disabled={activePage.access === 'guestOnly'}
                  onClick={() => setPageAccessMenuOpen((open) => !open)}
                  title={activePage.access === 'guestOnly'
                    ? 'La página de acceso se muestra únicamente a visitantes sin sesión'
                    : 'Configurar acceso a esta página'}
                  type="button"
                >
                  <span aria-hidden="true" />
                  {PAGE_ACCESS_LABELS[activePage.access]}
                  {activePage.access !== 'guestOnly' && <b aria-hidden="true">⌄</b>}
                </button>
                {pageAccessMenuOpen && activePage.access !== 'guestOnly' && (
                  <div className="gjs-page-access-popover" role="dialog" aria-label="Configuración de acceso de página">
                    <strong>Acceso a la página</strong>
                    <p>Define quién puede abrir esta página publicada.</p>
                    <label className={activePage.access === 'public' ? 'selected' : ''}>
                      <input
                        checked={activePage.access === 'public'}
                        name="page-access"
                        onChange={() => setActivePageAccess('public')}
                        type="radio"
                      />
                      <span><b>Pública</b><small>No requiere iniciar sesión.</small></span>
                    </label>
                    <label className={`${activePage.access === 'authenticated' ? 'selected' : ''} ${hasAuthPage ? '' : 'disabled'}`}>
                      <input
                        checked={activePage.access === 'authenticated'}
                        disabled={!hasAuthPage}
                        name="page-access"
                        onChange={() => setActivePageAccess('authenticated')}
                        type="radio"
                      />
                      <span><b>Privada</b><small>{hasAuthPage
                        ? 'Requiere una cuenta con sesión iniciada.'
                        : 'Necesita una página de acceso.'}</small></span>
                    </label>
                    <label className={`${activePage.access === 'role' ? 'selected' : ''} ${hasAuthPage && roleTable ? '' : 'disabled'}`}>
                      <input
                        checked={activePage.access === 'role'}
                        disabled={!hasAuthPage || !roleTable}
                        name="page-access"
                        onChange={() => setActivePageAccess('role')}
                        type="radio"
                      />
                      <span><b>Restringida por rol</b><small>{!hasAuthPage
                        ? 'Necesita una página de acceso.'
                        : roleTable
                        ? `Usa la colección ${roleTable.displayName || roleTable.name}.`
                        : 'Necesita una colección de roles.'}</small></span>
                    </label>
                    {!hasAuthPage && (
                      <button className="gjs-configure-roles" onClick={() => {
                        setPageAccessMenuOpen(false)
                        setTemplateGalleryOpen(true)
                      }} type="button">Añadir página de acceso</button>
                    )}
                    {hasAuthPage && !roleTable && (
                      <button className="gjs-configure-roles" onClick={() => {
                        setPageAccessMenuOpen(false)
                        setLeftPanel('data')
                      }} type="button">Configurar roles</button>
                    )}
                    {activePage.access === 'role' && roleTable && (
                      <label className="gjs-role-values">
                        <span>Roles permitidos</span>
                        <input
                          aria-label="Roles permitidos separados por comas"
                          onChange={(event) => setActivePageRoles(event.target.value)}
                          placeholder="admin, editor"
                          value={activePage.roles.join(', ')}
                        />
                        <small>Separa varios roles con comas.</small>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="grapes-editor" ref={canvasRef} />
          {blockDropActive && (
            <div
              aria-hidden="true"
              className="gjs-canvas-block-drop"
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'copy'
              }}
              onDrop={(event) => {
                event.preventDefault()
                event.stopPropagation()
                dropBlockOnCanvas()
              }}
              onPointerUp={(event) => {
                event.preventDefault()
                event.stopPropagation()
                dropBlockOnCanvas()
              }}
            >
              <span>Suelta para añadir a la página</span>
            </div>
          )}
          {!previewActive && (
            <>
            <div className="gjs-canvas-viewport-controls" aria-label="Zoom y movimiento del lienzo">
              <button
                aria-label="Mover lienzo"
                aria-pressed={panToolActive}
                className={panToolActive ? 'active' : ''}
                data-tooltip="Mover lienzo (o mantén Espacio)"
                onClick={toggleCanvasPanTool}
                type="button"
              >✋</button>
              <span className="gjs-canvas-control-divider" aria-hidden="true" />
              <button
                aria-label="Alejar lienzo"
                disabled={canvasZoom <= MIN_CANVAS_ZOOM}
                onClick={() => setManualCanvasZoom(stepCanvasZoom(canvasZoom, -1))}
                type="button"
              >−</button>
              <output aria-live="polite" className="gjs-canvas-zoom-value">{canvasZoom}%</output>
              <button
                aria-label="Acercar lienzo"
                disabled={canvasZoom >= MAX_CANVAS_ZOOM}
                onClick={() => setManualCanvasZoom(stepCanvasZoom(canvasZoom, 1))}
                type="button"
              >+</button>
              <button
                aria-pressed={canvasZoomMode === 'fit'}
                className={canvasZoomMode === 'fit' ? 'active gjs-canvas-fit-button' : 'gjs-canvas-fit-button'}
                onClick={fitCanvasToWorkspace}
                type="button"
              >Ajustar</button>
            </div>
            </>
          )}
          {previewActive && previewSession && (
            <EditorRuntimePreview
              onMotionReference={handleMotionReference}
              onRuntimeAction={handlePreviewRuntimeAction}
              session={previewSession}
              viewport={previewViewport}
            />
          )}
        </section>

        <aside className="gjs-right-panel">
          <div className="gjs-inspector-tabs" role="tablist" aria-label="Inspector">
            <button
              aria-selected={rightPanel === 'styles'}
              className={rightPanel === 'styles' ? 'active' : ''}
              onClick={() => setRightPanel('styles')}
              role="tab"
              type="button"
            >Estilos</button>
            <button
              aria-selected={rightPanel === 'properties'}
              className={rightPanel === 'properties' ? 'active' : ''}
              onClick={() => setRightPanel('properties')}
              role="tab"
              type="button"
            >Propiedades</button>
            {selectedMotionComponent && (
              <button
                aria-selected={rightPanel === 'motion'}
                className={rightPanel === 'motion' ? 'active' : ''}
                onClick={() => setRightPanel('motion')}
                role="tab"
                type="button"
              >Movimiento</button>
            )}
            <button
              aria-selected={rightPanel === 'flow'}
              className={rightPanel === 'flow' ? 'active' : ''}
              onClick={() => setRightPanel('flow')}
              role="tab"
              type="button"
            >Flujo</button>
          </div>
          <div
            className={`gjs-manager-container gjs-styles-container ${rightPanel === 'styles' ? '' : 'hidden'}`}
            ref={stylesRef}
          />
          <div className={`gjs-properties-container ${rightPanel === 'properties' ? '' : 'hidden'}`}>
            <GridLayoutPanel
              editor={editorRef.current}
              item={selectedGridItem}
              margin={siteMargin}
              onChange={handleGridLayoutChange}
            />
            <div className="gjs-manager-container gjs-traits-container" ref={traitsRef} />
            <SupabaseDataPanel
              config={supabaseConfig}
              editorProjectId={editorProjectId}
              isGuest={isGuest}
              onChange={saveSupabaseConfig}
              onInsertDataComponent={insertDataComponent}
              onRemoveBinding={removeDataBinding}
              onSaveBinding={saveDataBinding}
              onToggleRepeater={toggleDataRepeater}
              onUpdateDataComponent={updateDataComponent}
              scope="element"
              selectedElement={selectedElement ? {
                bindingField: selectedElement.bindingField,
                bindingTarget: selectedElement.bindingTarget ?? defaultBindingTarget(),
                bindingScope: selectedElement.bindingScope,
                dataSourceTableId: selectedElement.dataSourceTableId,
                inheritedRepeaterTableId: selectedElement.inheritedRepeaterTableId,
                isRepeater: selectedElement.isRepeater,
                repeaterTableId: selectedElement.repeaterTableId,
              } : null}
            />
          </div>
          <div className={`gjs-motion-container ${rightPanel === 'motion' ? '' : 'hidden'}`}>
            <MotionPanel
              component={selectedMotionComponent}
              config={supabaseConfig}
              notice={motionNotice}
              onOpenData={() => {
                setBlocksOpen(false)
                setLeftPanel('data')
              }}
              tables={supabaseConfig.tables}
            />
          </div>
          <div className={`gjs-flow-container ${rightPanel === 'flow' ? '' : 'hidden'}`}>
            {previewActive ? (
              <div className="gjs-flow-form">
                <div className="gjs-flow-introduction gjs-flow-preview-status">
                  <span aria-hidden="true">▶</span>
                  <div>
                    <strong>Vista previa activa</strong>
                    <p>Haz clic en el elemento conectado dentro del lienzo para abrir su pantalla.</p>
                  </div>
                </div>
              </div>
            ) : !selectedElement ? (
              <div className="gjs-flow-empty">
                <span aria-hidden="true">↗</span>
                <strong>Selecciona un elemento</strong>
                <p>Elige un botón, enlace, imagen o tarjeta en el lienzo para conectarlo.</p>
              </div>
            ) : (
              <div className="gjs-flow-form">
                <div className="gjs-flow-introduction">
                  <span aria-hidden="true">⚡</span>
                  <div>
                    <strong>
                      Interacción de {selectedElement.tag === 'BUTTON'
                        ? 'botón'
                        : selectedElement.tag === 'A' ? 'enlace' : 'elemento'}
                    </strong>
                    <p>{selectedElement.tag === 'FORM'
                      ? 'Configura qué ocurre cuando se envía este formulario.'
                      : 'Configura su respuesta visual y lo que ocurre al hacer clic.'}</p>
                  </div>
                </div>

                <label>
                  Animación
                  <select
                    aria-label="Animación de interacción"
                    onChange={(event) => saveInteractionAnimation(event.target.value as InteractionAnimation)}
                    value={selectedElement.interactionAnimation}
                  >
                    <option value="none">Ninguna</option>
                    <option value="lift">Elevar</option>
                    <option value="pulse">Pulso</option>
                    <option value="glow">Resplandor</option>
                  </select>
                </label>

                <label>
                  {selectedElement.tag === 'FORM' ? 'Al enviar' : 'Al hacer clic'}
                  <select
                    aria-label="Acción del flujo"
                    onChange={(event) => {
                      const nextAction = event.target.value as 'navigate' | 'toggle-record' | DataActionKind
                      setFlowAction(nextAction)
                      if (nextAction === 'save-current-user-record') {
                        const nextTable = singleUserFlowTables.find((candidate) => candidate.id === flowDataSourceTableId)
                          ?? singleUserFlowTables[0]
                        setFlowDataSourceTableId(nextTable?.id ?? '')
                        setFlowOwnerField('user_id')
                        setFlowFieldMappings((nextTable?.fields ?? []).flatMap((field) =>
                          flowInputNames.includes(field.name) ? [{ field: field.name, inputName: field.name }] : []))
                      }
                      if (nextAction === 'set-record-field') {
                        const nextMode: DataActionRecordMode = dynamicContextTables.length ? 'context' : 'current_user'
                        const nextTable = nextMode === 'context' ? dynamicContextTables[0] : dynamicCurrentUserTables[0]
                        const nextFields = nextTable ? [
                          ...(nextTable.access === 'public_read' ? ['published'] : []),
                          ...nextTable.fields.map((field) => field.name),
                        ] : []
                        setFlowRecordMode(nextMode)
                        setFlowDataSourceTableId(nextTable?.id ?? '')
                        setFlowFixedField(nextFields[0] ?? '')
                        setFlowFixedValue(nextFields[0] === 'published' ? 'true' : '')
                        setFlowValueSource('fixed')
                        setFlowValueInputName(flowInputNames[0] ?? '')
                        setFlowValueAmount(1)
                        setDynamicActionDialogOpen(true)
                      }
                      if ((nextAction === 'create-record' || nextAction === 'update-record')
                        && !flowFieldMappings.length) {
                        setFlowFieldMappings(flowFieldNames.flatMap((field) =>
                          flowInputNames.includes(field) ? [{ field, inputName: field }] : []))
                      }
                      setFlowSuccessMessage(nextAction === 'create-record' ? 'Registro creado.'
                        : nextAction === 'update-record' || nextAction === 'save-current-user-record' ? 'Cambios guardados.'
                          : nextAction === 'set-record-field' ? 'Estado actualizado.'
                          : nextAction === 'delete-record' ? 'Registro eliminado.' : flowSuccessMessage)
                      if (nextAction === 'delete-record') setFlowConfirmMessage('¿Eliminar este registro?')
                      setFlowNotice('')
                    }}
                    value={flowAction}
                  >
                    <option value="navigate">Ir a otra pantalla</option>
                    <option value="toggle-record">Guardar o quitar un registro</option>
                    <option disabled={!flowInputNames.length} value="create-record">Crear un registro</option>
                    <option disabled={!flowInputNames.length} value="update-record">Actualizar el registro actual</option>
                    <option disabled={!singleUserFlowTables.length} value="save-current-user-record">Guardar mis datos</option>
                    <option disabled={!dynamicContextTables.length && !dynamicCurrentUserTables.length} value="set-record-field">Cambiar información</option>
                    <option value="delete-record">Eliminar el registro actual</option>
                  </select>
                </label>

                {flowAction === 'navigate' ? (
                  <>
                    <label>
                      Pantalla de destino
                      <select
                        aria-label="Pantalla de destino"
                        disabled={availableFlowPages.length === 0}
                        onChange={(event) => {
                          setFlowTargetPageId(event.target.value)
                          setFlowNotice('')
                        }}
                        value={resolvedFlowTargetPageId}
                      >
                        {availableFlowPages.length === 0 ? (
                          <option value="">Añade otra página primero</option>
                        ) : availableFlowPages.map((page) => (
                          <option key={page.id} value={page.id}>{page.name}</option>
                        ))}
                      </select>
                    </label>
                    {flowNavigationSourceTable && (
                      <label>
                        Registro que recibirá {pages.find((page) => page.id === resolvedFlowTargetPageId)?.name ?? 'la otra página'}
                        <select
                          aria-label="Datos que abrir en la siguiente pantalla"
                          onChange={(event) => {
                            const selected = flowNavigationRelatedRecords.find(({ relation }) =>
                              relation.id === event.target.value)
                            setFlowNavigationDataSourceTableId(selected?.target.id ?? '')
                            setFlowNavigationRecordField(selected?.relation.column ?? '')
                            setFlowNotice('')
                          }}
                          value={resolvedFlowNavigationRecord?.relation.id ?? ''}
                        >
                          <option value="">Este registro de {collectionDisplayName(flowNavigationSourceTable)}</option>
                          {flowNavigationRelatedRecords.map(({ relation, target }) => (
                            <option key={relation.id} value={relation.id}>
                              Registro relacionado de {collectionDisplayName(target)}
                            </option>
                          ))}
                        </select>
                        <small>{resolvedFlowNavigationRecord
                          ? `Se usará ${resolvedFlowNavigationRecord.relation.column} para abrir el registro correcto de ${collectionDisplayName(resolvedFlowNavigationRecord.target)}.`
                          : 'La siguiente pantalla recibirá este mismo registro.'}</small>
                      </label>
                    )}
                  </>
                ) : flowAction === 'toggle-record' ? (
                  <>
                    <div className="gjs-flow-introduction">
                      <span aria-hidden="true">★</span>
                      <div><strong>Registro guardado</strong><p>Un clic lo guarda para la persona conectada; el siguiente clic lo quita.</p></div>
                    </div>
                    <label>
                      Colección donde se guarda
                      <select
                        aria-label="Colección del registro guardado"
                        onChange={(event) => setFlowDataSourceTableId(event.target.value)}
                        value={resolvedFlowDataSourceTableId}
                      >
                        {writableFlowTables.length === 0 ? (
                          <option value="">Crea una colección de datos propios</option>
                        ) : writableFlowTables.map((table) => (
                          <option key={table.id} value={table.id}>{table.displayName ?? table.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Campo de la persona
                      <input
                        aria-label="Campo de la persona conectada"
                        list="flow-record-fields"
                        onChange={(event) => setFlowOwnerField(event.target.value)}
                        value={flowOwnerField}
                      />
                    </label>
                    <label>
                      Campo del registro actual
                      <input
                        aria-label="Campo del registro actual"
                        list="flow-record-fields"
                        onChange={(event) => setFlowRecordField(event.target.value)}
                        value={flowRecordField}
                      />
                    </label>
                    <datalist id="flow-record-fields">
                      {flowFieldNames.map((field) => <option key={field} value={field} />)}
                    </datalist>
                    <label>
                      Texto cuando no está guardado
                      <input onChange={(event) => setFlowInactiveLabel(event.target.value)} value={flowInactiveLabel} />
                    </label>
                    <label>
                      Texto cuando está guardado
                      <input onChange={(event) => setFlowActiveLabel(event.target.value)} value={flowActiveLabel} />
                    </label>
                  </>
                ) : (
                  <>
                    <div className="gjs-flow-introduction">
                      <span aria-hidden="true">▦</span>
                      <div><strong>{flowAction === 'create-record' ? 'Crear información' : flowAction === 'update-record' ? 'Actualizar información' : flowAction === 'save-current-user-record' ? 'Guardar mis datos' : flowAction === 'set-record-field' ? 'Cambiar estado' : 'Eliminar información'}</strong><p>{flowAction === 'create-record'
                        ? 'Los valores del formulario crearán un registro nuevo.'
                        : flowAction === 'save-current-user-record'
                          ? 'Carga y guarda el único registro de la persona conectada.'
                          : flowAction === 'set-record-field'
                            ? 'El botón cambia un campo del registro actual. Supabase comprueba el permiso real.'
                          : 'Esta acción usa el registro actual de una lista o página de detalle.'}</p></div>
                    </div>
                    {flowAction !== 'set-record-field' && <label>
                      Colección
                      <select aria-label="Colección de la acción" onChange={(event) => {
                        const nextTableId = event.target.value
                        const nextTable = recordActionFlowTables.find((candidate) => candidate.id === nextTableId)
                        setFlowDataSourceTableId(nextTableId)
                        if (/(^|_)roles?($|_)/i.test(nextTable?.name ?? '')) setFlowOwnerField('')
                        setFlowFieldMappings((nextTable?.fields ?? []).flatMap((field) =>
                          flowInputNames.includes(field.name) ? [{ field: field.name, inputName: field.name }] : []))
                      }} value={resolvedFlowDataSourceTableId}>
                        {recordActionFlowTables.length === 0 ? <option value="">{flowAction === 'save-current-user-record' ? 'Configura una colección con un elemento por persona' : 'Crea una colección de datos propios'}</option> : recordActionFlowTables.map((table) => <option key={table.id} value={table.id}>{table.displayName ?? table.name}</option>)}
                      </select>
                    </label>}
                    {(flowAction === 'create-record' || flowAction === 'update-record' || flowAction === 'save-current-user-record') && flowDataSourceTable && <button className="gjs-flow-secondary" onClick={addCurrentUserFormFields} type="button">
                      Añadir campos de esta colección
                    </button>}
                    {flowAction === 'set-record-field' && <section className="gjs-data-display-options">
                      <strong>Cambio</strong>
                      <p>{flowDataSourceTable
                        ? `${flowRecordMode === 'current_user' ? 'Mis datos' : 'Registro actual'} · ${flowDataSourceTable.displayName ?? flowDataSourceTable.name} → ${flowFixedField || 'elige un campo'}`
                        : 'Configura qué registro y qué información debe cambiar.'}</p>
                      <button className="gjs-flow-secondary" onClick={() => setDynamicActionDialogOpen(true)} type="button">Configurar cambio</button>
                    </section>}
                    {flowAction !== 'delete-record' && flowAction !== 'set-record-field' && <section className="gjs-data-display-options">
                      <strong>Conectar campos</strong>
                      <p>Elige qué campo del formulario llena cada campo de la colección.</p>
                      {flowFieldNames.map((field) => <label key={field}>{field}<select aria-label={`Entrada para ${field}`} onChange={(event) => setFlowFieldMappings((current) => [
                        ...current.filter((mapping) => mapping.field !== field),
                        ...(event.target.value ? [{ field, inputName: event.target.value }] : []),
                      ])} value={flowFieldMappings.find((mapping) => mapping.field === field)?.inputName ?? ''}>
                        <option value="">No enviar</option>
                        {flowInputNames.map((inputName) => <option key={inputName} value={inputName}>{inputName}</option>)}
                      </select></label>)}
                      {!flowInputNames.length && <p className="gjs-data-placeholder">Selecciona un formulario o un botón dentro de un formulario.</p>}
                    </section>}
                    {flowAction === 'create-record' && <label>Campo de la persona conectada<select aria-label="Campo automático de la persona" onChange={(event) => setFlowOwnerField(event.target.value)} value={flowOwnerField}><option value="">No guardar automáticamente</option><option value="user_id">user_id</option>{flowFieldNames.filter((field) => field !== 'user_id').map((field) => <option key={field} value={field}>{field}</option>)}</select></label>}
                    {isFlowRoleTable && flowAction === 'create-record' && <p className="gjs-data-safety">Conecta user_id con el identificador de la cuenta y role con el permiso que asignará el administrador.</p>}
                    {flowAction !== 'set-record-field' && <label>Mensaje al terminar<input aria-label="Mensaje de éxito" maxLength={300} onChange={(event) => setFlowSuccessMessage(event.target.value)} value={flowSuccessMessage} /></label>}
                    {(flowAction === 'delete-record' || flowAction === 'update-record') && <label>Confirmación opcional<input aria-label="Mensaje de confirmación" maxLength={300} onChange={(event) => setFlowConfirmMessage(event.target.value)} placeholder="Déjalo vacío para continuar sin preguntar" value={flowConfirmMessage} /></label>}
                  </>
                )}

                {flowAction !== 'set-record-field' && <button
                  className="gjs-flow-primary"
                  disabled={flowAction === 'navigate'
                    ? !resolvedFlowTargetPageId
                    : flowAction === 'toggle-record'
                      ? !resolvedFlowDataSourceTableId || !flowOwnerField.trim() || !flowRecordField.trim()
                      : !resolvedFlowDataSourceTableId
                        || ((flowAction === 'create-record' || flowAction === 'update-record' || flowAction === 'save-current-user-record') && !resolvedFlowFieldMappings.length)}
                  onClick={saveFlowConnection}
                  type="button"
                >
                  {selectedElement.targetPageId || selectedElement.recordToggle || selectedElement.dataAction
                    ? 'Actualizar conexión'
                    : 'Guardar conexión'}
                </button>}

                {selectedElement.targetPageId && (
                  <div className="gjs-flow-connected">
                    <span aria-hidden="true">✓</span>
                    <p>
                      Conectado con <strong>{pages.find((page) => page.id === selectedElement.targetPageId)?.name ?? selectedElement.targetPageId}</strong>
                      {selectedElement.screenFlow?.dataSourceTableId && (
                        <> usando <strong>{(() => {
                          const table = supabaseConfig.tables.find((candidate) =>
                            candidate.id === selectedElement.screenFlow?.dataSourceTableId)
                          return table ? collectionDisplayName(table) : selectedElement.screenFlow?.dataSourceTableId
                        })()}</strong></>
                      )}
                    </p>
                  </div>
                )}

                {selectedElement.recordToggle && (
                  <div className="gjs-flow-connected">
                    <span aria-hidden="true">✓</span>
                    <p>Conectado con <strong>{supabaseConfig.tables.find((table) => table.id === selectedElement.recordToggle?.dataSourceTableId)?.displayName ?? selectedElement.recordToggle.dataSourceTableId}</strong></p>
                  </div>
                )}

                {selectedElement.dataAction && (
                  <div className="gjs-flow-connected">
                    <span aria-hidden="true">✓</span>
                    <p>Acción conectada con <strong>{supabaseConfig.tables.find((table) => table.id === selectedElement.dataAction?.dataSourceTableId)?.displayName ?? selectedElement.dataAction.dataSourceTableId}</strong></p>
                  </div>
                )}

                {(selectedElement.targetPageId || selectedElement.recordToggle || selectedElement.dataAction) && (
                  <button className="gjs-flow-danger" onClick={removeFlowConnection} type="button">
                    Eliminar conexión
                  </button>
                )}
                {flowNotice && <p className="gjs-flow-notice" role="status">{flowNotice}</p>}
              </div>
            )}
          </div>
        </aside>
      </div>
      {pageImportOpen && (
        <PageImportDialog
          onClose={() => setPageImportOpen(false)}
          onImport={importPages}
        />
      )}
      {templateGalleryOpen && (
        <TemplateGalleryDialog
          onAdd={addTemplatePage}
          onClose={() => setTemplateGalleryOpen(false)}
        />
      )}
      {renamingPage && (
        <PageRenameDialog
          initialName={renamingPage.name}
          onClose={() => setRenamingPage(null)}
          onRename={savePageName}
        />
      )}
      {navbarLinkSettings && (
        <NavbarLinkSettingsDialog
          initialSettings={navbarLinkSettings}
          onClose={() => {
            setNavbarLinkSettings(null)
            navbarLinkSettingsComponentRef.current = null
          }}
          onSave={saveNavbarLinkSettings}
        />
      )}
      {authSettings && (
        <AuthSettingsDialog
          action={authSettings.action}
          destinationPageId={authSettings.destinationPageId ?? ''}
          metadataFields={authSettings.metadataFields ?? []}
          onClose={() => {
            setAuthSettings(null)
            authSettingsComponentRef.current = null
          }}
          onSave={saveAuthSettings}
          pages={pages}
          presentation={authSettings.presentation}
          tables={supabaseConfig.tables}
        />
      )}
      {dynamicActionDialogOpen && (
        <DynamicFieldActionDialog
          contextTables={dynamicContextTables}
          currentUserTables={dynamicCurrentUserTables}
          formInputs={flowInputNames}
          initial={{
            confirmMessage: flowConfirmMessage,
            field: flowFixedField,
            fixedValue: flowFixedValue,
            recordMode: flowRecordMode,
            successMessage: flowSuccessMessage || 'Información actualizada.',
            tableId: resolvedFlowDataSourceTableId,
            valueAmount: flowValueAmount,
            valueInputName: flowValueInputName,
            valueSource: flowValueSource,
          }}
          onClose={() => setDynamicActionDialogOpen(false)}
          onSave={saveDynamicFieldAction}
        />
      )}
      {motionDialogOpen && selectedMotionComponent && (
        <MotionSettingsDialog
          component={selectedMotionComponent}
          config={supabaseConfig}
          notice={motionNotice}
          onClose={() => setMotionDialogOpen(false)}
          onOpenData={() => {
            setMotionDialogOpen(false)
            setBlocksOpen(false)
            setLeftPanel('data')
          }}
          onSave={() => {
            setMotionDialogOpen(false)
            void editorRef.current?.store().catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : 'No se pudo guardar el componente de movimiento.')
            })
          }}
          tables={supabaseConfig.tables}
        />
      )}
    </main>
  )
}
