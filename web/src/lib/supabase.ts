import { createClient } from '@supabase/supabase-js'
import { AnalyzeResponse } from './types'
import { ConsensusResult, EngineOutput } from './consensus'

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function saveRun(payload: AnalyzeResponse) {
  const sb = serviceClient()
  if (!sb) return { skipped: true }

  const { data: run, error: runErr } = await sb
    .from('analysis_runs')
    .insert({
      as_of: payload.asOf,
      regime_score: payload.regimeScore,
      watchlist: payload.watchlist,
      status: 'running',
    })
    .select('id')
    .single()

  if (runErr || !run) return { error: runErr?.message || 'run insert failed' }

  const rows = payload.signals.map((s) => ({
    run_id: run.id,
    symbol: s.symbol,
    decision: s.decision,
    confidence: s.confidence,
    score: s.score,
    last_price: s.lastPrice,
    reasons: s.reasons,
    ai_explanation: s.aiExplanation || null,
    raw_payload: {
      dataAsOf: s.dataAsOf,
      marketDataStatus: s.marketDataStatus,
      aiStatus: s.aiStatus || 'skipped',
      aiErrorCode: s.aiErrorCode || null,
      narrativeVersion: 'v2',
    },
  }))

  const { error: sigErr } = await sb.from('signals').insert(rows)
  if (sigErr) {
    await completeRun(Number(run.id), 'failed', sigErr.message)
    return { error: sigErr.message }
  }

  return { ok: true, runId: Number(run.id) }
}

export async function completeRun(
  runId: number,
  status: 'completed' | 'partial' | 'failed' = 'completed',
  errorMessage?: string,
) {
  const sb = serviceClient()
  if (!sb) return { skipped: true }
  const { error } = await sb
    .from('analysis_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      error_message: errorMessage || null,
    })
    .eq('id', runId)
  return error ? { error: error.message } : { ok: true }
}

export async function recentRuns(limit = 10) {
  const sb = serviceClient()
  if (!sb) return []
  const { data } = await sb
    .from('analysis_runs')
    .select('id, as_of, regime_score, status, completed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function ingestEngineOutputs(rows: EngineOutput[]) {
  const sb = serviceClient()
  if (!sb) return { skipped: true }
  if (!rows.length) return { ok: true, inserted: 0 }

  const payload = rows.map((r) => ({
    run_id: r.run_id,
    ticker: r.ticker,
    market: r.market,
    run_timestamp: r.run_timestamp,
    engine_name: r.engine_name,
    direction: r.direction,
    confidence: r.confidence,
    time_horizon: r.time_horizon || 'swing',
    thesis_summary: r.thesis_summary || null,
    bull_case: r.bull_case || [],
    bear_case: r.bear_case || [],
    risk_flags: r.risk_flags || [],
    catalysts: r.catalysts || [],
    suggested_next_action: r.suggested_next_action || null,
    raw_payload: r.raw_payload || null,
    raw_payload_ref: r.raw_payload_ref || null,
    source_tag: r.source_tag || null,
  }))

  const { error } = await sb
    .from('engine_outputs')
    .upsert(payload, { onConflict: 'run_id,engine_name,ticker,time_horizon' })
  if (error) return { error: error.message }
  return { ok: true, inserted: payload.length }
}

export async function latestEngineOutputsByTicker(ticker: string, runId: number) {
  const sb = serviceClient()
  if (!sb) return []
  const { data } = await sb
    .from('engine_outputs')
    .select('*')
    .eq('ticker', ticker.toUpperCase())
    .eq('run_id', runId)
    .order('run_timestamp', { ascending: false })
    .limit(20)
  return data || []
}

export async function saveConsensus(result: ConsensusResult) {
  const sb = serviceClient()
  if (!sb) return { skipped: true }
  const { error } = await sb
    .from('consensus_signals')
    .upsert(result, { onConflict: 'run_id,ticker,time_horizon' })
  if (error) return { error: error.message }
  return { ok: true }
}

export async function latestConsensus(runId: number, ticker?: string) {
  const sb = serviceClient()
  if (!sb) return []
  let q = sb
    .from('consensus_signals')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (ticker) q = q.eq('ticker', ticker.toUpperCase())
  const { data } = await q
  return data || []
}

export async function saveDailyBrief(payload: {
  run_id?: number | null
  brief_date: string
  title: string
  summary: string
  top_conviction: Array<Record<string, unknown>>
  high_conflict: Array<Record<string, unknown>>
  key_catalysts: Array<Record<string, unknown>>
  markdown: string
}) {
  const sb = serviceClient()
  if (!sb) return { skipped: true }

  const { error } = await sb.from('daily_briefs').upsert(payload, { onConflict: 'run_id' })
  if (error) return { error: error.message }
  return { ok: true }
}

export async function latestDailyBrief(runId?: number) {
  const sb = serviceClient()
  if (!sb) return null
  let query = sb
    .from('daily_briefs')
    .select('*')
    .order('brief_date', { ascending: false })
    .limit(1)
  if (runId) query = query.eq('run_id', runId)
  const { data } = await query.maybeSingle()
  return data || null
}

export async function latestCompletedRun() {
  const sb = serviceClient()
  if (!sb) return null
  const { data } = await sb
    .from('analysis_runs')
    .select('id, as_of, regime_score, status, completed_at, created_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data || null
}

export type ConsensusDiffRow = {
  ticker: string
  latest_created_at: string
  previous_created_at: string | null
  latest_direction: 'bullish' | 'neutral' | 'bearish'
  previous_direction: 'bullish' | 'neutral' | 'bearish' | null
  latest_confidence: number
  previous_confidence: number | null
  latest_agreement: number
  previous_agreement: number | null
  latest_conflict: boolean
  previous_conflict: boolean | null
  confidence_delta: number | null
  agreement_delta: number | null
  change_type: 'new' | 'flip' | 'strengthening' | 'weakening' | 'stable'
}

type ConsensusSnapshot = {
  ticker: string
  direction: ConsensusDiffRow['latest_direction']
  agreement_score: number
  confidence_score: number
  conflict_flag: boolean
  created_at: string
}

function classifyChange(latest: ConsensusSnapshot, previous: ConsensusSnapshot | null): ConsensusDiffRow['change_type'] {
  if (!previous) return 'new'
  if (latest.direction !== previous.direction) return 'flip'

  const confidenceDelta = Number(latest.confidence_score) - Number(previous.confidence_score)
  const agreementDelta = Number(latest.agreement_score) - Number(previous.agreement_score)
  if (confidenceDelta >= 0.08 || agreementDelta >= 0.08) return 'strengthening'
  if (confidenceDelta <= -0.08 || agreementDelta <= -0.08) return 'weakening'
  return 'stable'
}

export async function latestConsensusDiff(limit = 25): Promise<ConsensusDiffRow[]> {
  const sb = serviceClient()
  if (!sb) return []

  const { data } = await sb
    .from('consensus_signals')
    .select('ticker,direction,agreement_score,confidence_score,conflict_flag,created_at')
    .order('created_at', { ascending: false })
    .limit(Math.max(200, limit * 8))

  const grouped = new Map<string, ConsensusSnapshot[]>()
  for (const row of (data || []) as ConsensusSnapshot[]) {
    const ticker = String(row.ticker || '').toUpperCase()
    if (!ticker) continue
    const snapshots = grouped.get(ticker) || []
    if (snapshots.length < 2) snapshots.push(row)
    grouped.set(ticker, snapshots)
  }

  const diffs: ConsensusDiffRow[] = []
  for (const [ticker, snapshots] of grouped) {
    const latest = snapshots[0]
    const previous = snapshots[1] || null
    diffs.push({
      ticker,
      latest_created_at: latest.created_at,
      previous_created_at: previous?.created_at || null,
      latest_direction: latest.direction,
      previous_direction: previous?.direction || null,
      latest_confidence: Number(latest.confidence_score),
      previous_confidence: previous ? Number(previous.confidence_score) : null,
      latest_agreement: Number(latest.agreement_score),
      previous_agreement: previous ? Number(previous.agreement_score) : null,
      latest_conflict: Boolean(latest.conflict_flag),
      previous_conflict: previous ? Boolean(previous.conflict_flag) : null,
      confidence_delta: previous
        ? Number((Number(latest.confidence_score) - Number(previous.confidence_score)).toFixed(3))
        : null,
      agreement_delta: previous
        ? Number((Number(latest.agreement_score) - Number(previous.agreement_score)).toFixed(3))
        : null,
      change_type: classifyChange(latest, previous),
    })
  }

  const rank = { flip: 0, weakening: 1, strengthening: 2, new: 3, stable: 4 } as const
  return diffs
    .sort((a, b) => rank[a.change_type] - rank[b.change_type]
      || (Math.abs(b.confidence_delta || 0) + Math.abs(b.agreement_delta || 0))
      - (Math.abs(a.confidence_delta || 0) + Math.abs(a.agreement_delta || 0)))
    .slice(0, limit)
}
