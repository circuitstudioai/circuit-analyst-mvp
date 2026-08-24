import { NextResponse } from 'next/server'
import { latestConsensusDiff } from '@/lib/supabase'

export async function GET() {
  const diff = await latestConsensusDiff(25)
  return NextResponse.json({ diff })
}
