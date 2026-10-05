import { describe, expect, it, vi } from 'vitest'
import type { ProjectBundle } from '../core/project'
import {
  applyEditorPreviewAction,
  createEditorPreviewSession,
  editorPreviewContextRequirements,
  editorPreviewPageAccess,
  editorPreviewPath,
  resolveEditorPreviewContext,
  resolveEditorPreviewPath,
} from './editor-preview-session'

const bundle: ProjectBundle = {
  manifest: {
    version: 2,
    name: 'Preview',
    startPage: 'catalog',
    pages: [
      { id: 'catalog', name: 'Catalog', file: 'pages/catalog.html' },
      { id: 'detail', name: 'Detail', file: 'pages/detail.html' },
    ],
    connections: [],
    elementOverrides: [],
  },
  files: [],
}

describe('editor preview session', () => {
  it('starts on the selected editor page when it exists', () => {
    const session = createEditorPreviewSession(bundle, 'detail')

    expect(session.pageId).toBe('detail')
    expect(session.context).toEqual({})
    expect(session.history).toEqual([{ pageId: 'detail', context: {} }])
  })

  it('discovers and loads a missing record context for a directly opened detail preview', async () => {
    const contextualBundle: ProjectBundle = {
      ...bundle,
      manifest: {
        ...bundle.manifest,
        dataSources: [{
          id: 'supabase-practices',
          name: 'practices',
          type: 'supabase',
          projectUrl: 'https://school.supabase.co',
          publishableKey: 'sb_publishable_test_key_123456789',
          table: 'practices',
          publishedOnly: true,
          orderColumn: 'sort_order',
          orderDirection: 'asc',
        }],
        connections: [{
          id: 'open-detail',
          sourcePage: 'catalog',
          elementId: 'catalog::article:1',
          event: 'click',
          action: 'navigate',
          targetPage: 'detail',
          context: {
            record: { dataSourceId: 'supabase-practices', recordId: '$record.id' },
          },
        }],
      },
    }
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'practice-7' }],
    })

    expect(editorPreviewContextRequirements(contextualBundle, 'detail')).toEqual([{
      contextKey: 'record',
      dataSourceId: 'supabase-practices',
    }])
    await expect(resolveEditorPreviewContext(
      contextualBundle,
      'detail',
      {},
      request as typeof fetch,
    )).resolves.toEqual({
      record: { dataSourceId: 'supabase-practices', recordId: 'practice-7' },
    })
    expect(request).toHaveBeenCalledWith(
      'https://school.supabase.co/rest/v1/practices?select=id&limit=1&published=eq.true&order=sort_order.asc',
      { headers: {
        apikey: 'sb_publishable_test_key_123456789',
        Authorization: 'Bearer sb_publishable_test_key_123456789',
      } },
    )
  })

  it('keeps an existing selected record instead of replacing it', async () => {
    const contextualBundle: ProjectBundle = {
      ...bundle,
      manifest: {
        ...bundle.manifest,
        connections: [{
          id: 'open-detail', sourcePage: 'catalog', elementId: 'catalog::article:1',
          event: 'click', action: 'navigate', targetPage: 'detail',
          context: { record: { dataSourceId: 'supabase-practices', recordId: '$record.id' } },
        }],
      },
    }
    const request = vi.fn()
    const context = { record: { dataSourceId: 'supabase-practices', recordId: 'chosen' } }

    await expect(resolveEditorPreviewContext(
      contextualBundle,
      'detail',
      context,
      request as typeof fetch,
    )).resolves.toEqual(context)
    expect(request).not.toHaveBeenCalled()
  })

  it('carries the clicked record context to the destination and restores it on back', () => {
    const started = createEditorPreviewSession(bundle, 'catalog')
    const navigated = applyEditorPreviewAction(started, {
      source: 'builder-navigation-runtime',
      action: 'navigate',
      targetPage: 'detail',
      context: {
        record: { dataSourceId: 'supabase-practices', recordId: 'practice-2' },
      },
    }).session

    expect(navigated.pageId).toBe('detail')
    expect(navigated.context.record?.recordId).toBe('practice-2')

    const returned = applyEditorPreviewAction(navigated, {
      source: 'builder-navigation-runtime',
      action: 'back',
    }).session
    expect(returned.pageId).toBe('catalog')
    expect(returned.context).toEqual({})
  })

  it('ignores deleted destinations and permits only http(s) external URLs', () => {
    const session = createEditorPreviewSession(bundle)
    const missing = applyEditorPreviewAction(session, {
      source: 'builder-navigation-runtime',
      action: 'navigate',
      targetPage: 'missing',
    })
    const unsafe = applyEditorPreviewAction(session, {
      source: 'builder-navigation-runtime',
      action: 'url',
      url: 'javascript:alert(1)',
    })
    const safe = applyEditorPreviewAction(session, {
      source: 'builder-navigation-runtime',
      action: 'url',
      url: 'https://example.com/path',
    })

    expect(missing.session).toBe(session)
    expect(unsafe.externalUrl).toBeUndefined()
    expect(safe.externalUrl).toBe('https://example.com/path')
  })

  it('maps exported page files to editable site paths', () => {
    expect(editorPreviewPath(bundle.manifest.pages[0])).toBe('/catalog')
    expect(resolveEditorPreviewPath(bundle, '/detail?from=test')?.id).toBe('detail')
    expect(resolveEditorPreviewPath(bundle, '/missing')).toBeUndefined()
  })

  it('reports the effective page access used by the runtime guard', () => {
    const authenticatedBundle: ProjectBundle = {
      ...bundle,
      manifest: {
        ...bundle.manifest,
        authentication: {
          provider: 'supabase',
          projectUrl: 'https://school.supabase.co',
          publishableKey: 'sb_publishable_test_key_123456789',
          loginPage: 'catalog',
          afterLoginPage: 'detail',
          afterLogoutPage: 'catalog',
        },
      },
    }

    expect(editorPreviewPageAccess(authenticatedBundle, authenticatedBundle.manifest.pages[0]))
      .toBe('guestOnly')
    expect(editorPreviewPageAccess(authenticatedBundle, authenticatedBundle.manifest.pages[1]))
      .toBe('authenticated')
  })
})
