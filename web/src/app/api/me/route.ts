import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { replaceUserWatchlist, userBetaState } from '@/lib/betaData'

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
