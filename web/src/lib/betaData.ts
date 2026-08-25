import { serviceClient } from './supabase'

export async function activeUniverse(limit = 100) {
  const supabase = serviceClient()
  if (!supabase) return { version: null, symbols: [] }
  const { data: version } = await supabase
    .from('symbol_universe_versions')
    .select('id,slug,name,methodology_version,as_of,activated_at')
    .eq('status', 'active').order('activated_at', { ascending: false }).limit(1).maybeSingle()
  if (!version) return { version: null, symbols: [] }
  const { data: symbols } = await supabase
    .from('symbol_universe_items')
    .select('symbol,company_name,exchange,rank,liquidity_score,popularity_score,composite_score,source_tags')
    .eq('universe_id', version.id).eq('is_active', true).order('rank').limit(limit)
  return { version, symbols: symbols || [] }
}

export async function claimAnalysisQuota(userId: string, symbolCount: number) {
  const supabase = serviceClient()
  if (!supabase) return { allowed: false, analysis_count: 0, symbol_count: 0 }
  const { data, error } = await supabase.rpc('claim_analysis_quota', {
    p_user_id: userId, p_symbol_count: symbolCount, p_max_analyses: 3, p_max_symbols: 24,
  })
  if (error) throw new Error(error.message)
  return data?.[0] || { allowed: false, analysis_count: 0, symbol_count: 0 }
}

export async function createAnalysisRequest(userId: string, symbols: string[]) {
  const supabase = serviceClient()
  if (!supabase) return null
  const { data } = await supabase.from('analysis_requests')
    .insert({ user_id: userId, symbols, status: 'started' }).select('id').single()
  return data?.id as string | undefined
}

export async function finishAnalysisRequest(
  requestId: string | null | undefined,
  fields: { runId?: number; status: 'completed' | 'partial' | 'failed' | 'cached'; durationMs: number; error?: string },
) {
  const supabase = serviceClient()
  if (!supabase || !requestId) return
  await supabase.from('analysis_requests').update({
    run_id: fields.runId || null,
    status: fields.status,
    duration_ms: fields.durationMs,
    error_message: fields.error || null,
    completed_at: new Date().toISOString(),
  }).eq('id', requestId)
}

export async function userBetaState(userId: string) {
  const supabase = serviceClient()
  if (!supabase) return { profile: null, watchlist: [], usage: null }
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: profile }, { data: watchlist }, { data: usage }] = await Promise.all([
    supabase.from('profiles').select('id,email,display_name,beta_role').eq('id', userId).maybeSingle(),
    supabase.from('user_watchlists').select('id,name,user_watchlist_items(symbol)').eq('user_id', userId).limit(1).maybeSingle(),
    supabase.from('user_usage_daily').select('analysis_count,symbol_count,usage_date').eq('user_id', userId).eq('usage_date', today).maybeSingle(),
  ])
  const symbols = ((watchlist?.user_watchlist_items || []) as Array<{ symbol: string }>).map((item) => item.symbol).sort()
  return { profile, watchlist: symbols, watchlistId: watchlist?.id || null, usage }
}

export async function recentUserRuns(userId: string, limit = 20) {
  const supabase = serviceClient()
  if (!supabase) return []
  const { data } = await supabase.from('analysis_requests')
    .select('run_id,analysis_runs(id,as_of,regime_score,status,completed_at,created_at)')
    .eq('user_id', userId)
    .not('run_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data || []).flatMap((row) => row.analysis_runs ? [row.analysis_runs] : [])
}

export async function replaceUserWatchlist(userId: string, symbols: string[]) {
  const supabase = serviceClient()
  if (!supabase) throw new Error('Supabase is not configured')
  const { data: watchlist, error: watchlistError } = await supabase.from('user_watchlists')
    .upsert({ user_id: userId, name: 'My Watchlist', updated_at: new Date().toISOString() }, { onConflict: 'user_id,name' })
    .select('id').single()
  if (watchlistError || !watchlist) throw new Error(watchlistError?.message || 'Watchlist unavailable')
  const { error: deleteError } = await supabase.from('user_watchlist_items').delete().eq('watchlist_id', watchlist.id)
  if (deleteError) throw new Error(deleteError.message)
  if (symbols.length) {
    const { error } = await supabase.from('user_watchlist_items')
      .insert(symbols.map((symbol) => ({ watchlist_id: watchlist.id, symbol })))
    if (error) throw new Error(error.message)
  }
  return symbols
}

export async function saveFeedback(userId: string, input: {
  runId?: number; symbol?: string; helpful: boolean; reason?: string; comment?: string
}) {
  const supabase = serviceClient()
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.from('feedback_events').insert({
    user_id: userId,
    run_id: input.runId || null,
    symbol: input.symbol || null,
    helpful: input.helpful,
    reason: input.reason || null,
    comment: input.comment?.slice(0, 1000) || null,
  })
  if (error) throw new Error(error.message)
}
