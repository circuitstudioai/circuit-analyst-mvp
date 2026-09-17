import { describe, expect, it } from 'vitest'
import { deriveAnalysisOutcome, executeWithFallback, ModelOutputError, runCheckpointedStages } from './analystHarness'

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

describe('durable analyst stages', () => {
  it('resumes after the last completed checkpoint', async () => {
    const records = new Map<string, { status: 'running' | 'complete' | 'failed'; output?: unknown; error?: string }>([
      ['research', { status: 'complete', output: { facts: ['saved fact'] } }],
    ])
    const executed: string[] = []
    const result = await runCheckpointedStages([
      { name: 'research', run: async () => { executed.push('research'); return { facts: ['new fact'] } } },
      { name: 'challenge', run: async (state) => { executed.push('challenge'); return { fact: (state.research as { facts: string[] }).facts[0] } } },
      { name: 'synthesis', run: async (state) => { executed.push('synthesis'); return { answer: (state.challenge as { fact: string }).fact } } },
    ], {
      load: async (name) => records.get(name) || null,
      save: async (name, record) => { records.set(name, record) },
    })

    expect(executed).toEqual(['challenge', 'synthesis'])
    expect(result.state.synthesis).toEqual({ answer: 'saved fact' })
    expect(result.stages.map((stage) => [stage.name, stage.status, stage.resumed])).toEqual([
      ['research', 'complete', true],
      ['challenge', 'complete', false],
      ['synthesis', 'complete', false],
    ])
  })

  it('persists the failed stage without losing earlier work', async () => {
    const records = new Map<string, { status: 'running' | 'complete' | 'failed'; output?: unknown; error?: string }>()
    await expect(runCheckpointedStages([
      { name: 'research', run: async () => ({ facts: ['fact'] }) },
      { name: 'challenge', run: async () => { throw new Error('provider unavailable') } },
    ], {
      load: async (name) => records.get(name) || null,
      save: async (name, record) => { records.set(name, record) },
    })).rejects.toThrow('provider unavailable')

    expect(records.get('research')).toMatchObject({ status: 'complete', output: { facts: ['fact'] } })
    expect(records.get('challenge')).toMatchObject({ status: 'failed', error: 'provider unavailable' })
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

  it('retries explicitly recoverable malformed model output', async () => {
    let calls = 0
    const result = await executeWithFallback(['primary'], 2, async () => {
      calls += 1
      if (calls === 1) throw new ModelOutputError('truncated JSON')
      return { answer: 'validated' }
    }, async () => undefined)

    expect(result.value).toEqual({ answer: 'validated' })
    expect(result.attempts).toBe(2)
  })
})
