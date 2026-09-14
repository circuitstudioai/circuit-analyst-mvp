import { describe, expect, it } from 'vitest'
import { deriveAnalysisOutcome, executeWithFallback } from './analystHarness'

describe('analyst harness outcome', () => {
  it('marks a run complete only when every research report completes', () => {
    expect(deriveAnalysisOutcome(['complete'], [])).toEqual({
      status: 'completed',
      researchStatus: 'complete',
      error: undefined,
    })
  })

  it('never marks a technical fallback as completed', () => {
    expect(deriveAnalysisOutcome(['fallback'], [])).toEqual({
      status: 'partial',
      researchStatus: 'technical_only',
      error: 'Deep research unavailable for 1/1 company',
    })
  })

  it('keeps successful research visible when another report or write fails', () => {
    expect(deriveAnalysisOutcome(['complete', 'fallback'], ['usage write failed'])).toEqual({
      status: 'partial',
      researchStatus: 'partial',
      error: 'Deep research unavailable for 1/2 companies; usage write failed',
    })
  })
})

describe('analyst harness provider recovery', () => {
  it('retries a transient failure and then uses the fallback model', async () => {
    const calls: string[] = []
    const result = await executeWithFallback(['primary', 'fallback'], 2, async (model) => {
      calls.push(model)
      if (model === 'primary') throw new Error('429 quota exceeded')
      return 'grounded result'
    }, async () => undefined)

    expect(result).toEqual({ value: 'grounded result', model: 'fallback', attempts: 3 })
    expect(calls).toEqual(['primary', 'primary', 'fallback'])
  })

  it('does not retry validation failures', async () => {
    await expect(executeWithFallback(['primary', 'fallback'], 2, async () => {
      throw new SyntaxError('bad JSON')
    }, async () => undefined)).rejects.toThrow('bad JSON')
  })
})
