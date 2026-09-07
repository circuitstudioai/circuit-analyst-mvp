import { NextRequest, NextResponse } from 'next/server'
import { validateEngineOutputRows } from '@/lib/engineOutputs'
import { computeConsensus, EngineOutput } from '@/lib/consensus'
import { verifyJobRequest } from '@/lib/jobAuth'
import { ingestEngineOutputs, latestEngineOutputsByTicker, saveConsensus } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const unauthorized = verifyJobRequest(req)
    if (unauthorized) return unauthorized

    const body = await req.json()
    const { rows, error } = validateEngineOutputRows(body?.rows)
    if (error) return NextResponse.json({ error }, { status: 400 })

    const res = await ingestEngineOutputs(rows)
    if ('error' in res && res.error) return NextResponse.json(res, { status: 502 })

    const keys = [...new Set(rows.map((row) => `${row.run_id}:${row.ticker}`))]
    const consensus = await Promise.all(keys.map(async (key) => {
      const [runIdText, ticker] = key.split(':')
      const available = await latestEngineOutputsByTicker(ticker, Number(runIdText)) as EngineOutput[]
      const latest = new Map<string, EngineOutput>()
      for (const row of available) if (!latest.has(row.engine_name)) latest.set(row.engine_name, row)
      const result = computeConsensus([...latest.values()])
      if (result) await saveConsensus(result)
      return result
    }))
    return NextResponse.json({ ...res, consensus })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'ingest failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
