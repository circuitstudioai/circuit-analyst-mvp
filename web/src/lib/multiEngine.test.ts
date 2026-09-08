import { describe, expect, it } from 'vitest'
import { technicalOutput } from './multiEngine'
import { SignalRow } from './types'

const signal: SignalRow = {
  symbol: 'AMD', decision: 'BUY', confidence: 0.72, score: 0.5, lastPrice: 150,
  reasons: ['MA20 above MA100'], thesis: 'Trend is constructive.', bullCase: ['Trend persists'], bearCase: ['Momentum fades'],
  riskFlags: ['Volatility'], catalysts: [], invalidation: 'MA20 falls below MA100', nextAction: 'Monitor trend', timeHorizon: 'swing',
  dataQuality: 'ok', dataAsOf: '2026-09-07', marketDataStatus: 'live', abstained: false, source: 'Yahoo', evidence: [],
}

describe('multi-engine runner', () => {
  it('emits a versioned technical engine output with category views', () => {
    const output = technicalOutput(7, signal, '2026-09-08T00:00:00Z')
    expect(output.engine_name).toBe('technical_regime')
    expect(output.direction).toBe('bullish')
    const raw = output.raw_payload as {
      evidence_packet: { schema_version: string }
      category_views: { trend: { direction: string } }
    }
    expect(raw.evidence_packet.schema_version).toBe('1.0.0')
    expect(raw.category_views.trend.direction).toBe('bullish')
  })
})
