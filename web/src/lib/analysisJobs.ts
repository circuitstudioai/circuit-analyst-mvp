import { buildAnalysisProgress, AnalysisJobStatus } from './analysisProgress'
import { serviceClient } from './supabase'

export async function createAnalysisJob(userId: string, requestPayload: Record<string, unknown>) {
  const sb = serviceClient()
  if (!sb) throw new Error('Supabase is not configured')
  const { data, error } = await sb.from('analysis_jobs').insert({
    user_id: userId,
    request_payload: requestPayload,
  }).select('id').single()
  if (error || !data) throw new Error(error?.message || 'Could not queue analysis')
  return String(data.id)
}

export async function analysisJobForUser(userId: string, jobId: string) {
  const sb = serviceClient()
  if (!sb) return null
  const { data, error } = await sb.from('analysis_jobs')
    .select('id,run_id,status,current_stage,result_payload,error_message,created_at,started_at,completed_at,updated_at')
    .eq('id', jobId).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  let stages: Array<{ ticker: string; name: string; status: 'running' | 'complete' | 'failed' }> = []
  if (data.run_id) {
    const { data: stageRows, error: stageError } = await sb.from('analysis_stages')
      .select('ticker,stage_name,status').eq('run_id', data.run_id)
    if (stageError) throw new Error(stageError.message)
    stages = (stageRows || []).map((stage) => ({
      ticker: String(stage.ticker),
      name: String(stage.stage_name),
      status: stage.status as 'running' | 'complete' | 'failed',
    }))
  }

  return {
    id: String(data.id),
    runId: data.run_id ? Number(data.run_id) : null,
    result: data.result_payload || null,
    error: data.error_message || null,
    createdAt: String(data.created_at),
    startedAt: data.started_at ? String(data.started_at) : null,
    completedAt: data.completed_at ? String(data.completed_at) : null,
    updatedAt: String(data.updated_at),
    progress: buildAnalysisProgress({
      status: data.status as AnalysisJobStatus,
      currentStage: String(data.current_stage),
      stages,
    }),
  }
}

export async function updateAnalysisJob(jobId: string, userId: string, update: {
  status?: AnalysisJobStatus
  currentStage?: string
  runId?: number
  result?: unknown
  error?: string
}) {
  const sb = serviceClient()
  if (!sb) return
  const now = new Date().toISOString()
  const terminal = update.status === 'completed' || update.status === 'partial' || update.status === 'failed'
  const payload: Record<string, unknown> = { updated_at: now }
  if (update.status) payload.status = update.status
  if (update.currentStage) payload.current_stage = update.currentStage
  if (update.runId) payload.run_id = update.runId
  if (update.result !== undefined) payload.result_payload = update.result
  if (update.error !== undefined) payload.error_message = update.error || null
  if (update.status === 'running') payload.started_at = now
  if (terminal) payload.completed_at = now
  const { error } = await sb.from('analysis_jobs').update(payload).eq('id', jobId).eq('user_id', userId)
  if (error) throw new Error(error.message)
}
