import { describe, expect, it } from 'vitest'
import { enrichWithGemini } from './gemini'
import { SignalRow } from './types'

function signal(symbol: string): SignalRow {
  return {
    symbol, decision: 'BUY', confidence: 0.8, score: 0.5, lastPrice: 100,
    reasons: ['reason'], thesis: `${symbol} thesis`, bullCase: ['bull'], bearCase: ['bear'],
    riskFlags: ['risk'], catalysts: ['catalyst'], invalidation: `${symbol} invalidation`,
    nextAction: `${symbol} action`, timeHorizon: 'swing', dataQuality: 'ok',
    dataAsOf: '2026-08-27', marketDataStatus: 'live', abstained: false, source: 'test', evidence: [],
  }
}

describe('Gemini enrichment', () => {
  it('reports complete only when every symbol is enriched', async () => {
    const result = await enrichWithGemini([signal('COMPLETE1'), signal('COMPLETE2')], 0.2, {
      model: 'test-model', generate: async (prompt) => `Unique note for ${prompt.includes('COMPLETE1') ? 'one' : 'two'}`,
    })
    expect(result.summary).toMatchObject({ status: 'complete', generated: 2, failed: 0 })
    expect(result.signals.every((row) => row.aiStatus === 'complete')).toBe(true)
    expect(result.signals[0].aiExplanation).not.toBe(result.signals[1].aiExplanation)
  })

  it('returns deterministic fallback status and a safe error code on provider failure', async () => {
    const result = await enrichWithGemini([signal('FAILURE1')], 0.2, {
      model: 'missing-model', generate: async () => { throw Object.assign(new Error('model not found'), { status: 404 }) },
    })
    expect(result.summary).toMatchObject({ status: 'fallback', generated: 0, failed: 1 })
    expect(result.signals[0]).toMatchObject({ aiStatus: 'fallback', aiErrorCode: 'model' })
    expect(result.signals[0].aiExplanation).toBeUndefined()
  })
})
