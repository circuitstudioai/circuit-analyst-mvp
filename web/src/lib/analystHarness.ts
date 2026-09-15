import { DeepAnalysisReport } from './types'

export type AnalysisOutcome = {
  status: 'completed' | 'partial' | 'failed'
  researchStatus: 'complete' | 'partial' | 'technical_only'
  error?: string
}

export type StageRecord = {
  status: 'running' | 'complete' | 'failed'
  output?: unknown
  error?: string
}

export type StageCheckpointStore = {
  load: (name: string) => Promise<StageRecord | null>
  save: (name: string, record: StageRecord) => Promise<void>
}

export type StageTrace = {
  name: string
  status: StageRecord['status']
  resumed: boolean
}

export class CheckpointedStageError extends Error {
  constructor(message: string, public readonly stages: StageTrace[], options?: ErrorOptions) {
    super(message, options)
    this.name = 'CheckpointedStageError'
  }
}

export async function runCheckpointedStages(
  definitions: Array<{ name: string; run: (state: Record<string, unknown>) => Promise<unknown> }>,
  store: StageCheckpointStore,
) {
  const state: Record<string, unknown> = {}
  const stages: StageTrace[] = []

  for (const definition of definitions) {
    const checkpoint = await store.load(definition.name)
    if (checkpoint?.status === 'complete' && checkpoint.output !== undefined) {
      state[definition.name] = checkpoint.output
      stages.push({ name: definition.name, status: 'complete', resumed: true })
      continue
    }

    await store.save(definition.name, { status: 'running' })
    try {
      const output = await definition.run(state)
      state[definition.name] = output
      await store.save(definition.name, { status: 'complete', output })
      stages.push({ name: definition.name, status: 'complete', resumed: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await store.save(definition.name, { status: 'failed', error: message })
      stages.push({ name: definition.name, status: 'failed', resumed: false })
      throw new CheckpointedStageError(message, stages, { cause: error })
    }
  }

  return { state, stages }
}

function isTransient(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /429|quota|resource_exhausted|timeout|timed out|5\d\d|unavailable|network|fetch failed/i.test(message)
}

export async function executeWithFallback<T>(
  models: string[],
  attemptsPerModel: number,
  operation: (model: string) => Promise<T>,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
) {
  let attempts = 0
  let lastError: unknown = new Error('No provider model configured')
  for (const model of models) {
    for (let attempt = 0; attempt < attemptsPerModel; attempt += 1) {
      attempts += 1
      try {
        return { value: await operation(model), model, attempts }
      } catch (error) {
        lastError = error
        if (!isTransient(error)) throw error
        if (attempt + 1 < attemptsPerModel) await wait(250 * (2 ** attempt))
      }
    }
  }
  throw lastError
}

export function deriveAnalysisOutcome(
  reportStatuses: DeepAnalysisReport['status'][],
  writeErrors: string[],
): AnalysisOutcome {
  const completed = reportStatuses.filter((status) => status === 'complete').length
  const unavailable = reportStatuses.length - completed
  const errors = [
    ...(unavailable
      ? [`Deep research unavailable for ${unavailable}/${reportStatuses.length} ${reportStatuses.length === 1 ? 'company' : 'companies'}`]
      : []),
    ...writeErrors,
  ]

  if (completed === reportStatuses.length && !writeErrors.length) {
    return { status: 'completed', researchStatus: 'complete', error: undefined }
  }

  return {
    status: reportStatuses.length ? 'partial' : 'failed',
    researchStatus: completed ? 'partial' : 'technical_only',
    error: errors.join('; ') || 'Analysis did not produce a research report',
  }
}
