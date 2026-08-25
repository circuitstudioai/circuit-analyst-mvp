import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { saveFeedback } from '@/lib/betaData'

const reasons = new Set(['actionable', 'too_generic', 'wrong_data', 'unclear', 'missing_catalyst', 'other'])

export async function POST(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const body = await req.json().catch(() => ({}))
  if (typeof body?.helpful !== 'boolean') {
    return NextResponse.json({ error: 'helpful must be true or false' }, { status: 400 })
  }
  const reason = body?.reason ? String(body.reason) : undefined
  if (reason && !reasons.has(reason)) return NextResponse.json({ error: 'invalid reason' }, { status: 400 })
  await saveFeedback(auth.user.id, {
    runId: Number(body?.runId) || undefined,
    symbol: body?.symbol ? String(body.symbol).toUpperCase() : undefined,
    helpful: body.helpful,
    reason,
    comment: body?.comment ? String(body.comment) : undefined,
  })
  return NextResponse.json({ ok: true })
}
