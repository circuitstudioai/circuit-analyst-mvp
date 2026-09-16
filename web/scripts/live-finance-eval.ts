import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { evaluateFinanceReport, validateFinanceEvaluationSet, type FinanceEvaluationSet } from '../src/lib/financeEvaluation'

const baseUrl = process.env.LIVE_EVAL_BASE_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!baseUrl || !supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error('LIVE_EVAL_BASE_URL and Supabase environment variables are required')
}

const evaluationSet = JSON.parse(readFileSync(new URL('../src/evals/finance-domain.v1.json', import.meta.url), 'utf8')) as FinanceEvaluationSet
const setErrors = validateFinanceEvaluationSet(evaluationSet)
if (setErrors.length) throw new Error(setErrors.join('; '))

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
const publicClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } })

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  return { status: response.status, body: await response.json().catch(() => null) }
}

async function runCase(item: FinanceEvaluationSet['cases'][number]) {
  const suffix = randomBytes(8).toString('hex')
  const email = `circuit-live-eval-${suffix}@example.com`
  const password = `Eval-${randomBytes(18).toString('base64url')}!`
  let userId: string | undefined
  try {
    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !created.user) throw new Error(error?.message || 'Eval user creation failed')
    userId = created.user.id
    const { error: roleError } = await admin.from('profiles').update({ beta_role: 'admin' }).eq('id', userId)
    if (roleError) throw new Error(roleError.message)
    const { data: signedIn, error: signInError } = await publicClient.auth.signInWithPassword({ email, password })
    if (signInError || !signedIn.session) throw new Error(signInError?.message || 'Eval sign-in failed')
    const headers = { authorization: `Bearer ${signedIn.session.access_token}` }
    const watchlist = item.symbolCount > 1
      ? [item.symbol, item.symbol === 'QQQ' ? 'SPY' : 'AMD']
      : [item.symbol]
    const queued = await api('/api/analysis-jobs', {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ watchlist, question: item.question }),
    })
    if (queued.status !== 202 || !queued.body?.jobId) throw new Error(`Queue failed: ${queued.status}`)
    for (let attempt = 0; attempt < 180; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const snapshot = await api(`/api/analysis-jobs?id=${encodeURIComponent(queued.body.jobId)}`, { headers })
      if (snapshot.status !== 200) throw new Error(`Poll failed: ${snapshot.status}`)
      if (!snapshot.body?.job?.progress?.terminal) continue
      const report = snapshot.body.job.result?.signals?.find((signal: { symbol?: string }) => signal.symbol === item.symbol)?.deepAnalysis
      if (!report) throw new Error(snapshot.body.job.error || 'No deep-analysis report')
      return evaluateFinanceReport(item, report)
    }
    throw new Error('Evaluation timed out')
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId)
  }
}

async function main() {
  const results = []
  for (const item of evaluationSet.cases) {
    try { results.push(await runCase(item)) }
    catch (error) {
      results.push({ caseId: item.id, passed: false, score: 0, error: error instanceof Error ? error.message : String(error), checks: [] })
    }
  }
  const baseline = {
    evaluationSet: `${evaluationSet.name}@${evaluationSet.version}`,
    baseUrl,
    recordedAt: new Date().toISOString(),
    passed: results.filter((result) => result.passed).length,
    total: results.length,
    results,
  }
  process.stdout.write(`${JSON.stringify(baseline, null, 2)}\n`)
  if (baseline.passed !== baseline.total) process.exitCode = 1
}

void main()
