import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { recentUserRuns } from '@/lib/betaData'

export async function GET(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const runs = await recentUserRuns(auth.user.id, 20)
  return NextResponse.json({ runs })
}
