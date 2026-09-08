import { describe, expect, it } from 'vitest'
import { packet, validateEvidencePacket } from './evidence'

describe('evidence contract', () => {
  it('accepts a sourced fact and reproducible calculation', () => {
    const value = packet('AMD', '2026-09-08T00:00:00Z', 'test', [
      { id: 'fact', kind: 'fact', metric: 'price', value: 100, unit: 'USD', ticker: 'AMD', period: 'spot', confidence: 0.9, freshness_seconds: 0, missing_status: 'present', source: { provider: 'test', url: 'https://example.com', retrieved_at: '2026-09-08T00:00:00Z' } },
      { id: 'calc', kind: 'calculation', metric: 'double', value: 200, unit: 'USD', ticker: 'AMD', period: 'spot', confidence: 0.8, freshness_seconds: 0, missing_status: 'present', calculation: { method: 'double', formula: 'price * 2', inputs: { price: 100 } } },
    ])
    expect(validateEvidencePacket(value)).toEqual([])
  })

  it('rejects duplicate IDs and unsupported facts', () => {
    const value = packet('AMD', '2026-09-08T00:00:00Z', 'test', [
      { id: 'same', kind: 'fact', metric: 'price', value: 100, unit: 'USD', ticker: 'AMD', period: 'spot', confidence: 0.9, freshness_seconds: 0, missing_status: 'present' },
      { id: 'same', kind: 'interpretation', metric: 'view', value: 'mixed', unit: 'text', ticker: 'AMD', period: 'spot', confidence: 0.5, freshness_seconds: 0, missing_status: 'present' },
    ])
    expect(validateEvidencePacket(value)).toEqual(expect.arrayContaining(['items[0].source missing', 'items[1].id must be unique']))
  })
})
