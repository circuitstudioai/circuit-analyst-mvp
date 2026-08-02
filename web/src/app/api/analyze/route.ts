import { NextRequest, NextResponse } from 'next/server'
import { analyzeWatchlist } from '@/lib/engine'
import { enrichWithGemini } from '@/lib/gemini'
import { saveRun } from '@/lib/supabase'

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
  try {
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

    const cacheKey = watchlist.join(',')
    const cached = responseCache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json({ ...(cached.payload as object), cached: true })
    }

    const base = await analyzeWatchlist(watchlist)
    const signals = await enrichWithGemini(base.signals, base.regimeScore)
    const draft = { ...base, signals }

    const saved = await saveRun(draft)
    const persistenceStep = {
      label: 'Persistence',
      status: saved.ok ? 'complete' as const : saved.error ? 'fallback' as const : 'skipped' as const,
      detail: saved.ok
        ? `Supabase saved run ${saved.runId}`
        : saved.error
          ? `Supabase save failed: ${saved.error}`
          : 'Supabase env absent; analysis remains live but not stored',
    }
    const payload = { ...draft, pipeline: [...draft.pipeline, persistenceStep], saved }

    responseCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, payload })
    return NextResponse.json(payload)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Analyze failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
