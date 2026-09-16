import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { summarizeAlphaOps } from '@/lib/alphaOps'
import { serviceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })

  const { data: profile } = await supabase.from('profiles').select('beta_role').eq('id', auth.user.id).maybeSingle()
  if (profile?.beta_role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

  const hours = Math.min(168, Math.max(1, Number(req.nextUrl.searchParams.get('hours') || 24)))
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const [{ data: providerRows, error: providerError }, { data: analyses, error: analysisError }] = await Promise.all([
    supabase.from('provider_usage').select('provider,units,cost_usd').gte('created_at', since),
    supabase.from('analysis_requests').select('status').gte('created_at', since),
  ])
  if (providerError || analysisError) {
    return NextResponse.json({ error: 'Operational metrics are unavailable.' }, { status: 503 })
  }
  return NextResponse.json({ since, hours, ...summarizeAlphaOps(providerRows || [], analyses || []) })
}
