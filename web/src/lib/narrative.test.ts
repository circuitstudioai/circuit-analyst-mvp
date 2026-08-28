import { describe, expect, it } from 'vitest'
import { buildNarrative } from './narrative'

describe('analysis narratives', () => {
  it('produces symbol-specific, metric-specific narratives for the same decision', () => {
    const now = buildNarrative({ symbol: 'NOW', decision: 'BUY', last: 137.42, ma20: 118, ma100: 102, momentum20: 0.248, volatility20: 0.035, score: 1, regimeBias: 0.1 })
    const oscr = buildNarrative({ symbol: 'OSCR', decision: 'BUY', last: 30.56, ma20: 29.9, ma100: 25.2, momentum20: -0.021, volatility20: 0.04, score: 0.459, regimeBias: 0.1 })

    expect(now.thesis).toContain('NOW')
    expect(now.thesis).toContain('+24.8%')
    expect(oscr.thesis).toContain('OSCR')
    expect(oscr.thesis).toContain('-2.1%')
    expect(now.thesis).not.toBe(oscr.thesis)
    expect(now.invalidation).not.toBe(oscr.invalidation)
    expect(now.nextAction).not.toBe(oscr.nextAction)
    expect(now.bullCase).not.toEqual(oscr.bullCase)
    expect(now.bearCase).not.toEqual(oscr.bearCase)
  })
})
