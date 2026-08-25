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
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
const publicClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } })
let userId

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  const body = await response.json().catch(() => null)
  return { status: response.status, body }
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

  const me = await api('/api/me', { headers })
  if (me.status !== 200 || !Array.isArray(me.body?.watchlist)) throw new Error('Profile/watchlist smoke failed')

  const savedWatchlist = await api('/api/me', {
    method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ symbols: ['NVDA', 'AMD'] }),
  })
  if (savedWatchlist.status !== 200) throw new Error('Watchlist update smoke failed')

  const analysis = await api('/api/analyze', {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ watchlist: ['NVDA'] }),
  })
  if (analysis.status !== 200 || !analysis.body?.saved?.runId) throw new Error(`Analysis smoke failed (${analysis.status})`)

  const feedback = await api('/api/feedback', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ runId: analysis.body.saved.runId, symbol: 'NVDA', helpful: true }),
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
    analysis_run: analysis.body.saved.runId,
    feedback: feedback.body.ok,
    user_runs: runs.body.runs.length,
  }, null, 2)}\n`)
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId)
}
