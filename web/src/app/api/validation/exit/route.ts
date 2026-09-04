import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { completeExitFeedback } from '@/lib/betaData'

const lossReactions = new Set(['not_disappointed', 'somewhat_disappointed', 'very_disappointed'])
const paymentChoices = new Set(['no', 'maybe', 'yes_10_20', 'yes_20_plus'])

export async function POST(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const body = await req.json().catch(() => ({}))
  if (!lossReactions.has(String(body?.lossReaction)) || !paymentChoices.has(String(body?.willingnessToPay))) {
    return NextResponse.json({ error: 'Invalid exit feedback.' }, { status: 400 })
  }
  return NextResponse.json(await completeExitFeedback(auth.user.id, {
    lossReaction: body.lossReaction,
    willingnessToPay: body.willingnessToPay,
  }))
}
