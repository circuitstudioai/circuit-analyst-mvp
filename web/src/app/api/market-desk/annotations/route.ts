import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { annotationRecord } from '@/lib/marketDeskPilot'
import { serviceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const body = await req.json().catch(() => ({}))
  const record = annotationRecord(auth.user.id, body)
  if ('error' in record && record.error) return NextResponse.json({ error: record.error }, { status: 400 })
  const client = serviceClient()
  if (!client || !record.row) return NextResponse.json({ error: 'Annotation storage is not configured.' }, { status: 503 })
  const { error } = await client.from('market_desk_annotations').insert(record.row)
  if (error) return NextResponse.json({ error: error.message }, { status: 502 })
  return NextResponse.json({ saved: true, storage: 'account' })
}
