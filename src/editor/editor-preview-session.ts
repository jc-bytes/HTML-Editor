import type { NavigationContext, ProjectBundle, ProjectPage } from '../core/project'
import type { NavigationRuntimeMessage } from '../runtime/navigation-runtime'

export interface EditorPreviewDestination {
  context: NavigationContext
  pageId: string
}

export interface EditorPreviewSession extends EditorPreviewDestination {
  bundle: ProjectBundle
  history: EditorPreviewDestination[]
}

export interface EditorPreviewTransition {
  externalUrl?: string
  session: EditorPreviewSession
}

export interface EditorPreviewContextRequirement {
  contextKey: string
  dataSourceId: string
}

export type EditorPreviewPageAccess = 'public' | 'authenticated' | 'guestOnly' | 'role'

export function editorPreviewPath(page: ProjectPage) {
  const withoutExtension = page.file.replace(/\.html?$/i, '')
  const route = withoutExtension.replace(/^pages\//i, '').replace(/^\/+|\/+$/g, '')
  return route.toLowerCase() === 'index' ? '/' : `/${route}`
}

export function resolveEditorPreviewPath(bundle: ProjectBundle, requestedPath: string) {
  try {
    const pathname = new URL(requestedPath.trim(), 'https://preview.local').pathname
    const normalized = pathname.length > 1 ? pathname.replace(/\/+$/g, '') : pathname
    return bundle.manifest.pages.find((page) => editorPreviewPath(page) === normalized)
  } catch {
    return undefined
  }
}

export function editorPreviewPageAccess(
  bundle: ProjectBundle,
  page: ProjectPage,
): EditorPreviewPageAccess {
  if (page.access) return page.access
  const authentication = bundle.manifest.authentication
  if (!authentication) return 'public'
  return page.id === authentication.loginPage ? 'guestOnly' : 'authenticated'
}

export function createEditorPreviewSession(
  bundle: ProjectBundle,
  requestedPageId?: string,
  context: NavigationContext = {},
) {
  const pageId = bundle.manifest.pages.some((page) => page.id === requestedPageId)
    ? requestedPageId!
    : bundle.manifest.startPage
  const destination = { pageId, context }

  return {
    bundle,
    ...destination,
    history: [destination],
  } satisfies EditorPreviewSession
}

export function editorPreviewContextRequirements(
  bundle: ProjectBundle,
  pageId: string,
) {
  const requirements = new Map<string, EditorPreviewContextRequirement>()

  for (const connection of bundle.manifest.connections) {
    if (connection.action !== 'navigate' || connection.targetPage !== pageId) continue
    for (const [contextKey, value] of Object.entries(connection.context ?? {})) {
      if (!requirements.has(contextKey)) {
        requirements.set(contextKey, { contextKey, dataSourceId: value.dataSourceId })
      }
    }
  }

  return [...requirements.values()]
}

export async function resolveEditorPreviewContext(
  bundle: ProjectBundle,
  pageId: string,
  currentContext: NavigationContext,
  request: typeof fetch = fetch,
) {
  const resolved = { ...currentContext }
  const requirements = editorPreviewContextRequirements(bundle, pageId)

  for (const requirement of requirements) {
    if (resolved[requirement.contextKey]) continue
    const source = bundle.manifest.dataSources?.find((candidate) =>
      candidate.id === requirement.dataSourceId)
    if (!source || source.type !== 'supabase') continue

    const url = new URL(`/rest/v1/${encodeURIComponent(source.table)}`, source.projectUrl)
    url.searchParams.set('select', 'id')
    url.searchParams.set('limit', '1')
    if (source.publishedOnly) url.searchParams.set('published', 'eq.true')
    if (source.orderColumn) {
      url.searchParams.set('order', `${source.orderColumn}.${source.orderDirection ?? 'asc'}`)
    }

    try {
      const response = await request(url.href, { headers: {
        apikey: source.publishableKey,
        Authorization: `Bearer ${source.publishableKey}`,
      } })
      if (!response.ok) continue
      const records = await response.json() as Array<{ id?: unknown }>
      const recordId = records[0]?.id
      if (typeof recordId !== 'string' && typeof recordId !== 'number') continue
      resolved[requirement.contextKey] = {
        dataSourceId: source.id,
        recordId: String(recordId),
      }
    } catch {
      // A preview remains usable without fallback data when a source is offline.
    }
  }

  return resolved
}

export function applyEditorPreviewAction(
  current: EditorPreviewSession,
  message: NavigationRuntimeMessage,
): EditorPreviewTransition {
  if (message.action === 'navigate' && message.targetPage) {
    if (!current.bundle.manifest.pages.some((page) => page.id === message.targetPage)) {
      return { session: current }
    }

    const destination = {
      pageId: message.targetPage,
      context: { ...current.context, ...(message.context ?? {}) },
    }
    return {
      session: {
        ...current,
        ...destination,
        history: [...current.history, destination],
      },
    }
  }

  if (message.action === 'back') {
    if (current.history.length <= 1) return { session: current }
    const history = current.history.slice(0, -1)
    const destination = history.at(-1)!
    return { session: { ...current, ...destination, history } }
  }

  if (message.action === 'url' && message.url) {
    try {
      const url = new URL(message.url)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return { session: current, externalUrl: url.href }
      }
    } catch {
      return { session: current }
    }
  }

  return { session: current }
}
