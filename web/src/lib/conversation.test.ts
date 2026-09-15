import { describe, expect, it } from 'vitest'
import { buildConversationContext, conversationTitle } from './conversation'

describe('analyst conversation context', () => {
  it('builds a bounded transcript that keeps roles explicit', () => {
    const messages = Array.from({ length: 14 }, (_, index) => ({
      role: index % 2 ? 'assistant' as const : 'user' as const,
      content: `message ${index + 1}`,
    }))

    const context = buildConversationContext(messages, 6)
    expect(context).not.toContain('message 8')
    expect(context).toContain('User: message 9')
    expect(context).toContain('Analyst: message 14')
  })

  it('creates a concise title from the opening question', () => {
    expect(conversationTitle('  Why did CRWD weaken after earnings, and is it temporary?  '))
      .toBe('Why did CRWD weaken after earnings, and is it temporary?')
    expect(conversationTitle('A'.repeat(100))).toBe(`${'A'.repeat(57)}…`)
  })
})
