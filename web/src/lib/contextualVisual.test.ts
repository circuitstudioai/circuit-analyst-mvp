import { describe, expect, it } from 'vitest'
import { contextualVisual, priceChange } from './contextualVisual'
import { SignalRow } from './types'

const signal = {
  symbol: 'NVDA', bullCase: ['Demand remains strong'], bearCase: ['Valuation is high'],
  riskFlags: ['Customer concentration'], dataQuality: 'ok', evidence: [
    { label: 'Trend', detail: 'Above its long-term average', strength: 'rule' },
    { label: 'Valuation', detail: 'Scenario range is available', strength: 'research' },
  ],
  priceHistory: [{ date: '2026-09-01', close: 100 }, { date: '2026-09-02', close: 110 }],
} as SignalRow

describe('contextual evidence visuals', () => {
  it('selects a visual based on the research intent', () => {
    expect(contextualVisual('risk', signal).kind).toBe('risk')
    expect(contextualVisual('valuation', signal)).toMatchObject({ kind: 'valuation', available: true })
    expect(contextualVisual('comparison', signal).kind).toBe('comparison')
    expect(contextualVisual('earnings', signal).kind).toBe('price')
    expect(contextualVisual(undefined, signal).kind).toBe('price')
  })

  it('does not claim a valuation view when valuation evidence is absent', () => {
    expect(contextualVisual('valuation', { ...signal, evidence: signal.evidence.slice(0, 1) }))
      .toMatchObject({ kind: 'valuation', available: false, items: [] })
  })

  it('derives price change only from reliable history', () => {
    expect(priceChange(signal)).toBe(10)
    expect(priceChange({ ...signal, priceHistory: [] })).toBeNull()
  })
})
