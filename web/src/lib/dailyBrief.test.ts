import { describe, expect, it } from 'vitest'
import { buildMaterialChangeBrief } from './dailyBrief'

describe('material-change daily brief', () => {
  it('surfaces flips and excludes stable rows', () => {
    const consensus = [{ run_id: 7, ticker: 'AMD', market: 'US', direction: 'bullish' as const, agreement_score: 0.67, confidence_score: 0.8, freshness_score: 1, conflict_flag: true, engines_total: 3, engines_bullish: 2, engines_neutral: 0, engines_bearish: 1, rationale: 'disagreement', next_action: 'review', category_consensus: [] }]
    const diffs = [
      { ticker: 'AMD', latest_created_at: '', previous_created_at: '', latest_direction: 'bullish' as const, previous_direction: 'bearish' as const, latest_confidence: 0.8, previous_confidence: 0.7, latest_agreement: 0.67, previous_agreement: 0.67, latest_conflict: true, previous_conflict: false, confidence_delta: 0.1, agreement_delta: 0, change_type: 'flip' as const },
      { ticker: 'MSFT', latest_created_at: '', previous_created_at: '', latest_direction: 'neutral' as const, previous_direction: 'neutral' as const, latest_confidence: 0.5, previous_confidence: 0.5, latest_agreement: 1, previous_agreement: 1, latest_conflict: false, previous_conflict: false, confidence_delta: 0, agreement_delta: 0, change_type: 'stable' as const },
    ]
    const brief = buildMaterialChangeBrief(7, consensus, [], diffs, '2026-09-08T12:00:00Z')
    expect(brief.summary).toContain('1 material change')
    expect(brief.markdown).toContain('AMD: flip')
    expect(brief.markdown).not.toContain('MSFT')
  })
})
