import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { ProductEventName, recordProductEvent } from '@/lib/betaData'

const clientEvents = new Set<ProductEventName>([
  'session_started', 'report_opened', 'decision_brief_used', 'beta_feedback_sent',
])

export async function POST(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const body = await req.json().catch(() => ({}))
  const eventName = String(body?.eventName || '') as ProductEventName
  if (!clientEvents.has(eventName)) {
    return NextResponse.json({ error: 'Invalid eventName' }, { status: 400 })
  }
  const properties = body?.properties && typeof body.properties === 'object' && !Array.isArray(body.properties)
    ? body.properties as Record<string, unknown>
    : {}
  const serializedProperties = JSON.stringify(properties)
  if (serializedProperties.length > 4000) {
    return NextResponse.json({ error: 'Event properties are too large' }, { status: 400 })
  }
  await recordProductEvent(auth.user.id, eventName, {
    runId: Number(body?.runId) || undefined,
    symbol: body?.symbol ? String(body.symbol).toUpperCase().slice(0, 10) : undefined,
    properties,
  })
  return NextResponse.json({ ok: true })
}
