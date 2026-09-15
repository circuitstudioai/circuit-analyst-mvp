import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { researchMessages, researchThreads } from '@/lib/conversationData'

export async function GET(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const threadId = req.nextUrl.searchParams.get('threadId')
  try {
    if (threadId) return NextResponse.json({ messages: await researchMessages(auth.user.id, threadId) })
    return NextResponse.json({ threads: await researchThreads(auth.user.id) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Conversation load failed' }, { status: 500 })
  }
}
