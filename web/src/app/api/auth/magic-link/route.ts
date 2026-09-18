import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { magicLinkRedirect, normalizeSignupEmail } from '@/lib/authMagicLink'
import { serviceClient } from '@/lib/supabase'

const APP_URL = process.env.PUBLIC_APP_URL || 'https://circuit-analyst.vercel.app'

function fingerprint(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: unknown }
  const email = normalizeSignupEmail(body.email)
  if (!email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const admin = serviceClient()
  if (!admin) return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 })
  const { data: claims, error: claimError } = await admin.rpc('claim_auth_email_request', {
    p_email_hash: fingerprint(email),
    p_ip_hash: fingerprint(ip),
  })
  if (claimError) return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 })
  const claim = claims?.[0]
  if (!claim?.allowed) {
    const retryAfter = Math.max(1, Number(claim?.retry_after_seconds) || 60)
    return NextResponse.json({ error: 'Too many sign-in emails requested. Please try again later.' }, {
      status: 429,
      headers: { 'retry-after': String(retryAfter) },
    })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 })
  }
  const auth = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } })
  const { error } = await auth.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: magicLinkRedirect(APP_URL), shouldCreateUser: true },
  })
  if (error) return NextResponse.json({ error: 'Could not send a sign-in email. Please try again.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
