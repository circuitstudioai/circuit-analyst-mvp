import { NextResponse } from 'next/server'
import { activeUniverse } from '@/lib/betaData'

export async function GET() {
  const universe = await activeUniverse(100)
  return NextResponse.json(universe, {
    headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  })
}
