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
  const [{ data: profile }, { data: watchlist }, { data: usage }, { data: cohort }] = await Promise.all([
    supabase.from('profiles').select('id,email,display_name,beta_role,experience_level,watchlist_size,investing_horizon,primary_job,onboarding_completed_at').eq('id', userId).maybeSingle(),
    supabase.from('user_watchlists').select('id,name,user_watchlist_items(symbol)').eq('user_id', userId).limit(1).maybeSingle(),
    supabase.from('user_usage_daily').select('analysis_count,symbol_count,usage_date').eq('user_id', userId).eq('usage_date', today).maybeSingle(),
    supabase.from('beta_cohort_members')
      .select('invited_at,activated_at,cycle_completed_at,exit_feedback_completed_at,beta_cohorts(slug,name,starts_on,ends_on,target_size,status)')
      .eq('user_id', userId).limit(1).maybeSingle(),
  ])
  const symbols = ((watchlist?.user_watchlist_items || []) as Array<{ symbol: string }>).map((item) => item.symbol).sort()
  return { profile, watchlist: symbols, watchlistId: watchlist?.id || null, usage, cohort }
}

export type OnboardingInput = {
  experienceLevel: 'beginner' | 'self_directed' | 'active'
  watchlistSize: '1_5' | '6_15' | '16_30' | '31_plus'
  investingHorizon: 'days' | 'weeks' | 'months' | 'years'
  primaryJob: 'screen_ideas' | 'monitor_watchlist' | 'validate_decision' | 'manage_risk'
}

export async function completeOnboarding(userId: string, input: OnboardingInput) {
  const supabase = serviceClient()
  if (!supabase) throw new Error('Supabase is not configured')
  const completedAt = new Date().toISOString()
  const { error } = await supabase.from('profiles').update({
    experience_level: input.experienceLevel,
    watchlist_size: input.watchlistSize,
    investing_horizon: input.investingHorizon,
    primary_job: input.primaryJob,
    onboarding_completed_at: completedAt,
    updated_at: completedAt,
  }).eq('id', userId)
  if (error) throw new Error(error.message)

  const { data: cohort } = await supabase.from('beta_cohorts')
    .select('id').in('status', ['recruiting', 'active']).order('starts_on').limit(1).maybeSingle()
  if (cohort) {
    await supabase.from('beta_cohort_members').upsert(
      { cohort_id: cohort.id, user_id: userId },
      { onConflict: 'cohort_id,user_id', ignoreDuplicates: true },
    )
  }
  await recordProductEvent(userId, 'onboarding_completed', { properties: input })
  return { onboardingCompletedAt: completedAt }
}

export async function completeExitFeedback(userId: string, input: {
  lossReaction: 'not_disappointed' | 'somewhat_disappointed' | 'very_disappointed'
  willingnessToPay: 'no' | 'maybe' | 'yes_10_20' | 'yes_20_plus'
}) {
  const supabase = serviceClient()
  if (!supabase) throw new Error('Supabase is not configured')
  const completedAt = new Date().toISOString()
  const { data, error } = await supabase.from('beta_cohort_members').update({
    loss_reaction: input.lossReaction,
    willingness_to_pay: input.willingnessToPay,
    cycle_completed_at: completedAt,
    exit_feedback_completed_at: completedAt,
  }).eq('user_id', userId).select('user_id').maybeSingle()
  if (error || !data) throw new Error(error?.message || 'Active beta cohort membership required')
  await recordProductEvent(userId, 'beta_feedback_sent', { properties: { source: 'exit_survey' } })
  return { completedAt }
}

export type ProductEventName =
  | 'session_started' | 'onboarding_completed' | 'watchlist_saved'
  | 'analysis_completed' | 'report_opened' | 'decision_brief_used' | 'beta_feedback_sent'

export async function recordProductEvent(userId: string, eventName: ProductEventName, input: {
  runId?: number
  symbol?: string
  properties?: Record<string, unknown>
} = {}) {
  const supabase = serviceClient()
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.from('product_events').insert({
    user_id: userId,
    event_name: eventName,
    run_id: input.runId || null,
    symbol: input.symbol || null,
    properties: input.properties || {},
  })
  if (error) throw new Error(error.message)

  if (['onboarding_completed', 'watchlist_saved', 'analysis_completed', 'report_opened'].includes(eventName)) {
    const { data: activationEvents } = await supabase.from('product_events')
      .select('event_name').eq('user_id', userId)
      .in('event_name', ['onboarding_completed', 'watchlist_saved', 'analysis_completed', 'report_opened'])
    const completed = new Set((activationEvents || []).map((event) => event.event_name))
    if (completed.size === 4) {
      await supabase.from('beta_cohort_members')
        .update({ activated_at: new Date().toISOString() })
        .eq('user_id', userId).is('activated_at', null)
    }
  }
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
  await recordProductEvent(userId, 'watchlist_saved', { properties: { symbolCount: symbols.length } })
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
  await recordProductEvent(userId, input.helpful ? 'decision_brief_used' : 'beta_feedback_sent', {
    runId: input.runId,
    symbol: input.symbol,
    properties: { source: 'report_rating', helpful: input.helpful, reason: input.reason || null },
  })
}
