import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  loadEditorProjectData,
  saveEditorConnection,
  saveEditorProjectData,
  verifyEditorTable,
} from './client'
import type { EditorProjectData } from './client'

describe('editor platform function errors', () => {
  it('persists and reloads imported-library snapshots inside project data', async () => {
    let stored: EditorProjectData = {}
    const query = {
      error: null,
      eq: vi.fn(() => query),
      select: vi.fn(() => query),
      single: vi.fn(async () => ({ data: { project_data: stored }, error: null })),
      update: vi.fn((payload: { project_data: EditorProjectData }) => {
        stored = payload.project_data
        return query
      }),
    }
    const client = { from: vi.fn(() => query) } as unknown as SupabaseClient
    const projectData: EditorProjectData = {
      grapesjs: { pages: [] },
      externalLibraries: [{
        formatVersion: 1,
        fileName: 'simple-tools.js',
        id: 'simple-tools',
        name: 'Simple Tools',
        description: 'Imported proof.',
        functions: [{
          metadata: {
            id: 'flatten', name: 'Flatten', description: 'Flattens.',
            inputs: [{ name: 'matrix', type: 'number[][]', defaultValue: [[1, 2], [3]] }],
            output: { type: 'number[]' },
          },
          implementationSource: 'function flatten(matrix) { return matrix.flat() }',
        }],
      }],
    }

    await saveEditorProjectData('project-id', projectData, client)
    await expect(loadEditorProjectData('project-id', client)).resolves.toEqual(projectData)
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ project_data: projectData }))
  })

  it('shows the error returned by an Edge Function response', async () => {
    const context = {
      clone: () => context,
      json: vi.fn().mockResolvedValue({ error: 'La secret key pertenece a otro proyecto.' }),
    }
    const client = {
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: null,
          error: Object.assign(new Error('Edge Function returned a non-2xx status code'), { context }),
        }),
      },
    } as unknown as SupabaseClient

    await expect(saveEditorConnection({
      editorProjectId: 'project-id',
      projectUrl: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_example',
      secretKey: 'sb_secret_example',
    }, client)).rejects.toThrow('La secret key pertenece a otro proyecto.')
  })

  it('checks a table through the saved private editor connection', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { hasRows: true }, error: null })
    const client = { functions: { invoke } } as unknown as SupabaseClient

    await expect(verifyEditorTable({
      columns: ['id', 'user_id', 'display_name'],
      editorProjectId: 'project-id',
      tableName: 'profiles',
    }, client)).resolves.toEqual({ hasRows: true })
    expect(invoke).toHaveBeenCalledWith('manage-editor-connection', {
      body: {
        action: 'verify-table',
        columns: ['id', 'user_id', 'display_name'],
        editorProjectId: 'project-id',
        tableName: 'profiles',
      },
    })
  })
})
