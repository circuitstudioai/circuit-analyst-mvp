import { NextRequest, NextResponse } from 'next/server'
import { analyzeWatchlist } from '@/lib/engine'
import { applyGeminiEnrichment, enrichWithGemini } from '@/lib/gemini'
import { computeConsensus } from '@/lib/consensus'
import { ruleEngineOutputsFromAnalysis } from '@/lib/engineOutputs'
import { completeRun, ingestEngineOutputs, saveConsensus, saveRun } from '@/lib/supabase'
import { requireBetaUser } from '@/lib/betaAuth'
import { claimAnalysisQuota, createAnalysisRequest, finishAnalysisRequest, recordProductEvent } from '@/lib/betaData'

const DEFAULT_WATCHLIST = ['AMD', 'SOFI', 'HIMS', 'HOOD', 'LMND', 'OSCR', 'WELL', 'ZETA', 'RLAY']
const MAX_SYMBOLS = 12
const CACHE_TTL_MS = 1000 * 60 * 5
const RATE_WINDOW_MS = 1000 * 60 * 60
const RATE_LIMIT = 24

const responseCache = new Map<string, { expires: number; payload: unknown }>()
const rateLimit = new Map<string, { reset: number; count: number }>()

function clientKey(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'local'
}

function checkRateLimit(req: NextRequest) {
  const key = clientKey(req)
  const now = Date.now()
  const current = rateLimit.get(key)
  if (!current || current.reset < now) {
    rateLimit.set(key, { reset: now + RATE_WINDOW_MS, count: 1 })
    return null
  }
  current.count += 1
  if (current.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((current.reset - now) / 1000)
    return retryAfter
  }
  return null
}

function normalizeWatchlist(input: unknown) {
  const raw = Array.isArray(input) && input.length ? input : DEFAULT_WATCHLIST
  return [...new Set(raw.map((item) => String(item).trim().toUpperCase()).filter(Boolean))]
    .filter((symbol) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))
    .slice(0, MAX_SYMBOLS)
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  let requestId: string | null | undefined
  try {
    const auth = await requireBetaUser(req)
    if (auth.response) return auth.response

    const retryAfter = checkRateLimit(req)
    if (retryAfter) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, {
        status: 429,
        headers: { 'retry-after': String(retryAfter) },
      })
    }

    const body = await req.json().catch(() => ({}))
    const watchlist = normalizeWatchlist(body?.watchlist)
    if (!watchlist.length) {
      return NextResponse.json({ error: 'Enter at least one valid ticker.' }, { status: 400 })
    }

    const quota = await claimAnalysisQuota(auth.user.id, watchlist.length)
    if (!quota.allowed) {
      return NextResponse.json({
        error: 'Daily beta quota reached. Try again tomorrow.',
        quota: { analysesUsed: quota.analysis_count, analysesLimit: 3, symbolsUsed: quota.symbol_count, symbolsLimit: 24 },
      }, { status: 429 })
    }
    requestId = await createAnalysisRequest(auth.user.id, watchlist)

    const cacheKey = watchlist.join(',')
    const cached = responseCache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      const cachedRunId = Number((cached.payload as { saved?: { runId?: number } }).saved?.runId) || undefined
      await finishAnalysisRequest(requestId, { runId: cachedRunId, status: 'cached', durationMs: Date.now() - startedAt })
      await recordProductEvent(auth.user.id, 'analysis_completed', {
        runId: cachedRunId,
        properties: { symbolCount: watchlist.length, cached: true, persisted: Boolean(cachedRunId) },
      })
      return NextResponse.json({ ...(cached.payload as object), cached: true })
    }

    const base = await analyzeWatchlist(watchlist)
    const enrichment = await enrichWithGemini(base.signals, base.regimeScore)
    const draft = applyGeminiEnrichment(base, enrichment)

    const saved = await saveRun(draft)
    let pipelineResult: Record<string, unknown> = { saved }

    if (saved.ok && saved.runId) {
      const engineOutputs = ruleEngineOutputsFromAnalysis(draft, saved.runId)
      const ingested = await ingestEngineOutputs(engineOutputs)
      const consensus = engineOutputs
        .map((row) => computeConsensus([row]))
        .filter((row) => row !== null)
      const consensusWrites = await Promise.all(consensus.map((row) => saveConsensus(row)))
      const writeErrors = [
        ...('error' in ingested && ingested.error ? [ingested.error] : []),
        ...consensusWrites.flatMap((row) => row.error ? [row.error] : []),
      ]
      const finalStatus = writeErrors.length ? 'partial' : 'completed'
      const completion = await completeRun(saved.runId, finalStatus, writeErrors.join('; ') || undefined)
      pipelineResult = { saved, ingested, consensus, completion }
    }
    const persistenceStep = {
      label: 'Persistence',
      status: saved.ok ? 'complete' as const : saved.error ? 'fallback' as const : 'skipped' as const,
      detail: saved.ok
        ? `Supabase saved run ${saved.runId}`
        : saved.error
          ? `Supabase save failed: ${saved.error}`
          : 'Supabase env absent; analysis remains live but not stored',
    }
    const payload = { ...draft, pipeline: [...draft.pipeline, persistenceStep], ...pipelineResult }

    responseCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, payload })
    await finishAnalysisRequest(requestId, {
      runId: saved.runId,
      status: saved.ok ? 'completed' : 'partial',
      durationMs: Date.now() - startedAt,
    })
    await recordProductEvent(auth.user.id, 'analysis_completed', {
      runId: saved.runId,
      properties: { symbolCount: watchlist.length, cached: false, persisted: Boolean(saved.ok) },
    })
    return NextResponse.json(payload)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Analyze failed'
    await finishAnalysisRequest(requestId, { status: 'failed', durationMs: Date.now() - startedAt, error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
