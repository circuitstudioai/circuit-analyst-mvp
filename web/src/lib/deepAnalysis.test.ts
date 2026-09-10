import { describe, expect, it } from 'vitest'
import { classifyIntent } from './deepAnalysis'

describe('deep analysis intent classifier', () => {
  it('detects question-specific intents', () => {
    expect(classifyIntent('What are the biggest risks?', 1)).toBe('risk')
    expect(classifyIntent('Is this valuation expensive?', 1)).toBe('valuation')
    expect(classifyIntent('What changed after earnings?', 1)).toBe('earnings')
    expect(classifyIntent('Compare NVDA vs AMD', 2)).toBe('comparison')
  })

  it('uses overview for a general single-company question', () => {
    expect(classifyIntent('How does the evidence look now?', 1)).toBe('overview')
  })
})
