import { describe, expect, it } from 'vitest'
import { summarizeAlphaOps } from './alphaOps'

describe('alpha operations summary', () => {
  it('surfaces provider cost, traffic, and errors without exposing payloads', () => {
    expect(summarizeAlphaOps(
      [
        { provider: 'gemini', units: 3, cost_usd: 0.12 },
        { provider: 'gemini', units: 6, cost_usd: 0.25 },
      ],
      [
        { status: 'completed' },
        { status: 'partial' },
        { status: 'failed' },
      ],
    )).toEqual({
      providerCalls: 2,
      providerUnits: 9,
      providerCostUsd: 0.37,
      analyses: 3,
      degradedAnalyses: 2,
      errorRate: 2 / 3,
    })
  })
})
