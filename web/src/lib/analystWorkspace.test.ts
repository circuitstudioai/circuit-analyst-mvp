import { describe, expect, it } from 'vitest'
import { evidenceWorkspace } from './analystWorkspace'
import { SignalRow } from './types'

const signal = {
  symbol: 'NVDA', confidence: .78, dataAsOf: '2026-09-15', dataQuality: 'ok',
  evidence: [{ label: 'Trend', detail: 'Above long-term average', strength: 'rule' }],
  deepAnalysis: {
    status: 'complete', confidence: 'high', sources: [
      { title: 'Investor relations update', url: 'https://example.com/ir', publishedAt: '2026-09-14' },
    ],
  },
} as SignalRow

describe('evidenceWorkspace', () => {
  it('builds a sourced workspace for completed research', () => {
    expect(evidenceWorkspace(signal)).toEqual({
      symbol: 'NVDA', confidence: 'High', freshness: 'Sep 15, 2026',
      researchMode: 'Sourced research', sourceCount: 1,
      sources: [{ title: 'Investor relations update', url: 'https://example.com/ir', publishedAt: 'Sep 14, 2026' }],
      evidence: [{ label: 'Trend', detail: 'Above long-term average', strength: 'rule' }],
    })
  })

  it('labels fallback evidence honestly', () => {
    expect(evidenceWorkspace({ ...signal, deepAnalysis: undefined, dataAsOf: null })).toMatchObject({
      researchMode: 'Technical snapshot', sourceCount: 0, freshness: 'Unavailable',
    })
  })
})
