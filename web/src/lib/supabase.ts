import { createClient } from '@supabase/supabase-js'
import { AnalyzeResponse } from './types'

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
