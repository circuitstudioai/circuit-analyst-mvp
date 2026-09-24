export type ConversationRole = 'user' | 'assistant'

export type ConversationMessage = {
  id?: number
  role: ConversationRole
  content: string
  runId?: number | null
  createdAt?: string
}

export function conversationTitle(question: string) {
  const normalized = question.replace(/\s+/g, ' ').trim()
  return normalized.length <= 60 ? normalized : `${normalized.slice(0, 57)}…`
}

export function buildConversationContext(messages: ConversationMessage[], limit = 8) {
  return messages.slice(-limit).map((message) => (
    `${message.role === 'user' ? 'User' : 'Analyst'}: ${message.content}`
  )).join('\n')
}

export function latestConversationRunId(messages: ConversationMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const runId = Number(messages[index].runId)
    if (Number.isInteger(runId) && runId > 0) return runId
  }
  return null
}
