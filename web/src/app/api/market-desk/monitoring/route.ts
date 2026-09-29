import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { monitoringRefusal } from '@/lib/marketDeskPilot'
import { serviceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const refusal = monitoringRefusal()
  const client = serviceClient()
  if (client) {
    await client.from('market_desk_notifications').insert({
      user_id: auth.user.id,
      decision: 'not_sent',
      reason: refusal.eligibility.reasons.join(' '),
    })
  }
  return NextResponse.json(refusal, { status: 409 })
}
