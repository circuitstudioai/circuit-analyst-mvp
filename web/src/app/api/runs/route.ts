import { NextResponse } from 'next/server'
import { recentRuns } from '@/lib/supabase'

export async function GET() {
  const runs = await recentRuns(20)
  return NextResponse.json({ runs })
}
