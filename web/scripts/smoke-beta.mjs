#!/usr/bin/env node

import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const baseUrl = process.env.BETA_BASE_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!baseUrl || !supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error('BETA_BASE_URL and Supabase environment variables are required')
}

const suffix = randomBytes(6).toString('hex')
const email = `circuit-beta-smoke-${suffix}@example.com`
const password = `Smoke-${randomBytes(18).toString('base64url')}!`
const smokeSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META']
const smokeSymbol = smokeSymbols[Number.parseInt(suffix.slice(0, 2), 16) % smokeSymbols.length]
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
const publicClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } })
let userId

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  const body = await response.json().catch(() => null)
  return { status: response.status, body }
}

async function runBackgroundAnalysis(headers, payload) {
  const queued = await api('/api/analysis-jobs', {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(payload),
  })
  if (queued.status !== 202 || !queued.body?.jobId) throw new Error(`Background analysis queue failed (${queued.status})`)
  for (let attempt = 0; attempt < 180; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const snapshot = await api(`/api/analysis-jobs?id=${encodeURIComponent(queued.body.jobId)}`, { headers })
    if (snapshot.status !== 200) throw new Error(`Background analysis poll failed (${snapshot.status})`)
    if (!snapshot.body?.job?.progress?.terminal) continue
    if (snapshot.body.job.progress.status === 'failed') throw new Error(snapshot.body.job.error || 'Background analysis failed')
    return snapshot.body.job
  }
  throw new Error('Background analysis timed out')
}

try {
  const universe = await api('/api/universe')
  if (universe.status !== 200 || universe.body?.symbols?.length !== 100) throw new Error('Universe smoke failed')

  const unauthorized = await api('/api/analyze', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ watchlist: ['NVDA'] }),
  })
  if (unauthorized.status !== 401) throw new Error('Unauthenticated analysis was not blocked')

  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (createError || !created.user) throw new Error(createError?.message || 'Test user creation failed')
  userId = created.user.id

  const { data: signedIn, error: signInError } = await publicClient.auth.signInWithPassword({ email, password })
  if (signInError || !signedIn.session) throw new Error(signInError?.message || 'Test sign-in failed')
  const headers = { authorization: `Bearer ${signedIn.session.access_token}` }

  const onboarding = await api('/api/me', {
    method: 'PATCH',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({
      experienceLevel: 'self_directed',
      watchlistSize: '6_15',
      investingHorizon: 'weeks',
      primaryJob: 'monitor_watchlist',
    }),
  })
  if (onboarding.status !== 200 || !onboarding.body?.onboardingCompletedAt) throw new Error('Onboarding smoke failed')

  const me = await api('/api/me', { headers })
  if (me.status !== 200 || !Array.isArray(me.body?.watchlist)) throw new Error('Profile/watchlist smoke failed')

  const savedWatchlist = await api('/api/me', {
    method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ symbols: [smokeSymbol, 'AMD'] }),
  })
  if (savedWatchlist.status !== 200) throw new Error('Watchlist update smoke failed')

  const firstJob = await runBackgroundAnalysis(headers, {
    watchlist: [smokeSymbol], question: `What does the evidence say about ${smokeSymbol} now?`,
  })
  const analysis = firstJob.result
  if (!analysis?.saved?.runId || !analysis?.conversationId || !analysis?.signals?.[0]?.deepAnalysis?.sources?.length) {
    throw new Error(`Background analysis did not return a persisted, cited answer: ${JSON.stringify({
      jobStatus: firstJob.progress?.status,
      jobError: firstJob.error,
      runId: analysis?.saved?.runId || null,
      conversationId: analysis?.conversationId || null,
      reportStatus: analysis?.signals?.[0]?.deepAnalysis?.status || null,
      reportErrorCode: analysis?.signals?.[0]?.deepAnalysis?.errorCode || null,
      sourceCount: analysis?.signals?.[0]?.deepAnalysis?.sources?.length || 0,
    })}`)
  }

  const followUpJob = await runBackgroundAnalysis(headers, {
    watchlist: [smokeSymbol], question: 'What evidence would most clearly change that view?', threadId: analysis.conversationId,
  })
  if (followUpJob.result?.conversationId !== analysis.conversationId) throw new Error('Follow-up did not continue the conversation')

  const conversation = await api(`/api/conversations?threadId=${encodeURIComponent(analysis.conversationId)}`, { headers })
  if (conversation.status !== 200 || conversation.body?.messages?.length < 4) throw new Error('Conversation reload smoke failed')

  const reportOpened = await api('/api/events', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ eventName: 'report_opened', runId: analysis.saved.runId, properties: { smoke: true } }),
  })
  if (reportOpened.status !== 200) throw new Error('Product event smoke failed')

  const feedback = await api('/api/feedback', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ runId: analysis.saved.runId, symbol: smokeSymbol, helpful: true, reason: 'actionable' }),
  })
  if (feedback.status !== 200) throw new Error('Feedback smoke failed')

  const runs = await api('/api/runs', { headers })
  if (runs.status !== 200 || !runs.body?.runs?.length) throw new Error('User run ledger smoke failed')

  process.stdout.write(`${JSON.stringify({
    ok: true,
    universe: universe.body.symbols.length,
    unauthorized_status: unauthorized.status,
    default_watchlist: me.body.watchlist,
    saved_watchlist: savedWatchlist.body.watchlist,
    analysis_run: analysis.saved.runId,
    background_job: firstJob.id,
    cited_sources: analysis.signals[0].deepAnalysis.sources.length,
    follow_up_job: followUpJob.id,
    reloaded_messages: conversation.body.messages.length,
    onboarding: true,
    open_signup_user: true,
    product_event: reportOpened.body.ok,
    feedback: feedback.body.ok,
    user_runs: runs.body.runs.length,
  }, null, 2)}\n`)
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId)
}
