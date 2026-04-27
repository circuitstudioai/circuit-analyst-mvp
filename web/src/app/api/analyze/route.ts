import { NextRequest, NextResponse } from 'next/server'
import { analyzeWatchlist } from '@/lib/engine'
import { enrichWithGemini } from '@/lib/gemini'
import { saveRun } from '@/lib/supabase'

const DEFAULT_WATCHLIST = ['AMD', 'SOFI', 'HIMS', 'HOOD', 'LMND', 'OSCR', 'WELL', 'ZETA', 'RLAY']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const watchlist = Array.isArray(body?.watchlist) && body.watchlist.length ? body.watchlist : DEFAULT_WATCHLIST

    const base = await analyzeWatchlist(watchlist)
    const signals = await enrichWithGemini(base.signals, base.regimeScore)
    const payload = { ...base, signals }

    const saved = await saveRun(payload)
    return NextResponse.json({ ...payload, saved })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Analyze failed' }, { status: 500 })
  }
}
