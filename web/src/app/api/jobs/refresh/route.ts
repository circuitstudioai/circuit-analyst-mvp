import { NextRequest, NextResponse } from 'next/server'
import { computeConsensus } from '@/lib/consensus'
import { analyzeWatchlist } from '@/lib/engine'
import { ruleEngineOutputsFromAnalysis } from '@/lib/engineOutputs'
import { enrichWithGemini } from '@/lib/gemini'
import { verifyJobRequest } from '@/lib/jobAuth'
import { ingestEngineOutputs, saveConsensus, saveRun } from '@/lib/supabase'

const DEFAULT_WATCHLIST = ['AMD', 'SOFI', 'HIMS', 'HOOD', 'LMND', 'OSCR', 'WELL', 'ZETA', 'RLAY']
const MAX_SYMBOLS = 40

function normalizeWatchlist(input: unknown) {
  const raw = Array.isArray(input) && input.length ? input : DEFAULT_WATCHLIST
  return [...new Set(raw.map((item) => String(item).trim().toUpperCase()).filter(Boolean))]
    .filter((symbol) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))
    .slice(0, MAX_SYMBOLS)
}

export async function POST(req: NextRequest) {
  try {
    const unauthorized = verifyJobRequest(req)
    if (unauthorized) return unauthorized

    const body = await req.json().catch(() => ({}))
    const watchlist = normalizeWatchlist(body?.watchlist)
    if (!watchlist.length) {
      return NextResponse.json({ error: 'at least one valid ticker required' }, { status: 400 })
    }

    const base = await analyzeWatchlist(watchlist)
    const signals = await enrichWithGemini(base.signals, base.regimeScore)
    const analysis = { ...base, signals }
    const savedRun = await saveRun(analysis)

    const engineOutputs = ruleEngineOutputsFromAnalysis(analysis)
    const ingest = await ingestEngineOutputs(engineOutputs)
    const consensus = engineOutputs
      .map((row) => computeConsensus([row]))
      .filter((row) => row !== null)

    const consensusWrites = await Promise.all(consensus.map((row) => saveConsensus(row)))

    return NextResponse.json({
      ok: true,
      asOf: analysis.asOf,
      watchlist,
      savedRun,
      engineOutputs: {
        attempted: engineOutputs.length,
        result: ingest,
      },
      consensus: {
        attempted: consensus.length,
        saved: consensusWrites.filter((row) => row.ok).length,
        skipped: consensusWrites.filter((row) => row.skipped).length,
        errors: consensusWrites.filter((row) => row.error).map((row) => row.error),
      },
      pipeline: analysis.pipeline,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'refresh failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
