import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./page.module.css', import.meta.url), 'utf8')
const landing = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
const canvas = readFileSync(new URL('./LandingCanvas.tsx', import.meta.url), 'utf8')

describe('desk responsive layout', () => {
  it('preserves the desktop workspace before the mobile breakpoint', () => {
    expect(styles).not.toContain('@media (max-width: 1024px)')
    expect(styles).toContain('@media (max-width: 720px)')
  })
})

describe('editorial landing page', () => {
  it('labels the sample analysis and its date instead of presenting demo data as live', () => {
    expect(canvas).toContain('Illustrative analysis')
    expect(canvas).toContain('as of Sep 24, 2026')
  })

  it('connects market behavior, company evidence, and decision context', () => {
    expect(landing).toContain('Market behavior')
    expect(landing).toContain('Company evidence')
    expect(landing).toContain('Decision context')
    expect(canvas).toContain('role="tablist"')
  })

  it('adapts the market canvas and story flow for small screens', () => {
    expect(styles).toContain('.canvasBody { grid-template-columns: 1fr; }')
    expect(styles).toContain('.storyFlow { grid-template-columns: 1fr; }')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
