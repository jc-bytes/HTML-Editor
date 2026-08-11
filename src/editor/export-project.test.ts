import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { ZipProjectExporter } from '../modules/exporter'
import { validateStaticArchive } from '../modules/exporter/validation/validateStaticArchive'
import { addProjectFunctionRuntime, buildEditorProjectBundle, editorProjectBundle } from './export-project'
import type { ExternalFunctionRegistration } from '../runtime/functions/external-function-registry'
import grapesjs from 'grapesjs'
import { defaultSupabaseConfig } from './supabase-data'

describe('new editor project export', () => {
  it('builds a project runtime containing only functions referenced by placed blocks', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'home', name: 'Home',
      html: '<form data-builder-function-id="multiply"></form>',
    }], 'home')
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'multiply', name: 'Multiply', description: 'Multiplies.',
        inputs: [{ name: 'left', type: 'number' }, { name: 'right', type: 'number' }],
        output: { type: 'number' },
      },
      implementation: function multiply(left: number, right: number) { return left * right },
    }, {
      metadata: {
        id: 'unused-number', name: 'Unused Number', description: 'Unused.',
        inputs: [{ name: 'value', type: 'number' }], output: { type: 'number' },
      },
      implementation: function unusedNumber(value: number) { return value },
    }]

    const withRuntime = addProjectFunctionRuntime(bundle, registrations)
    const runtime = new TextDecoder().decode(
      withRuntime.files.find((file) => file.path === 'builder-runtime/functions.js')!.bytes,
    )
    expect(runtime).toContain('multiply')
    expect(runtime).not.toContain('unused-number')
    expect(runtime).not.toContain('double-number')
  })

  it('includes registered library functions for an editable JS Lab without graphical function forms', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'home', name: 'Home',
      html: `<section data-builder-js-lab
        data-builder-js-lab-code="let x = doubleNumber(5);"
        data-builder-js-lab-output-expression="x"
        data-builder-js-lab-output-type="number"></section>`,
    }], 'home')
    const registrations: ExternalFunctionRegistration[] = [{
      metadata: {
        id: 'double-number', name: 'Double Number', description: 'Doubles.',
        inputs: [{ name: 'value', type: 'number' }], output: { type: 'number' },
      },
      implementation: function doubleNumber(value: number) { return value * 2 },
    }]

    const withRuntime = addProjectFunctionRuntime(bundle, registrations)
    const runtime = new TextDecoder().decode(
      withRuntime.files.find((file) => file.path === 'builder-runtime/functions.js')!.bytes,
    )
    expect(runtime).toContain('double-number')
    expect(runtime).toContain('data-builder-js-lab-run')
  })

  it('fails project runtime generation when a placed function is unavailable', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'home', name: 'Home', html: '<form data-builder-function-id="missing"></form>',
    }], 'home')
    expect(() => addProjectFunctionRuntime(bundle, [])).toThrow('missing')
  })

  it('keeps the explicit homepage when pages are reordered', () => {
    const editor = grapesjs.init({ headless: true, storageManager: false })
    const home = editor.Pages.getAll()[0]
    home.set({ name: 'Home', isStartPage: true })
    const homeId = home.getId()
    const secondary = editor.Pages.add({ id: 'secondary', name: 'Secondary', component: '<main>Secondary</main>' })!
    editor.Pages.move(secondary, { at: 0 })

    const bundle = editorProjectBundle(editor)

    expect(bundle.manifest.pages.map((page) => page.id)).toEqual(['secondary', homeId])
    expect(bundle.manifest.startPage).toBe(homeId)
    editor.destroy()
  })

  it('preserves body classes and background styles', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'home',
      name: 'Inicio',
      html: '<body class="site-page" style="background-color: rgb(185, 123, 123);"><main>Contenido</main></body>',
    }], 'home')
    const page = bundle.files.find((file) => file.path === 'pages/home.html')!
    const markup = new TextDecoder().decode(page.bytes)

    expect(markup).toContain('<body class="site-page" style="background-color: rgb(185, 123, 123);">')
  })

  it('hides editor-only JS Labs in preview/export while preserving visible labs', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'home',
      name: 'Inicio',
      html: `<main>
        <section data-builder-js-lab data-builder-js-lab-public="false">Editor lab</section>
        <section data-builder-js-lab data-builder-js-lab-public="true">Visible lab</section>
      </main>`,
    }], 'home')
    const page = bundle.files.find((file) => file.path === 'pages/home.html')!
    const markup = new TextDecoder().decode(page.bytes)

    expect(markup).toContain('[data-builder-js-lab][data-builder-js-lab-public="false"] { display: none !important; }')
    expect(markup).toContain('data-builder-js-lab-public="true"')
  })

  it('exports every page and preserves button navigation', async () => {
    const bundle = buildEditorProjectBundle([
      {
        id: 'inicio',
        name: 'Inicio',
        html: '<main><button data-builder-flow-action="navigate" data-builder-flow-target="practica">Practicar</button></main>',
        css: 'button { color: teal; }',
      },
      {
        id: 'practica',
        name: 'Práctica',
        html: '<main><h1>Práctica</h1></main>',
      },
    ], 'inicio')

    expect(bundle.manifest.pages).toHaveLength(2)
    expect(bundle.manifest.connections).toEqual([expect.objectContaining({
      sourcePage: 'inicio',
      targetPage: 'practica',
      action: 'navigate',
      elementId: 'inicio::main:1/button:1',
    })])

    const archive = await JSZip.loadAsync(
      await (await new ZipProjectExporter().export(bundle)).arrayBuffer(),
    )
    const home = await archive.file('pages/inicio.html')!.async('string')
    const practice = await archive.file('pages/practica.html')!.async('string')
    const index = await archive.file('index.html')!.async('string')

    expect(home).toContain('data-builder-flow-target="practica"')
    expect(home).toContain('"targetPage":"practica"')
    expect(home).toContain('"practica":"practica.html"')
    expect(home).toContain('src="../builder-runtime/navigation.js"')
    expect(practice).toContain('<h1>Práctica</h1>')
    expect(index).toContain('pages/inicio.html')
  })

  it('ignores connections whose destination page was deleted', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'home',
      name: 'Home',
      html: '<button data-builder-flow-action="navigate" data-builder-flow-target="missing">Open</button>',
    }], 'home')

    expect(bundle.manifest.connections).toEqual([])
  })

  it('exports a reusable save-or-remove record action', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'detail',
      name: 'Detalle',
      html: `<button data-builder-flow-action="toggle-record"
        data-builder-flow-data-source="table-favorites"
        data-builder-flow-owner-field="user_id"
        data-builder-flow-record-field="practice_id"
        data-builder-flow-context="record"
        data-builder-flow-active-label="★ Guardado"
        data-builder-flow-inactive-label="☆ Guardar">☆ Guardar</button>`,
    }], 'detail', 'Favorites', {
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      tables: [{
        id: 'table-favorites',
        name: 'favorite_practices',
        access: 'user_owned',
        fields: [
          { id: 'favorite-user', name: 'user_id', type: 'uuid' },
          { id: 'favorite-practice', name: 'practice_id', type: 'uuid' },
        ],
        relations: [],
      }],
    })

    expect(bundle.manifest.recordToggles).toEqual([expect.objectContaining({
      pageId: 'detail',
      elementId: 'detail::button:1',
      dataSourceId: 'supabase-table_favorites',
      ownerField: 'user_id',
      recordField: 'practice_id',
      contextKey: 'record',
    })])
  })

  it('exports a generic form action with field mappings', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'projects',
      name: 'Projects',
      html: `<form data-builder-flow-action="create-record"
        data-builder-flow-data-source="table-projects"
        data-builder-flow-owner-field="user_id"
        data-builder-flow-field-map='[{"field":"title","inputName":"project_title"}]'
        data-builder-flow-success-message="Proyecto creado.">
        <input name="project_title"><button type="submit">Create</button>
      </form>`,
    }], 'projects', 'Projects', {
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      tables: [{
        id: 'table-projects', name: 'projects', access: 'user_owned',
        fields: [{ id: 'title', name: 'title', type: 'text' }], relations: [],
      }],
    })

    expect(bundle.manifest.dataActions).toEqual([expect.objectContaining({
      action: 'create',
      pageId: 'projects',
      elementId: 'projects::form:1',
      dataSourceId: 'supabase-table_projects',
      ownerField: 'user_id',
      fieldMappings: [{ field: 'title', inputName: 'project_title' }],
      successMessage: 'Proyecto creado.',
    })])
  })

  it('exports a current-user form as an upsert action', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'profile', name: 'Profile', html: `<form data-builder-flow-action="save-current-user-record"
        data-builder-flow-data-source="profiles-table" data-builder-flow-owner-field="user_id"
        data-builder-flow-field-map='[{"field":"display_name","inputName":"display_name"}]'
        data-builder-flow-success-message="Cambios guardados."><input name="display_name"></form>`,
    }], 'profile', 'Profile', {
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      tables: [{
        id: 'profiles-table', name: 'profiles', access: 'user_owned', recordMode: 'single_per_user',
        fields: [{ id: 'name', name: 'display_name', type: 'text' }], relations: [],
      }],
    })

    expect(bundle.manifest.dataActions).toEqual([expect.objectContaining({
      action: 'upsert', ownerField: 'user_id',
      fieldMappings: [{ field: 'display_name', inputName: 'display_name' }],
    })])
  })

  it('preserves Storage bucket settings in the exported site', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'profile', name: 'Profile', html: '<main>Profile</main>',
    }], 'profile', 'Profile', {
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      tables: [{
        id: 'profiles', name: 'profiles', access: 'user_owned', relations: [],
        fields: [{
          id: 'avatar', name: 'avatar', type: 'media',
          upload: { bucket: 'profile_images', kind: 'image', maxSizeMb: 5, visibility: 'public' },
        }],
      }],
    })

    expect(bundle.manifest.dataSources).toEqual([expect.objectContaining({
      storageBuckets: [{ name: 'profile_images', public: true }],
    })])
    const setupSql = new TextDecoder().decode(
      bundle.files.find((file) => file.path === 'database/setup.sql')?.bytes,
    )
    expect(setupSql).toContain("values ('profile_images', 'profile_images', true, 5242880")
  })

  it('exports related fields, relation filters, and dropdown metadata', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'articles', name: 'Articles', html: `<main data-builder-data-component="simple_list">
        <input data-builder-search-field="related_author_id.display_name">
        <section data-builder-repeater="articles" data-builder-sort-field="related_author_id.display_name" data-builder-sort-direction="desc">
          <h2 data-builder-bind-field="related_author_id.display_name" data-builder-bind-target="text" data-builder-data-source="articles"></h2>
        </section>
      </main>`,
    }], 'articles', 'Articles', {
      projectUrl: 'https://school.supabase.co', publishableKey: 'sb_publishable_test_key_123456789',
      tables: [{
        id: 'authors', name: 'authors', access: 'public_read', relations: [],
        fields: [{ id: 'name', name: 'display_name', type: 'text' }],
      }, {
        id: 'articles', name: 'articles', access: 'public_read',
        fields: [{ id: 'author', name: 'author_id', type: 'uuid' }],
        relations: [{
          id: 'article-author', column: 'author_id', targetTableId: 'authors', targetColumn: 'id',
          displayField: 'display_name', onDelete: 'restrict',
        }],
      }],
    })

    expect(bundle.manifest.dataSources?.find((source) => source.id === 'supabase-articles'))
      .toEqual(expect.objectContaining({ relations: [expect.objectContaining({
        alias: 'related_author_id', table: 'authors', displayField: 'display_name',
        dataSourceId: 'supabase-authors',
      })] }))
    expect(bundle.manifest.bindings).toEqual([expect.objectContaining({
      field: 'related_author_id.display_name',
    })])
    expect(bundle.manifest.repeaters).toEqual([expect.objectContaining({
      searchField: 'related_author_id.display_name',
      orderColumn: 'related_author_id.display_name',
    })])
  })

  it('exports a manager button as a fixed field update', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'manage', name: 'Manage', html: `<button data-builder-flow-action="set-record-field"
        data-builder-flow-data-source="articles" data-builder-flow-fixed-field="published"
        data-builder-flow-fixed-value="true" data-builder-flow-record-mode="current_user"
        data-builder-flow-value-source="current_user" data-builder-flow-owner-field="user_id"
        data-builder-flow-success-message="Publicado.">Publicar</button>`,
    }], 'manage', 'Manage', {
      projectUrl: 'https://school.supabase.co', publishableKey: 'sb_publishable_test_key_123456789',
      tables: [{
        id: 'articles', name: 'articles', access: 'public_read', fields: [], relations: [],
        management: { roles: ['admin'], actions: ['select', 'update'] },
      }, {
        id: 'roles', name: 'user_roles', access: 'user_owned', fields: [{ id: 'role', name: 'role', type: 'text' }], relations: [],
      }],
    })

    expect(bundle.manifest.dataActions).toEqual([expect.objectContaining({
      action: 'set', fixedField: 'published', fixedValue: 'true', recordMode: 'current_user',
      valueSource: 'current_user', ownerField: 'user_id',
    })])
  })

  it('exports ordinary navigation when table definitions exist without Supabase credentials', async () => {
    const bundle = buildEditorProjectBundle([
      {
        id: 'inicio',
        name: 'Inicio',
        html: '<button data-builder-flow-action="navigate" data-builder-flow-target="practica">Practicar</button>',
      },
      {
        id: 'practica',
        name: 'Práctica',
        html: '<h1>Práctica</h1>',
      },
    ], 'inicio', 'Sitio sin datos', defaultSupabaseConfig)

    expect(bundle.manifest.dataSources).toBeUndefined()
    expect(bundle.manifest.connections[0].context).toBeUndefined()

    const archive = await new ZipProjectExporter().export(bundle)
    await expect(validateStaticArchive(archive)).resolves.toEqual({ valid: true, errors: [] })
  })

  it('turns an access page into project-wide authentication without requiring a table', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'home',
      name: 'Home',
      html: '<main><h1>Home</h1></main>',
    }, {
      id: 'access',
      name: 'Access',
      html: '<form data-builder-auth-action="login"><input name="email"><input name="password"></form>',
    }], 'home', 'Protected site', {
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      tables: [],
    })

    expect(bundle.manifest.authentication).toEqual({
      provider: 'supabase',
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      loginPage: 'access',
      afterLoginPage: 'home',
      afterLogoutPage: 'access',
    })
    expect(bundle.manifest.pages).toEqual([
      expect.objectContaining({ id: 'home', access: 'authenticated' }),
      expect.objectContaining({ id: 'access', access: 'guestOnly' }),
    ])
  })

  it('exports page-level public, private, and role access', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'home',
      name: 'Home',
      access: 'public',
      html: '<main><h1>Home</h1></main>',
    }, {
      id: 'admin',
      name: 'Admin',
      access: 'role',
      roles: ['admin', 'teacher'],
      html: '<main><h1>Admin</h1></main>',
    }, {
      id: 'account',
      name: 'Account',
      access: 'authenticated',
      html: '<main><h1>Account</h1></main>',
    }, {
      id: 'access',
      name: 'Access',
      html: '<form data-builder-auth-action="login"><input name="email"></form>',
    }], 'home', 'Access settings', {
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      tables: [{
        access: 'user_owned',
        fields: [{ id: 'role', name: 'role', type: 'text' }],
        id: 'roles-table',
        name: 'user_roles',
        relations: [],
      }],
    })

    expect(bundle.manifest.pages).toEqual([
      expect.objectContaining({ id: 'home', access: 'public' }),
      expect.objectContaining({ id: 'admin', access: 'role', roles: ['admin', 'teacher'] }),
      expect.objectContaining({ id: 'account', access: 'authenticated' }),
      expect.objectContaining({ id: 'access', access: 'guestOnly' }),
    ])
  })

  it('requires Supabase credentials when an access page exists', () => {
    expect(() => buildEditorProjectBundle([{
      id: 'access',
      name: 'Access',
      html: '<form data-builder-auth-action="login"></form>',
    }], 'access')).toThrow(/Conecta Supabase/)
  })

  it('exports Supabase bindings, repeaters, row context, and setup SQL', async () => {
    const bundle = buildEditorProjectBundle([
      {
        id: 'catalog',
        name: 'Catalog',
        html: `<section data-builder-data-component="card_grid">
          <span data-builder-fixed-filter="true" data-builder-filter-field="difficulty" data-builder-filter-operator="gte" data-builder-filter-value="2" hidden></span>
          <form data-builder-filter-form>
            <input data-builder-search-field="title">
            <fieldset data-builder-filter-control="number" data-builder-filter-field="difficulty"></fieldset>
            <select data-builder-sort-control="true"><option data-field="title" value="title.asc">Title</option></select>
          </form>
          <article data-builder-repeater="table-practices" data-builder-sort-field="difficulty" data-builder-sort-direction="desc" data-builder-flow-action="navigate" data-builder-flow-target="detail">
            <h2 data-builder-data-source="table-practices" data-builder-bind-field="title" data-builder-bind-target="text">Title</h2>
          </article>
        </section>`,
      },
      {
        id: 'detail',
        name: 'Detail',
        html: '<h1 data-builder-data-source="table-practices" data-builder-bind-field="title" data-builder-bind-target="text">Title</h1>',
      },
    ], 'catalog', 'Data site', {
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      tables: [{
        id: 'table-practices',
        name: 'practice_items',
        access: 'public_read',
        fields: [{ id: 'title', name: 'title', type: 'text' }, { id: 'difficulty', name: 'difficulty', type: 'number' }],
        relations: [],
      }, {
        id: 'table-progress',
        name: 'progress',
        access: 'user_owned',
        fields: [{ id: 'score', name: 'score', type: 'number' }],
        relations: [],
      }],
    })

    expect(bundle.manifest.dataSources).toEqual(expect.arrayContaining([expect.objectContaining({
      type: 'supabase',
      table: 'practice_items',
      publishedOnly: true,
    }), expect.objectContaining({
      table: 'progress',
      publishedOnly: false,
      requiresAuth: true,
    })]))
    expect(bundle.manifest.bindings).toHaveLength(2)
    expect(bundle.manifest.repeaters).toHaveLength(1)
    expect(bundle.manifest.repeaters?.[0]).toMatchObject({
      orderColumn: 'difficulty',
      orderDirection: 'desc',
      fixedFilters: [{ field: 'difficulty', operator: 'gte', value: '2' }],
      searchField: 'title',
      filterControls: [{ field: 'difficulty', kind: 'number' }],
      visitorSortFields: ['title'],
    })
    expect(bundle.manifest.connections[0].context?.record.recordId).toBe('$record.id')
    expect(bundle.manifest.connections[0].context?.record.dataSourceId)
      .toBe('supabase-table_practices')
    expect(new TextDecoder().decode(
      bundle.files.find((file) => file.path === 'database/setup.sql')?.bytes,
    )).toContain('enable row level security')
  })

  it('exports navigation using a related record from the repeated row', () => {
    const bundle = buildEditorProjectBundle([
      {
        id: 'home',
        name: 'Home',
        html: `<article data-builder-repeater="table-attempts">
          <button
            data-builder-flow-action="navigate"
            data-builder-flow-target="practice"
            data-builder-flow-data-source="table-practices"
            data-builder-flow-record-field="practice_id"
          >Open practice</button>
        </article>`,
      },
      { id: 'practice', name: 'Practice', html: '<h1>Practice</h1>' },
    ], 'home', 'Related navigation', {
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      tables: [{
        id: 'table-attempts',
        name: 'practice_attempts',
        access: 'user_owned',
        fields: [
          { id: 'score', name: 'score', type: 'number' },
          { id: 'practice-id', name: 'practice_id', type: 'uuid' },
        ],
        relations: [{
          id: 'attempt-practice',
          column: 'practice_id',
          targetTableId: 'table-practices',
          targetColumn: 'id',
          onDelete: 'cascade',
        }],
      }, {
        id: 'table-practices',
        name: 'practices',
        access: 'public_read',
        fields: [{ id: 'title', name: 'title', type: 'text' }],
        relations: [],
      }],
    })

    expect(bundle.manifest.connections[0].context?.record).toEqual({
      dataSourceId: 'supabase-table_practices',
      recordId: '$record.practice_id',
    })
  })

  it('exports a current-user single-row binding independently from repeat mode', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'profile',
      name: 'Profile',
      html: '<h1 data-builder-data-source="profiles-table" data-builder-data-scope="first" data-builder-bind-field="display_name" data-builder-bind-target="text">Name</h1>',
    }], 'profile', 'Profile site', {
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      tables: [{
        id: 'profiles-table',
        name: 'profiles',
        access: 'user_owned',
        fields: [{ id: 'name', name: 'display_name', type: 'text' }],
        relations: [],
      }],
    })

    expect(bundle.manifest.repeaters).toBeUndefined()
    expect(bundle.manifest.bindings).toEqual([expect.objectContaining({
      dataSourceId: 'supabase-profiles_table',
      sourceMode: 'first',
      field: 'display_name',
    })])
    expect(bundle.manifest.dataSources?.[0]).toEqual(expect.objectContaining({
      requiresAuth: true,
      table: 'profiles',
    }))
  })

  it('exports a generic motion activity and its runtime', async () => {
    const bundle = buildEditorProjectBundle([{
      id: 'practice',
      name: 'Practice',
      html: `<section data-motion-activity="true"
        data-motion-reference-source="url"
        data-motion-reference-url="https://media.example/reference.mp4"
        data-motion-duration="2500"
        data-vision-model="holistic-landmarker"
        data-vision-landmarks="hands,pose"
        data-vision-passing-score="80"></section>`,
    }], 'practice')

    expect(bundle.manifest.motionActivities).toEqual([expect.objectContaining({
      id: 'practice-motion-1',
      pageId: 'practice',
      mode: 'compare',
      input: { type: 'camera', durationMs: 2500, facingMode: 'user' },
      processing: { checkpointReduction: true, smoothing: 3 },
      evaluator: { type: 'sequence', passingScore: 80 },
      detector: expect.objectContaining({ task: 'holistic-landmarker', minConfidence: 0.5 }),
      reference: { type: 'url', url: 'https://media.example/reference.mp4' },
    })])

    const archive = await JSZip.loadAsync(
      await (await new ZipProjectExporter().export(bundle)).arrayBuffer(),
    )
    const practice = await archive.file('pages/practice.html')!.async('string')
    expect(archive.file('motion-runtime/analysis.js')).not.toBeNull()
    expect(practice).toContain('data-motion-config="true"')
    expect(practice).toContain('src="../motion-runtime/analysis.js"')
    await expect(validateStaticArchive(await new ZipProjectExporter().export(bundle)))
      .resolves.toEqual({ valid: true, errors: [] })
  })

  it('keeps result previews editor-only while exporting the display choice', () => {
    const bundle = buildEditorProjectBundle([{
      id: 'practice',
      name: 'Practice',
      html: `<section data-motion-activity="true" data-motion-show-results="true">
        <div data-motion-results data-motion-design-preview="true">56%</div>
      </section>`,
    }], 'practice')
    const page = bundle.files.find((file) => file.path === 'pages/practice.html')!
    const markup = new TextDecoder().decode(page.bytes)

    expect(bundle.manifest.motionActivities?.[0]?.presentation.showResults).toBe(true)
    expect(markup).not.toContain('data-motion-design-preview')
    expect(markup).toContain('data-motion-results="" hidden=""')
  })
})
