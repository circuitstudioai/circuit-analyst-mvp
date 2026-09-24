import { ConversationMessage, conversationTitle } from './conversation'
import { serviceClient } from './supabase'

export async function ensureResearchThread(userId: string, threadId: string | undefined, symbols: string[], question: string) {
  const sb = serviceClient()
  if (!sb) return null
  if (threadId) {
    const { data } = await sb.from('research_threads').select('id')
      .eq('id', threadId).eq('user_id', userId).maybeSingle()
    if (!data) return null
    await sb.from('research_threads').update({ symbols, updated_at: new Date().toISOString() }).eq('id', threadId)
    return String(data.id)
  }
  const { data, error } = await sb.from('research_threads').insert({
    user_id: userId,
    title: conversationTitle(question),
    symbols,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return String(data.id)
}

export async function researchMessages(userId: string, threadId: string, limit = 20): Promise<ConversationMessage[]> {
  const sb = serviceClient()
  if (!sb) return []
  const { data, error } = await sb.from('research_messages')
    .select('id,role,content,run_id,created_at,research_threads!inner(user_id)')
    .eq('thread_id', threadId).eq('research_threads.user_id', userId)
    .order('created_at', { ascending: false }).limit(limit)
  if (error) throw new Error(error.message)
  return (data || []).reverse().map((row) => ({
    id: Number(row.id),
    role: row.role as ConversationMessage['role'],
    content: String(row.content),
    runId: row.run_id ? Number(row.run_id) : null,
    createdAt: String(row.created_at),
  }))
}

export async function appendResearchMessage(userId: string, threadId: string, message: ConversationMessage) {
  const sb = serviceClient()
  if (!sb) return
  const { data: thread } = await sb.from('research_threads').select('id')
    .eq('id', threadId).eq('user_id', userId).maybeSingle()
  if (!thread) throw new Error('Research thread not found')
  const { error } = await sb.from('research_messages').insert({
    thread_id: threadId,
    role: message.role,
    content: message.content,
    run_id: message.runId || null,
  })
  if (error) throw new Error(error.message)
  await sb.from('research_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)
}

export async function researchThreads(userId: string, limit = 20) {
  const sb = serviceClient()
  if (!sb) return []
  const { data, error } = await sb.from('research_threads')
    .select('id,title,symbols,created_at,updated_at')
    .eq('user_id', userId).order('updated_at', { ascending: false }).limit(limit)
  if (error) throw new Error(error.message)
  return data || []
}
