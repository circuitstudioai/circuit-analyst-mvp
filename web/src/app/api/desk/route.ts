import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { userOwnsRun } from '@/lib/betaData'
import { engineOutputsForRun, latestConsensus } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const runId = Number(req.nextUrl.searchParams.get('runId'))
  if (!Number.isSafeInteger(runId) || runId <= 0) {
    return NextResponse.json({ error: 'valid runId required' }, { status: 400 })
  }
  if (!await userOwnsRun(auth.user.id, runId)) {
    return NextResponse.json({ error: 'run not found' }, { status: 404 })
  }
  const [consensus, engines] = await Promise.all([latestConsensus(runId), engineOutputsForRun(runId)])
  return NextResponse.json({ runId, consensus, engines })
}
