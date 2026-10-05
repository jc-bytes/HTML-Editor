import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SupabaseDataPanel } from './SupabaseDataPanel'
import type { SupabaseEditorConfig } from './supabase-data'

const config: SupabaseEditorConfig = {
  projectUrl: 'https://school.supabase.co',
  publishableKey: 'sb_publishable_test_key_123456789',
  tables: [{
    id: 'profiles-table',
    name: 'profiles',
    access: 'user_owned',
    fields: [{ id: 'name', name: 'display_name', type: 'text' }],
    relations: [],
  }],
}

const baseProps = {
  config,
  editorProjectId: 'editor-project-test',
  onChange: vi.fn(),
  onInsertDataComponent: vi.fn(),
  onRemoveBinding: vi.fn(),
  onSaveBinding: vi.fn(),
  onToggleRepeater: vi.fn(),
  onUpdateDataComponent: vi.fn(),
}

describe('SupabaseDataPanel user data controls', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('keeps project data compact and element controls collapsible', () => {
    render(<SupabaseDataPanel {...baseProps} selectedElement={null} />)

    expect(screen.getByText('Mis datos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Configuración de datos/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exportar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Autenticación/ })).not.toBeInTheDocument()
  })

  it('shows automatic fields and explains that created_at already exists', () => {
    const onChange = vi.fn()
    const automaticFieldConfig: SupabaseEditorConfig = {
      ...config,
      tables: [{
        ...config.tables[0],
        fields: [{ id: 'created', name: 'created_a', type: 'datetime' }],
      }],
    }
    render(<SupabaseDataPanel {...baseProps} config={automaticFieldConfig} onChange={onChange} selectedElement={null} />)

    fireEvent.click(screen.getByRole('button', { name: /profiles/i }))
    fireEvent.click(screen.getByRole('tab', { name: 'Información' }))

    expect(screen.getByLabelText('Información automática')).toHaveTextContent('created_at')
    fireEvent.change(screen.getByDisplayValue('created_a'), { target: { value: 'created_at' } })
    expect(screen.getByRole('status')).toHaveTextContent('created_at” ya existe automáticamente')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('imports a SQL file into visual collections without removing unrelated collections', async () => {
    const onChange = vi.fn()
    render(<SupabaseDataPanel {...baseProps} onChange={onChange} selectedElement={null} />)
    const sql = `
      -- @builder-access public_read
      create table public.lessons (
        id uuid primary key,
        published boolean default false,
        title text
      );
    `

    fireEvent.change(screen.getByLabelText('Archivo SQL para importar'), {
      target: { files: [new File([sql], 'schema.sql', { type: 'application/sql' })] },
    })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      tables: expect.arrayContaining([
        expect.objectContaining({ name: 'profiles' }),
        expect.objectContaining({ name: 'lessons', access: 'public_read' }),
      ]),
    })))
    expect(screen.getByText('✓ 1 colección importada')).toBeInTheDocument()
  })

  it('downloads the editor-managed Supabase schema as SQL', () => {
    const createObjectUrl = vi.fn(() => 'blob:supabase-schema')
    const revokeObjectUrl = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<SupabaseDataPanel {...baseProps} selectedElement={null} />)

    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }))

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:supabase-schema')
    expect(screen.getByText('✓ SQL exportado')).toBeInTheDocument()
  })

  it('separates project data from selected-element controls', () => {
    const { rerender } = render(<SupabaseDataPanel {...baseProps} scope="project" selectedElement={null} />)

    expect(screen.getByText('Mis datos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Configuración de datos/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Elemento seleccionado/ })).not.toBeInTheDocument()

    rerender(<SupabaseDataPanel {...baseProps} scope="element" selectedElement={null} />)

    expect(screen.queryByText('Mis datos')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Configuración de datos/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Elemento seleccionado/ })).toBeInTheDocument()
  })

  it('separates current-user scope from repeating rows', () => {
    render(<SupabaseDataPanel {...baseProps} selectedElement={{
      bindingTarget: 'text',
      isRepeater: false,
    }} />)

    expect(screen.getByRole('option', { name: 'Información del usuario actual' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'created_at' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostrar uno por cada elemento' })).toBeInTheDocument()
  })

  it('makes descendants inherit the repeated row and locks its table', () => {
    render(<SupabaseDataPanel {...baseProps} selectedElement={{
      bindingTarget: 'text',
      inheritedRepeaterTableId: 'profiles-table',
      isRepeater: false,
    }} />)

    expect(screen.getByText(/Este elemento usa la tarjeta actual/)).toBeInTheDocument()
    expect(screen.getByLabelText('Colección')).toBeDisabled()
    expect(screen.queryByLabelText('Qué elemento mostrar')).not.toBeInTheDocument()
  })

  it('creates a collection through the student-friendly wizard', () => {
    const onChange = vi.fn()
    render(<SupabaseDataPanel {...baseProps} onChange={onChange} selectedElement={null} />)

    fireEvent.click(screen.getByRole('button', { name: '+ Crear' }))
    expect(screen.getByRole('dialog', { name: 'Crear o importar colecciones' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Visual' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Usar una plantilla/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: /Libros/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Usar esta plantilla' }))
    expect(screen.getByRole('tab', { name: 'Visual' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nombre de la colección'), { target: { value: 'Mis lecturas' } })
    fireEvent.click(screen.getByRole('button', { name: /Todos pueden verla/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear colección' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      tables: expect.arrayContaining([expect.objectContaining({
        displayName: 'Mis lecturas',
        name: 'mis_lecturas',
        setupStatus: 'draft',
      })]),
    }))
  })

  it('offers a one-profile-per-user collection template', () => {
    const onChange = vi.fn()
    render(<SupabaseDataPanel {...baseProps} onChange={onChange} selectedElement={null} />)

    fireEvent.click(screen.getByRole('button', { name: '+ Crear' }))
    fireEvent.click(screen.getByRole('button', { name: /Usar una plantilla/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: /Perfiles/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Usar esta plantilla' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear colección' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      tables: expect.arrayContaining([expect.objectContaining({
        name: 'profiles',
        access: 'user_owned',
        recordMode: 'single_per_user',
        fields: expect.arrayContaining([
          expect.objectContaining({ name: 'display_name', type: 'text' }),
          expect.objectContaining({ name: 'avatar_url', type: 'media' }),
          expect.objectContaining({ name: 'bio', type: 'long_text' }),
        ]),
      })]),
    }))
  })

  it('opens the responsive data-component wizard from the Add library request', () => {
    const onInsertDataComponent = vi.fn()
    const { rerender } = render(<SupabaseDataPanel {...baseProps} dataComponentRequest={0} onInsertDataComponent={onInsertDataComponent} selectedElement={null} />)

    expect(screen.queryByRole('button', { name: '+ Componente con datos' })).not.toBeInTheDocument()
    rerender(<SupabaseDataPanel {...baseProps} dataComponentRequest={1} onInsertDataComponent={onInsertDataComponent} selectedElement={null} />)
    const dialog = screen.getByRole('dialog', { name: 'Añadir componente con datos' })
    expect(dialog).toBeInTheDocument()
    expect(dialog.parentElement).toHaveClass('gjs-editor-theme-scope')
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: /Lista visual/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByLabelText('Formato para display_name')).toHaveValue('title')
    expect(screen.queryByLabelText('Tipo de medio')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByLabelText('Máximo de elementos por página')).toHaveValue(12)
    expect(screen.getByLabelText('Columnas en escritorio')).toHaveValue(1)
    fireEvent.change(screen.getByLabelText('Columnas en escritorio'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByLabelText('Campo de búsqueda')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Añadir a la página' }))
    expect(onInsertDataComponent).toHaveBeenCalledWith('simple_list', 'profiles-table', expect.objectContaining({
      title: 'display_name',
    }), expect.objectContaining({ mediaKind: 'image', pageSize: 12, desktopColumns: 3, pagination: true }))
  })

  it('opens existing dynamic options in edit mode and saves them without inserting a duplicate', () => {
    const onInsertDataComponent = vi.fn()
    const onUpdateDataComponent = vi.fn()
    render(<SupabaseDataPanel
      {...baseProps}
      dataComponentEditRequest={{
        mapping: { title: 'display_name' },
        options: {
          mediaKind: 'image',
          desktopColumns: 2,
          tabletColumns: 1,
          mobileColumns: 1,
          pageSize: 6,
          pagination: false,
        },
        requestId: 1,
        tableId: 'profiles-table',
        templateId: 'simple_list',
      }}
      onInsertDataComponent={onInsertDataComponent}
      onUpdateDataComponent={onUpdateDataComponent}
      selectedElement={null}
    />)

    expect(screen.getByRole('dialog', { name: 'Editar componente con datos' })).toBeInTheDocument()
    expect(screen.getByLabelText('Formato para display_name')).toHaveValue('title')
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByLabelText('Máximo de elementos por página')).toHaveValue(6)
    expect(screen.getByLabelText('Columnas en escritorio')).toHaveValue(2)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    fireEvent.change(screen.getByLabelText('Máximo de elementos por página'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onUpdateDataComponent).toHaveBeenCalledWith('simple_list', 'profiles-table', {
      title: 'display_name',
    }, expect.objectContaining({ pageSize: 9, desktopColumns: 2, pagination: false }))
    expect(onInsertDataComponent).not.toHaveBeenCalled()
  })

  it('previews the first accessible media URL in the data-component wizard', async () => {
    const mediaConfig: SupabaseEditorConfig = {
      ...config,
      tables: [{
        id: 'practices-table',
        name: 'practices',
        displayName: 'Practices',
        access: 'public_read',
        fields: [
          { id: 'title', name: 'title', type: 'text' },
          { id: 'media', name: 'media_url', type: 'media' },
        ],
        relations: [],
        setupStatus: 'verified',
      }],
    }
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      { media_url: 'https://cdn.example.com/practice.jpg' },
    ]), { status: 200 }))

    render(<SupabaseDataPanel
      {...baseProps}
      config={mediaConfig}
      dataComponentEditRequest={{
        mapping: { media: 'media_url', title: 'title' },
        options: { mediaKind: 'image' },
        requestId: 1,
        tableId: 'practices-table',
        templateId: 'carousel',
      }}
      selectedElement={null}
    />)

    expect(await screen.findByRole('img', { name: 'Vista previa de media_url' }))
      .toHaveAttribute('src', 'https://cdn.example.com/practice.jpg')
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/rest/v1/practices?'), expect.objectContaining({
      headers: expect.objectContaining({ apikey: mediaConfig.publishableKey }),
    }))
    expect(fetchSpy.mock.calls.some(([request]) => String(request).includes('media_url=not.is.null'))).toBe(true)
    expect(screen.getByRole('link', { name: /Abrir URL original/ })).toHaveAttribute(
      'href',
      'https://cdn.example.com/practice.jpg',
    )
  })

  it('resolves a storage reference to a signed media preview URL', async () => {
    const storageConfig: SupabaseEditorConfig = {
      ...config,
      tables: [{
        id: 'practices-table', name: 'practices', displayName: 'Practices', access: 'public_read',
        fields: [{ id: 'media', name: 'media_url', type: 'media' }], relations: [], setupStatus: 'verified',
      }],
    }
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => key === 'builder-auth:school.supabase.co'
        ? JSON.stringify({ access_token: 'teacher-token' })
        : null),
    })
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(async (request) => {
      const url = String(request)
      if (url.includes('/storage/v1/object/sign/')) return new Response(JSON.stringify({
        signedURL: '/object/sign/practice-reference-videos/teacher-1/practice-1/reference?token=signed',
      }), { status: 200 })
      return new Response(JSON.stringify([{
        media_url: 'storage://practice-reference-videos/teacher-1/practice-1/reference',
      }]), { status: 200 })
    })

    render(<SupabaseDataPanel
      {...baseProps}
      config={storageConfig}
      dataComponentEditRequest={{
        mapping: { media: 'media_url' }, options: { mediaKind: 'video' }, requestId: 1,
        tableId: 'practices-table', templateId: 'carousel',
      }}
      selectedElement={null}
    />)

    expect(await screen.findByLabelText('Vista previa de media_url')).toHaveAttribute(
      'src',
      'https://school.supabase.co/storage/v1/object/sign/practice-reference-videos/teacher-1/practice-1/reference?token=signed',
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://school.supabase.co/storage/v1/object/sign/practice-reference-videos/teacher-1/practice-1/reference',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer teacher-token' }),
        body: JSON.stringify({ expiresIn: 3_600 }),
      }),
    )
  })

  it('shows real table fields and sample values before choosing how to display them', async () => {
    const attemptsConfig: SupabaseEditorConfig = {
      ...config,
      tables: [{
        id: 'attempts-table', name: 'practice_attempts', displayName: 'Practice Attempts', access: 'public_read',
        fields: [
          { id: 'title', name: 'title', type: 'text' },
          { id: 'score', name: 'score', type: 'number' },
          { id: 'created', name: 'created_at', type: 'datetime' },
        ],
        relations: [], setupStatus: 'verified',
      }],
    }
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify([{
      title: 'Balance practice', score: 92, created_at: '2026-08-09T20:15:00Z',
    }]), { status: 200 }))

    render(<SupabaseDataPanel
      {...baseProps}
      config={attemptsConfig}
      dataComponentEditRequest={{
        mapping: { title: 'title' }, options: { mediaKind: 'image' }, requestId: 1,
        tableId: 'attempts-table', templateId: 'featured_detail',
      }}
      selectedElement={null}
    />)

    expect(screen.getByLabelText('Campos de Practice Attempts')).toBeInTheDocument()
    expect(await screen.findByText('92')).toBeInTheDocument()
    expect(screen.getByText('2026-08-09T20:15:00Z')).toBeInTheDocument()
    expect(screen.queryByLabelText('Tipo de medio')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar score' }))
    expect(screen.getByLabelText('Formato para score')).toHaveValue('badge')
    fireEvent.change(screen.getByLabelText('Formato para score'), { target: { value: 'description' } })
    expect(screen.getByLabelText('Formato para score')).toHaveValue('description')
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar score' }))
    expect(screen.getByRole('button', { name: 'Mostrar score' })).toBeInTheDocument()
  })

  it('allows visual edits to installed fields and previews an ALTER migration', () => {
    const installedConfig: SupabaseEditorConfig = {
      ...config,
      tables: [{
        ...config.tables[0],
        setupStatus: 'needs_installation',
        fields: [
          { id: 'name', name: 'full_name', type: 'text' },
          { id: 'avatar', name: 'avatar_url', type: 'media' },
        ],
        verifiedSchema: {
          access: 'user_owned',
          name: 'profiles',
          fields: [{ id: 'name', name: 'display_name', type: 'text' }],
          relations: [],
          verifiedAt: '2026-08-03T12:00:00.000Z',
        },
      }],
    }
    render(<SupabaseDataPanel {...baseProps} config={installedConfig} selectedElement={null} />)

    fireEvent.click(screen.getByRole('button', { name: /profiles/i }))
    fireEvent.click(screen.getByRole('tab', { name: 'Información' }))
    expect(screen.getByDisplayValue('full_name')).toBeEnabled()
    fireEvent.click(screen.getByRole('tab', { name: 'Conectar' }))

    expect(screen.getByText('2 cambios por aplicar')).toBeInTheDocument()
    expect(screen.getByText('Renombrar display_name a full_name')).toBeInTheDocument()
    expect(screen.getByText('Añadir el campo avatar_url')).toBeInTheDocument()
    expect((screen.getByLabelText('Código SQL generado') as HTMLTextAreaElement).value)
      .toContain('rename column "display_name" to "full_name"')
  })

  it('turns a media field into a configurable Storage upload', () => {
    const onChange = vi.fn()
    const mediaConfig: SupabaseEditorConfig = {
      ...config,
      tables: [{
        ...config.tables[0],
        fields: [{ id: 'avatar', name: 'avatar', type: 'media' }],
      }],
    }
    render(<SupabaseDataPanel {...baseProps} config={mediaConfig} onChange={onChange} selectedElement={null} />)

    fireEvent.click(screen.getByRole('button', { name: /profiles/i }))
    fireEvent.click(screen.getByRole('tab', { name: 'Información' }))
    fireEvent.click(screen.getByText('avatar'))
    fireEvent.change(screen.getByLabelText('Entrada para avatar'), { target: { value: 'upload' } })

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      tables: [expect.objectContaining({
        fields: [expect.objectContaining({
          name: 'avatar',
          upload: { bucket: 'profiles_avatar', kind: 'image', maxSizeMb: 10, visibility: 'private' },
        })],
      })],
    }))
  })

  it('chooses the human-readable field for a related collection', () => {
    const onChange = vi.fn()
    const relationConfig: SupabaseEditorConfig = {
      ...config,
      tables: [{
        ...config.tables[0],
        fields: [{ id: 'school', name: 'school_id', type: 'uuid' }],
        relations: [{
          id: 'profile-school', column: 'school_id', targetTableId: 'schools', targetColumn: 'id',
          displayField: 'name', onDelete: 'restrict',
        }],
      }, {
        id: 'schools', name: 'schools', access: 'public_read', relations: [],
        fields: [
          { id: 'name', name: 'name', type: 'text' },
          { id: 'city', name: 'city', type: 'text' },
        ],
      }],
    }
    render(<SupabaseDataPanel {...baseProps} config={relationConfig} onChange={onChange} selectedElement={null} />)

    fireEvent.click(screen.getByRole('button', { name: /profiles/i }))
    fireEvent.click(screen.getByRole('tab', { name: 'Avanzado' }))
    expect(screen.getByLabelText('Colección relacionada')).toHaveValue('schools')
    fireEvent.change(screen.getByLabelText('Texto visible de la relación'), { target: { value: 'city' } })

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      tables: expect.arrayContaining([expect.objectContaining({
        id: 'profiles-table',
        relations: [expect.objectContaining({ displayField: 'city' })],
      })]),
    }))
  })

  it('confirms private tables without pretending they are browser-connected', () => {
    const onChange = vi.fn()
    const privateConfig: SupabaseEditorConfig = {
      ...config,
      tables: [{
        id: 'roles-table',
        name: 'user_roles',
        displayName: 'User Roles',
        access: 'private',
        fields: [{ id: 'role', name: 'role', type: 'text' }],
        relations: [],
        setupStatus: 'draft',
      }],
    }
    render(<SupabaseDataPanel {...baseProps} config={privateConfig} onChange={onChange} selectedElement={null} />)

    expect(screen.getByText('🔒 Interna · confirma el SQL')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /User Roles/ }))
    expect(screen.getByText('🔒 Colección interna pendiente')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Comprobar colección' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar que ejecuté el SQL' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      tables: [expect.objectContaining({
        name: 'user_roles',
        setupStatus: 'verified',
        verifiedSchema: expect.objectContaining({ name: 'user_roles' }),
      })],
    }))
  })

  it('configures collection management only when a secure roles collection exists', () => {
    const onChange = vi.fn()
    const managedConfig: SupabaseEditorConfig = {
      ...config,
      tables: [config.tables[0], {
        id: 'roles', name: 'user_roles', access: 'user_owned',
        fields: [{ id: 'role', name: 'role', type: 'text' }], relations: [],
      }],
    }
    render(<SupabaseDataPanel {...baseProps} config={managedConfig} onChange={onChange} selectedElement={null} />)

    fireEvent.click(screen.getByRole('button', { name: /profiles/ }))
    fireEvent.click(screen.getByRole('tab', { name: 'Visibilidad' }))
    fireEvent.change(screen.getByLabelText('Gestión por roles'), { target: { value: 'enabled' } })

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      tables: expect.arrayContaining([expect.objectContaining({
        id: 'profiles-table',
        management: { roles: ['admin'], actions: ['select', 'update', 'delete'] },
      })]),
    }))
  })

  it('imports pasted SQL into visual collections without executing it', () => {
    const onChange = vi.fn()
    render(<SupabaseDataPanel {...baseProps} onChange={onChange} selectedElement={null} />)

    fireEvent.click(screen.getByRole('button', { name: '+ Crear' }))
    fireEvent.click(screen.getByRole('button', { name: /Empezar desde cero/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('tab', { name: 'SQL' }))
    expect(screen.getByRole('dialog', { name: 'Crear o importar colecciones' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('SQL para crear o importar'), { target: { value: `
      -- @builder-access public_read
      create table public.practices (
        id uuid primary key,
        published boolean not null default false,
        sort_order integer not null default 0,
        created_at timestamptz not null default now(),
        title text,
        mediapipe_reference jsonb
      );
    ` } })
    expect(screen.getByText('✓ 1 tabla reconocida')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Visual' }))
    expect(screen.getByDisplayValue('mediapipe_reference')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'SQL' }))
    expect((screen.getByLabelText('SQL para crear o importar') as HTMLTextAreaElement).value)
      .toContain('mediapipe_reference jsonb')
    fireEvent.click(screen.getByRole('button', { name: 'Crear desde SQL' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      tables: expect.arrayContaining([expect.objectContaining({
        name: 'practices',
        access: 'public_read',
        fields: expect.arrayContaining([expect.objectContaining({ name: 'mediapipe_reference', type: 'json' })]),
      })]),
    }))
    expect(screen.queryByRole('dialog', { name: 'Crear o importar colecciones' })).not.toBeInTheDocument()
  })

  it('keeps every imported table visible and preserves unchanged multi-table SQL', () => {
    render(<SupabaseDataPanel {...baseProps} selectedElement={null} />)
    const sourceSql = `
      -- @builder-access user_owned
      create table public.profiles (
        id uuid primary key,
        user_id uuid references auth.users(id),
        created_at timestamptz default now(),
        display_name text
      );

      -- @builder-access user_owned
      create table public.practice_attempts (
        id uuid primary key,
        user_id uuid references auth.users(id),
        created_at timestamptz default now(),
        practice_id uuid,
        score numeric
      );

      create or replace function private.keep_me() returns void language sql as $$ select $$;
    `

    fireEvent.click(screen.getByRole('button', { name: '+ Crear' }))
    fireEvent.click(screen.getByRole('button', { name: /Empezar desde cero/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('tab', { name: 'SQL' }))
    fireEvent.change(screen.getByLabelText('SQL para crear o importar'), { target: { value: sourceSql } })

    expect(screen.getByText('✓ 2 tablas reconocidas')).toBeInTheDocument()
    expect(screen.getByText('Practice Attempts')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Visual' }))
    expect(screen.getByRole('region', { name: 'Tablas importadas' })).toBeInTheDocument()
    expect(screen.getByText('2 tablas importadas')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Practice Attempts/ }))
    expect(screen.getByDisplayValue('score')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear 2 colecciones' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'SQL' }))
    expect(screen.getByText('✓ 2 tablas reconocidas')).toBeInTheDocument()
    expect((screen.getByLabelText('SQL para crear o importar') as HTMLTextAreaElement).value).toBe(sourceSql)
    expect(screen.getByText(/conservamos el SQL original completo/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Visual' }))
    fireEvent.click(screen.getByRole('tab', { name: /Practice Attempts/ }))
    fireEvent.change(screen.getByDisplayValue('score'), { target: { value: 'best_score' } })
    fireEvent.click(screen.getByRole('tab', { name: 'SQL' }))
    const regeneratedSql = (screen.getByLabelText('SQL para crear o importar') as HTMLTextAreaElement).value
    expect(screen.getByText('✓ 2 tablas reconocidas')).toBeInTheDocument()
    expect(regeneratedSql).toContain('-- Table: profiles')
    expect(regeneratedSql).toContain('-- Table: practice_attempts')
    expect(regeneratedSql).toContain('"best_score" numeric')
    expect(screen.getByText(/se regeneró con tus cambios visuales y conserva las 2 tablas/i)).toBeInTheDocument()
  })
})
