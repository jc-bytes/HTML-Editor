import { describe, expect, it } from 'vitest'
import { authPageTemplateCss, authPageTemplateHtml } from './auth-page-template'

describe('auth page template', () => {
  it('includes Supabase-compatible login, signup, and logout controls', () => {
    const document = new DOMParser().parseFromString(authPageTemplateHtml, 'text/html')

    expect(document.querySelector('form[data-builder-auth-action="login"]')).not.toBeNull()
    expect(document.querySelector('form[data-builder-auth-action="signup"]')).not.toBeNull()
    expect(document.querySelector('[data-builder-auth-action="logout"]')).not.toBeNull()
    expect(document.querySelectorAll('input[name="email"]')).toHaveLength(2)
    expect(document.querySelectorAll('input[name="password"]')).toHaveLength(2)
    expect(document.querySelector('[data-builder-auth-tab="signup"]')).not.toBeNull()
    expect(document.querySelector('[data-builder-auth-panel="signup"]')?.hasAttribute('hidden')).toBe(true)
    expect(document.querySelector('[data-builder-auth-visible="signed-in"]')).not.toBeNull()
    expect(document.querySelector('[data-builder-auth-field="email"]')).not.toBeNull()
  })

  it('adapts its split layout for tablet, mobile, and reduced motion', () => {
    expect(authPageTemplateCss).toContain('@media (max-width: 900px)')
    expect(authPageTemplateCss).toContain('@media (max-width: 700px)')
    expect(authPageTemplateCss).toContain('@media (max-width: 380px)')
    expect(authPageTemplateCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(authPageTemplateCss).toContain('var(--builder-editor-viewport-height, 100svh)')
  })
})
