import { NextRequest, NextResponse } from 'next/server'
import { validateEngineOutputRows } from '@/lib/engineOutputs'
import { verifyJobRequest } from '@/lib/jobAuth'
import { ingestEngineOutputs } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const unauthorized = verifyJobRequest(req)
    if (unauthorized) return unauthorized

    const body = await req.json()
    const { rows, error } = validateEngineOutputRows(body?.rows)
    if (error) return NextResponse.json({ error }, { status: 400 })

    const res = await ingestEngineOutputs(rows)
    return NextResponse.json(res)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'ingest failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
