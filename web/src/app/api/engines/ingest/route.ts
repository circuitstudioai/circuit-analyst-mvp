import { NextRequest, NextResponse } from 'next/server'
import { ingestEngineOutputs } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rows = Array.isArray(body?.rows) ? body.rows : []
    const res = await ingestEngineOutputs(rows)
    return NextResponse.json(res)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'ingest failed' }, { status: 500 })
  }
}
