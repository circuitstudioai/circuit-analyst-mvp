export type AnalysisJobStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed'

export type AnalysisStageProgress = {
  ticker: string
  name: string
  status: 'running' | 'complete' | 'failed'
}

const STAGE_PERCENT: Record<string, number> = {
  queued: 0,
  market_data: 20,
  evidence: 40,
  research: 50,
  challenge: 60,
  synthesis: 80,
  verification: 90,
  complete: 100,
}

export function buildAnalysisProgress(input: {
  status: AnalysisJobStatus
  currentStage: string
  stages: AnalysisStageProgress[]
}) {
  const terminal = input.status === 'completed' || input.status === 'partial' || input.status === 'failed'
  const liveCheckpoint = [...input.stages]
    .reverse()
    .find((stage) => stage.status === 'running' || stage.status === 'failed')
  const currentStage = terminal ? input.currentStage : liveCheckpoint?.name || input.currentStage
  const stageNames = [...new Set(input.stages.map((stage) => stage.name))]
  const completedStages = stageNames.filter((name) => {
    const records = input.stages.filter((stage) => stage.name === name)
    return records.length > 0 && records.every((stage) => stage.status === 'complete')
  })

  return {
    status: input.status,
    currentStage,
    completedStages,
    percent: terminal ? 100 : STAGE_PERCENT[currentStage] ?? 0,
    terminal,
  }
}
