import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { completeOnboarding, OnboardingInput, replaceUserWatchlist, userBetaState } from '@/lib/betaData'

function normalizeSymbols(input: unknown) {
  if (!Array.isArray(input)) return []
  return [...new Set(input.map((value) => String(value).trim().toUpperCase()))]
    .filter((symbol) => /^[A-Z][A-Z.]{0,8}$/.test(symbol))
    .slice(0, 24)
}

export async function GET(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  return NextResponse.json(await userBetaState(auth.user.id))
}

export async function PUT(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const body = await req.json().catch(() => ({}))
  const symbols = normalizeSymbols(body?.symbols)
  if (!symbols.length) return NextResponse.json({ error: 'Add at least one valid symbol.' }, { status: 400 })
  return NextResponse.json({ watchlist: await replaceUserWatchlist(auth.user.id, symbols) })
}

const onboardingValues = {
  experienceLevel: new Set(['beginner', 'self_directed', 'active']),
  watchlistSize: new Set(['1_5', '6_15', '16_30', '31_plus']),
  investingHorizon: new Set(['days', 'weeks', 'months', 'years']),
  primaryJob: new Set(['screen_ideas', 'monitor_watchlist', 'validate_decision', 'manage_risk']),
}

export async function PATCH(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const body = await req.json().catch(() => ({}))
  for (const [key, allowed] of Object.entries(onboardingValues)) {
    if (!allowed.has(String(body?.[key]))) {
      return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 })
    }
  }
  return NextResponse.json(await completeOnboarding(auth.user.id, body as OnboardingInput))
}
