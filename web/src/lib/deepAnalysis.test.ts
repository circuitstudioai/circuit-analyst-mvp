import { describe, expect, it } from 'vitest'
import { calibratedConfidence, classifyIntent, researchGenerationConfig } from './deepAnalysis'

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

  it('bounds grounded research output with a JSON schema and minimal thinking', () => {
    expect(researchGenerationConfig.thinkingConfig).toEqual({ thinkingLevel: 'MINIMAL' })
    expect(researchGenerationConfig.responseJsonSchema).toMatchObject({
      required: ['company_context', 'questions_to_answer', 'facts'],
      properties: {
        questions_to_answer: { maxItems: 6 },
        facts: { minItems: 3, maxItems: 10 },
      },
    })
  })

  it('does not preserve high confidence without explicit uncertainty language', () => {
    expect(calibratedConfidence('high', 'Revenue grew quickly and margins expanded.')).toBe('medium')
    expect(calibratedConfidence('high', 'Evidence suggests growth may continue, but execution risk remains.')).toBe('high')
    expect(calibratedConfidence('low', 'Revenue grew quickly.')).toBe('low')
  })
})
