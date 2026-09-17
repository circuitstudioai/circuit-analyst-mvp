import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from './supabase'
import { alphaAccessDecision } from './alphaAccess'

export type BetaUser = { id: string; email?: string }

export async function requireBetaUser(req: NextRequest): Promise<
  { user: BetaUser; response?: never } | { user?: never; response: NextResponse }
> {
  const authorization = req.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) return { response: NextResponse.json({ error: 'Sign in to run analysis.' }, { status: 401 }) }

  const supabase = serviceClient()
  if (!supabase) return { response: NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 }) }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return { response: NextResponse.json({ error: 'Your session expired. Sign in again.' }, { status: 401 }) }
  }
  const { data: profile } = await supabase.from('profiles').select('beta_role').eq('id', data.user.id).maybeSingle()
  const access = alphaAccessDecision(data.user.email, process.env.ALPHA_ALLOWED_EMAILS, profile?.beta_role)
  if (!access.allowed) {
    return { response: NextResponse.json({
      error: 'This private alpha is invite-only. Contact support if you expected access.',
      code: 'alpha_access_required',
    }, { status: 403 }) }
  }
  return { user: { id: data.user.id, email: data.user.email } }
}
