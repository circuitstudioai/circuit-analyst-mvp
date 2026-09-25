import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const landing = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
const canvas = readFileSync(new URL('./LandingCanvas.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('./page.module.css', import.meta.url), 'utf8')

describe('Market Desk vNext landing', () => {
  it('preserves the current research landing when the rollout is off', () => {
    expect(landing).toContain('isMarketDeskVnextRouteAvailable')
    expect(landing).toContain('<ResearchLanding />')
  })

  it('explains the vNext loop through its real product objects', () => {
    expect(landing).toContain('Important changes')
    expect(landing).toContain('Why it matters')
    expect(landing).toContain('What to watch next')
    expect(landing).toContain('Your reasoning stays visible')
  })

  it('labels the sample surface as fixture-backed and exposes interactive changes', () => {
    expect(canvas).toContain('Example using fixture data')
    expect(canvas).toContain('role="tablist"')
    expect(canvas).toContain('What this could change')
  })

  it('stacks the monitoring canvas for narrow viewports and honors reduced motion', () => {
    expect(styles).toContain('.monitorCanvasBody { grid-template-columns: 1fr; }')
    expect(styles).toContain('.changeDetail { animation: none; }')
  })
})
