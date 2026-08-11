import { describe, expect, it } from 'vitest'
import {
  compatibleFieldsForSlot,
  createDataComponentMarkup,
  dataComponentDesignPreviewCount,
  dataComponentStyles,
  findDataComponentRoot,
  readDataComponentSettings,
  suggestDataComponentMapping,
} from './data-component-templates'
import { buildEditorProjectBundle } from './export-project'
import type { SupabaseTableConfig } from './supabase-data'

const table: SupabaseTableConfig = {
  id: 'practices-table',
  displayName: 'Prácticas',
  name: 'practices',
  access: 'public_read',
  fields: [
    { id: 'title', name: 'practice_title', type: 'text' },
    { id: 'description', name: 'description', type: 'long_text' },
    { id: 'media', name: 'media_url', type: 'media' },
    { id: 'difficulty', name: 'difficulty', type: 'number' },
  ],
  relations: [],
}

describe('responsive data component templates', () => {
  it('suggests semantic fields without reusing a column', () => {
    expect(suggestDataComponentMapping('card_grid', table)).toEqual({
      media: 'media_url',
      title: 'practice_title',
      description: 'description',
      badge: 'difficulty',
    })
  })

  it('does not mistake a JSON mediapipe result for image or video media', () => {
    const attempts: SupabaseTableConfig = {
      ...table,
      fields: [
        { id: 'score', name: 'score', type: 'number' },
        { id: 'feedback', name: 'feedback', type: 'long_text' },
        { id: 'result', name: 'mediapipe_result', type: 'json' },
      ],
    }

    expect(suggestDataComponentMapping('featured_detail', attempts)).toEqual({
      description: 'feedback',
      badge: 'score',
    })
  })

  it('creates a repeated card with safe data bindings', () => {
    const html = createDataComponentMarkup('card_grid', table.id, {
      media: 'media_url',
      title: 'practice_title',
      description: 'description',
    })

    expect(html).toContain('data-builder-repeater="practices-table"')
    expect(html).toContain('data-builder-page-size="12"')
    expect(html).toContain('data-builder-pagination="true"')
    expect(html).toContain('data-builder-design-preview-count="8"')
    expect(html).toContain('--builder-data-cols-desktop:4')
    expect(html).toContain('--builder-data-cols-tablet:4')
    expect(html).toContain('--builder-data-cols-mobile:2')
    expect(html).toContain('data-builder-bind-field="media_url"')
    expect(html).toContain('data-builder-bind-target="src"')
    expect(html).toContain('data-builder-bind-field="practice_title"')
    expect(html).toContain('data-builder-data-scope="context"')
  })

  it('fills the configured design grid with unbound placeholder cards', () => {
    const html = createDataComponentMarkup('card_grid', table.id, {
      media: 'media_url',
      title: 'practice_title',
      description: 'description',
    }, { mediaKind: 'image', desktopColumns: 3, tabletColumns: 2, mobileColumns: 1, pageSize: 6 })
    const document = new DOMParser().parseFromString(html, 'text/html')

    expect(document.querySelectorAll('.builder-data-card')).toHaveLength(6)
    expect(document.querySelectorAll('[data-builder-design-placeholder="true"]')).toHaveLength(5)
    expect(document.querySelectorAll('[data-builder-design-placeholder][aria-hidden]')).toHaveLength(0)
    expect(document.querySelectorAll('[data-builder-repeater]')).toHaveLength(1)
    expect(document.querySelectorAll('[data-builder-bind-field="practice_title"]')).toHaveLength(1)
    expect(document.body.textContent).toContain('Título del elemento: practice title')
  })

  it('limits editor samples to two rows without changing the runtime page size', () => {
    const html = createDataComponentMarkup('card_grid', table.id, {
      title: 'practice_title',
    }, { mediaKind: 'image', desktopColumns: 3, tabletColumns: 2, mobileColumns: 1, pageSize: 100 })
    const document = new DOMParser().parseFromString(html, 'text/html')

    expect(dataComponentDesignPreviewCount('card_grid', {
      mediaKind: 'image', desktopColumns: 3, tabletColumns: 2, mobileColumns: 1, pageSize: 100,
    })).toBe(6)
    expect(document.querySelectorAll('.builder-data-card')).toHaveLength(6)
    expect(document.querySelector('[data-builder-repeater]')?.getAttribute('data-builder-page-size')).toBe('100')
    expect(document.querySelector('[data-builder-repeater]')?.getAttribute('data-builder-design-preview-count')).toBe('6')
  })

  it('recovers dynamic options from generated component markup', () => {
    const html = createDataComponentMarkup('simple_list', table.id, {
      media: 'media_url',
      title: 'practice_title',
      description: 'description',
      badge: 'difficulty',
    }, { mediaKind: 'video', desktopColumns: 2, tabletColumns: 1, mobileColumns: 1, pageSize: 7, pagination: false })
    const document = new DOMParser().parseFromString(html, 'text/html')
    const nestedTitle = document.querySelector('h3')!
    const root = findDataComponentRoot(nestedTitle)!

    expect(root.getAttribute('data-builder-data-component')).toBe('simple_list')
    expect(readDataComponentSettings(root)).toEqual({
      mapping: {
        badge: 'difficulty',
        description: 'description',
        media: 'media_url',
        title: 'practice_title',
      },
      options: {
        desktopColumns: 2,
        fixedFilters: [],
        mediaKind: 'video',
        mobileColumns: 1,
        pageSize: 7,
        pagination: false,
        sortDirection: 'asc',
        tabletColumns: 1,
        visitorFilters: [],
        visitorSort: false,
        visitorSortFields: [],
      },
      tableId: table.id,
      templateId: 'simple_list',
    })
  })

  it('recovers an older featured card even when its outer component marker is missing', () => {
    const html = createDataComponentMarkup('featured_detail', table.id, {
      title: 'practice_title',
      description: 'description',
      badge: 'difficulty',
    })
    const document = new DOMParser().parseFromString(html, 'text/html')
    const wrapper = document.querySelector<HTMLElement>('[data-builder-data-component]')!
    const featured = wrapper.querySelector<HTMLElement>('.builder-data-featured')!
    wrapper.replaceWith(featured)
    const nestedTitle = featured.querySelector('h2')!
    const root = findDataComponentRoot(nestedTitle)!

    expect(root).toBe(featured)
    expect(readDataComponentSettings(root)).toMatchObject({
      templateId: 'featured_detail',
      tableId: table.id,
      mapping: {
        title: 'practice_title',
        description: 'description',
        badge: 'difficulty',
      },
    })
  })

  it('creates a single-record detail component and responsive breakpoints', () => {
    const html = createDataComponentMarkup('featured_detail', table.id, { title: 'practice_title' })
    expect(html).toContain('data-builder-repeater="practices-table"')
    expect(html).toContain('data-builder-page-size="1"')
    expect(html).toContain('data-builder-data-scope="context"')
    expect(dataComponentStyles).toContain('@media(max-width:900px)')
    expect(dataComponentStyles).toContain('@media(max-width:600px)')
  })

  it('only offers compatible fields that really exist in the selected collection', () => {
    const smallTable: SupabaseTableConfig = {
      ...table,
      fields: [
        { id: 'cover', name: 'cover_image', type: 'media' },
        { id: 'title', name: 'title', type: 'text' },
      ],
    }
    const mapping = { media: 'cover_image', title: 'title' }

    expect(compatibleFieldsForSlot('card_grid', 'media', smallTable, mapping).map((field) => field.name))
      .toEqual(['cover_image'])
    expect(compatibleFieldsForSlot('card_grid', 'title', smallTable, mapping).map((field) => field.name))
      .toEqual(['title'])
    expect(compatibleFieldsForSlot('card_grid', 'description', smallTable, mapping)).toEqual([])
    expect(compatibleFieldsForSlot('card_grid', 'badge', smallTable, mapping)).toEqual([])
  })

  it('creates and recovers generic query and visitor controls', () => {
    const html = createDataComponentMarkup('card_grid', table.id, { title: 'practice_title' }, {
      mediaKind: 'image',
      sortField: 'difficulty',
      sortDirection: 'desc',
      fixedFilters: [{ field: 'difficulty', operator: 'gte', value: '2' }],
      searchField: 'practice_title',
      visitorFilters: [{ field: 'practice_title', kind: 'text' }, { field: 'difficulty', kind: 'number' }],
      visitorSort: true,
      visitorSortFields: ['practice_title', 'difficulty'],
    })
    const document = new DOMParser().parseFromString(html, 'text/html')
    const root = document.querySelector<HTMLElement>('[data-builder-data-component]')!
    const settings = readDataComponentSettings(root)!

    expect(root.querySelector('[data-builder-search-field="practice_title"]')).not.toBeNull()
    expect(root.querySelector('[data-builder-filter-control="text"][data-builder-filter-field="practice_title"]')).toBeNull()
    expect(root.querySelector('[data-builder-filter-bound="min"]')).not.toBeNull()
    expect(settings.options).toMatchObject({
      sortField: 'difficulty',
      sortDirection: 'desc',
      fixedFilters: [{ field: 'difficulty', operator: 'gte', value: '2' }],
      searchField: 'practice_title',
      visitorFilters: [{ field: 'difficulty', kind: 'number' }],
      visitorSort: true,
      visitorSortFields: ['practice_title', 'difficulty'],
    })
  })

  it('renders mapped media as an accessible video when requested', () => {
    const html = createDataComponentMarkup('card_grid', table.id, { media: 'media_url' }, { mediaKind: 'video' })
    expect(html).toContain('<video class="builder-data-card__media"')
    expect(html).toContain('aria-hidden="true" muted playsinline preload="metadata" tabindex="-1"')
    expect(html).not.toContain(' controls')
    expect(html).toContain('data-builder-bind-target="src"')
    expect(dataComponentStyles).toContain('video.builder-data-card__media')
    expect(dataComponentStyles).toContain('pointer-events:none')
  })

  it('omits every visual slot configured as No mostrar', () => {
    const templateIds = ['card_grid', 'carousel', 'simple_list', 'featured_detail'] as const

    templateIds.forEach((templateId) => {
      const html = createDataComponentMarkup(templateId, table.id, {
        title: 'practice_title',
        description: 'description',
      })
      const document = new DOMParser().parseFromString(html, 'text/html')

      expect(document.querySelector('.builder-data-card__media,.builder-data-list__media,.builder-data-featured__media')).toBeNull()
      expect(document.querySelector('.builder-data-badge')).toBeNull()
      expect(document.body.textContent).not.toContain('Imagen o video')
      expect(document.body.textContent).not.toContain('Indicador')
      expect(document.querySelector('.builder-data-item--without-media')).not.toBeNull()
      expect(document.body.textContent).toContain('Título del elemento: practice title')
      expect(document.body.textContent).toContain('Descripción del elemento: description')
    })
  })

  it('omits unmapped title and description without removing mapped slots', () => {
    const html = createDataComponentMarkup('card_grid', table.id, {
      media: 'media_url',
      badge: 'difficulty',
    })
    const document = new DOMParser().parseFromString(html, 'text/html')

    expect(document.querySelector('.builder-data-card__media')).not.toBeNull()
    expect(document.querySelector('.builder-data-badge')).not.toBeNull()
    expect(document.querySelector('.builder-data-card__content h3')).toBeNull()
    expect(document.querySelector('.builder-data-card__content p')).toBeNull()
    expect(document.body.textContent).not.toContain('Título del elemento')
    expect(document.body.textContent).not.toContain('Descripción del elemento')
  })

  it('creates a responsive repeated carousel with scroll snapping', () => {
    const html = createDataComponentMarkup('carousel', table.id, { title: 'practice_title' })
    const document = new DOMParser().parseFromString(html, 'text/html')
    expect(html).toContain('class="builder-data-carousel"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('data-builder-repeater="practices-table"')
    expect(dataComponentStyles).toContain('scroll-snap-type:inline mandatory')
    expect(html).toContain('--builder-data-width-mobile:100%')
    expect(dataComponentStyles).toContain('var(--builder-data-width-mobile,100%)')
    expect(dataComponentStyles).toContain('container-name:builder-data-component')
    expect(dataComponentStyles).toContain(':has(> .builder-data-grid')
    expect(dataComponentStyles).toContain('@container builder-data-component (max-width:600px)')
    expect(document.querySelectorAll('.builder-data-carousel__item')).toHaveLength(4)
    expect(document.querySelector('[data-builder-data-component="carousel"] > .builder-data-carousel')).not.toBeNull()
  })

  it('exports generated components as ordinary Supabase repeaters and bindings', () => {
    const html = createDataComponentMarkup('card_grid', table.id, {
      media: 'media_url',
      title: 'practice_title',
      description: 'description',
    })
    const bundle = buildEditorProjectBundle([{ id: 'catalog', name: 'Catálogo', html }], 'catalog', 'Sitio', {
      projectUrl: 'https://school.supabase.co',
      publishableKey: 'sb_publishable_test_key_123456789',
      tables: [table],
    })

    expect(bundle.manifest.repeaters).toHaveLength(1)
    expect(bundle.manifest.repeaters?.[0]).toEqual(expect.objectContaining({
      dataSourceId: 'supabase-practices_table',
      pageSize: 12,
      pagination: true,
    }))
    expect(bundle.manifest.bindings?.map((binding) => binding.field))
      .toEqual(expect.arrayContaining(['media_url', 'practice_title', 'description']))
    const exportedPage = new TextDecoder().decode(
      bundle.files.find((file) => file.path === 'pages/catalog.html')?.bytes,
    )
    expect(exportedPage).toContain('@container builder-data-component (max-width:600px)')
    expect(exportedPage).toContain('container-type:inline-size')
  })
})
