import { describe, expect, it } from 'vitest'
import { buildAnalysisProgress } from './analysisProgress'

describe('buildAnalysisProgress', () => {
  it('reports queued work before any stage starts', () => {
    expect(buildAnalysisProgress({ status: 'queued', currentStage: 'queued', stages: [] })).toEqual({
      status: 'queued',
      currentStage: 'queued',
      completedStages: [],
      percent: 0,
      terminal: false,
    })
  })

  it('combines durable ticker checkpoints into honest progress', () => {
    expect(buildAnalysisProgress({
      status: 'running',
      currentStage: 'research',
      stages: [
        { ticker: 'NVDA', name: 'research', status: 'complete' },
        { ticker: 'NVDA', name: 'challenge', status: 'running' },
      ],
    })).toEqual({
      status: 'running',
      currentStage: 'challenge',
      completedStages: ['research'],
      percent: 60,
      terminal: false,
    })
  })

  it('never presents a partial result as completed', () => {
    expect(buildAnalysisProgress({ status: 'partial', currentStage: 'complete', stages: [] })).toMatchObject({
      status: 'partial', percent: 100, terminal: true,
    })
  })
})
