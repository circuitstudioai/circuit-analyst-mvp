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
    expect(landing).toContain('Change inbox')
    expect(landing).toContain('Decision room')
    expect(landing).toContain('Your judgment')
    expect(landing).toContain('Living thesis')
  })

  it('labels the sample surface as fixture-backed and exposes interactive changes', () => {
    expect(canvas).toContain('Controlled prototype · fixture evidence')
    expect(canvas).toContain('role="tablist"')
    expect(canvas).toContain('Affected claim')
  })

  it('stacks the monitoring canvas for narrow viewports and honors reduced motion', () => {
    expect(styles).toContain('.monitorCanvasBody { grid-template-columns: 1fr; }')
    expect(styles).toContain('.changeDetail { animation: none; }')
  })
})
