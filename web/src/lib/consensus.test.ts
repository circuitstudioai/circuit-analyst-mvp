import { describe, expect, it } from 'vitest'
import { computeConsensus, EngineOutput } from './consensus'

function row(engine_name: string, direction: EngineOutput['direction'], category_views?: unknown): EngineOutput {
  return {
    run_id: 1, ticker: 'NVDA', market: 'US', run_timestamp: new Date().toISOString(), engine_name,
    direction, confidence: 80, raw_payload: category_views ? { category_views } : undefined,
  }
}

describe('computeConsensus', () => {
  it('abstains instead of presenting one engine as 100% consensus', () => {
    const result = computeConsensus([row('technical_regime', 'bullish')])!
    expect(result.direction).toBe('neutral')
    expect(result.agreement_score).toBe(0)
    expect(result.rationale).toContain('Insufficient engine coverage')
  })

  it('exposes category-level conflicts', () => {
    const result = computeConsensus([
      row('technical_regime', 'bullish', { risk: { direction: 'bearish', confidence: 80 } }),
      row('ai_research', 'bullish', { risk: { direction: 'bullish', confidence: 70 } }),
    ])!
    expect(result.direction).toBe('bullish')
    expect(result.conflict_flag).toBe(true)
    expect(result.category_consensus[0]).toMatchObject({ category: 'risk', conflict_flag: true, engines_total: 2 })
  })
})
