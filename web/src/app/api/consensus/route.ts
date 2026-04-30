import { NextRequest, NextResponse } from 'next/server'
import { computeConsensus, EngineOutput } from '@/lib/consensus'
import { latestEngineOutputsByTicker, saveConsensus } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ticker = (body?.ticker || '').toString().toUpperCase()
    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

    const rows = (await latestEngineOutputsByTicker(ticker)) as EngineOutput[]
    if (!rows.length) return NextResponse.json({ error: 'no engine outputs for ticker' }, { status: 404 })

    // latest per engine
    const map = new Map<string, EngineOutput>()
    for (const r of rows) if (!map.has(r.engine_name)) map.set(r.engine_name, r)
    const latest = Array.from(map.values())

    const result = computeConsensus(latest)
    if (!result) return NextResponse.json({ error: 'consensus failed' }, { status: 500 })
    await saveConsensus(result)

    return NextResponse.json({ consensus: result, engines: latest })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'consensus failed' }, { status: 500 })
  }
}
