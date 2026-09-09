import { NextRequest, NextResponse } from 'next/server'
import { computeConsensus } from '@/lib/consensus'
import { buildMaterialChangeBrief } from '@/lib/dailyBrief'
import { analyzeWatchlist } from '@/lib/engine'
import { runMultiEngineAnalysis } from '@/lib/multiEngine'
import { verifyJobRequest } from '@/lib/jobAuth'
import { completeRun, ingestEngineOutputs, latestConsensusDiff, saveConsensus, saveDailyBrief, saveProviderUsage, saveRun } from '@/lib/supabase'

const DEFAULT_WATCHLIST = ['AMD', 'SOFI', 'HIMS', 'HOOD', 'LMND', 'OSCR', 'WELL', 'ZETA', 'RLAY']
const MAX_SYMBOLS = 40

function normalizeWatchlist(input: unknown) {
  const raw = Array.isArray(input) && input.length ? input : DEFAULT_WATCHLIST
  return [...new Set(raw.map((item) => String(item).trim().toUpperCase()).filter(Boolean))]
    .filter((symbol) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))
    .slice(0, MAX_SYMBOLS)
}

async function runRefresh(req: NextRequest, input: unknown) {
  try {
    const unauthorized = verifyJobRequest(req)
    if (unauthorized) return unauthorized

    const body = (input && typeof input === 'object' ? input : {}) as { watchlist?: unknown }
    const watchlist = normalizeWatchlist(body?.watchlist)
    if (!watchlist.length) {
      return NextResponse.json({ error: 'at least one valid ticker required' }, { status: 400 })
    }

    const base = await analyzeWatchlist(watchlist)
    const analysis = base
    const savedRun = await saveRun(analysis)

    if (!savedRun.ok || !savedRun.runId) {
      return NextResponse.json({ error: savedRun.error || 'run persistence failed', savedRun }, { status: 502 })
    }

    const engineOutputs = await runMultiEngineAnalysis(analysis, savedRun.runId)
    const ingest = await ingestEngineOutputs(engineOutputs)
    const byTicker = new Map<string, typeof engineOutputs>()
    for (const row of engineOutputs) byTicker.set(row.ticker, [...(byTicker.get(row.ticker) || []), row])
    const consensus = [...byTicker.values()]
      .map((rows) => computeConsensus(rows))
      .filter((row) => row !== null)

    const consensusWrites = await Promise.all(consensus.map((row) => saveConsensus(row)))
    const diffs = await latestConsensusDiff()
    const brief = buildMaterialChangeBrief(savedRun.runId, consensus, engineOutputs, diffs, analysis.asOf)
    const briefWrite = await saveDailyBrief(brief)
    const researchUsage = engineOutputs.reduce((total, row) => total + Number((row.raw_payload as { usage?: { total_tokens?: number } } | null)?.usage?.total_tokens || 0), 0)
    const aiResearch = engineOutputs
      .filter((row) => row.engine_name === 'ai_research')
      .map((row) => ({
        ticker: row.ticker,
        status: (row.raw_payload as { abstained?: boolean } | null)?.abstained ? 'abstained' : 'completed',
        model: (row.raw_payload as { model?: string } | null)?.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash',
        error: row.risk_flags?.[0] || null,
      }))
    const usageWrite = researchUsage ? await saveProviderUsage({ provider: 'gemini', route: '/api/jobs/refresh:ai_research', units: researchUsage }) : { skipped: true }
    const errors = [
      ...('error' in ingest && ingest.error ? [ingest.error] : []),
      ...consensusWrites.flatMap((row) => row.error ? [row.error] : []),
      ...('error' in briefWrite && briefWrite.error ? [briefWrite.error] : []),
      ...('error' in usageWrite && usageWrite.error ? [usageWrite.error] : []),
    ]
    const completion = await completeRun(
      savedRun.runId,
      errors.length ? 'partial' : 'completed',
      errors.join('; ') || undefined,
    )

    return NextResponse.json({
      ok: true,
      asOf: analysis.asOf,
      watchlist,
      savedRun,
      completion,
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
      dailyBrief: briefWrite,
      providerUsage: usageWrite,
      aiResearch,
      pipeline: analysis.pipeline,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'refresh failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return runRefresh(req, {})
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return runRefresh(req, body)
}
