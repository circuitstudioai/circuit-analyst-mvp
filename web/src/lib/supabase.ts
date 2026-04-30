import { createClient } from '@supabase/supabase-js'
import { AnalyzeResponse } from './types'
import { ConsensusResult, EngineOutput } from './consensus'

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function saveRun(payload: AnalyzeResponse) {
  const sb = client()
  if (!sb) return { skipped: true }

  const { data: run, error: runErr } = await sb
    .from('analysis_runs')
    .insert({
      as_of: payload.asOf,
      regime_score: payload.regimeScore,
      watchlist: payload.watchlist,
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
  }))

  const { error: sigErr } = await sb.from('signals').insert(rows)
  if (sigErr) return { error: sigErr.message }

  return { ok: true, runId: run.id }
}

export async function recentRuns(limit = 10) {
  const sb = client()
  if (!sb) return []
  const { data } = await sb
    .from('analysis_runs')
    .select('id, as_of, regime_score, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function ingestEngineOutputs(rows: EngineOutput[]) {
  const sb = client()
  if (!sb) return { skipped: true }
  if (!rows.length) return { ok: true, inserted: 0 }

  const payload = rows.map((r) => ({
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

  const { error } = await sb.from('engine_outputs').insert(payload)
  if (error) return { error: error.message }
  return { ok: true, inserted: payload.length }
}

export async function latestEngineOutputsByTicker(ticker: string) {
  const sb = client()
  if (!sb) return []
  const { data } = await sb
    .from('engine_outputs')
    .select('*')
    .eq('ticker', ticker.toUpperCase())
    .order('run_timestamp', { ascending: false })
    .limit(20)
  return data || []
}

export async function saveConsensus(result: ConsensusResult) {
  const sb = client()
  if (!sb) return { skipped: true }
  const { error } = await sb.from('consensus_signals').insert(result)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function latestConsensus(ticker?: string) {
  const sb = client()
  if (!sb) return []
  let q = sb
    .from('consensus_signals')
    .select('*')
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
  top_conviction: any[]
  high_conflict: any[]
  key_catalysts: any[]
  markdown: string
}) {
  const sb = client()
  if (!sb) return { skipped: true }

  const { error } = await sb.from('daily_briefs').upsert(payload, { onConflict: 'brief_date' })
  if (error) return { error: error.message }
  return { ok: true }
}

export async function latestDailyBrief() {
  const sb = client()
  if (!sb) return null
  const { data } = await sb
    .from('daily_briefs')
    .select('*')
    .order('brief_date', { ascending: false })
    .limit(1)
    .single()
  return data || null
}
