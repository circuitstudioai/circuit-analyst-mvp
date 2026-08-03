import { NextRequest, NextResponse } from 'next/server'

export function verifyJobRequest(req: NextRequest) {
  const secret = process.env.CIRCUIT_JOB_SECRET || process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'job auth is not configured' }, { status: 503 })
  }

  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : ''
  if (token === secret) return null

  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}
