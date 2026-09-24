import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { researchMessages, researchThreads } from '@/lib/conversationData'
import { latestConversationRunId } from '@/lib/conversation'
import { analysisResultForRun } from '@/lib/analysisJobs'

export async function GET(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const threadId = req.nextUrl.searchParams.get('threadId')
  try {
    if (threadId) {
      const messages = await researchMessages(auth.user.id, threadId)
      const runId = latestConversationRunId(messages)
      const result = runId ? await analysisResultForRun(auth.user.id, runId) : null
      return NextResponse.json({ messages, runId, result })
    }
    return NextResponse.json({ threads: await researchThreads(auth.user.id) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Conversation load failed' }, { status: 500 })
  }
}
