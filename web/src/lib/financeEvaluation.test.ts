import { describe, expect, it } from 'vitest'
import evaluationSet from '../evals/finance-domain.v1.json'
import { evaluateFinanceReport, FinanceEvaluationSet, validateFinanceEvaluationSet } from './financeEvaluation'
import { DeepAnalysisReport } from './types'

const typedEvaluationSet = evaluationSet as FinanceEvaluationSet
const caseFixture = typedEvaluationSet.cases[0]

function report(overrides: Partial<DeepAnalysisReport> = {}): DeepAnalysisReport {
  return {
    symbol: caseFixture.symbol,
    question: caseFixture.question,
    intent: caseFixture.expectedIntent as DeepAnalysisReport['intent'],
    status: 'complete',
    view: 'mixed',
    confidence: 'medium',
    directAnswer: 'Revenue is growing, but the evidence remains mixed because margins may depend on execution.',
    distinctiveNow: 'The latest filing shows improving demand alongside higher investment.',
    strongestEvidence: ['Revenue growth accelerated in the latest reported quarter.'],
    strongestCounterargument: ['Higher spending could delay margin expansion.'],
    changeConditions: ['The view would improve if margins expand without slower growth.'],
    sources: [
      { title: 'Annual report', url: 'https://www.sec.gov/Archives/example', publishedAt: '2026-08-20' },
      { title: 'Investor relations', url: 'https://investor.nvidia.com/example', publishedAt: '2026-08-21' },
    ],
    ...overrides,
  }
}

describe('finance-domain evaluation set', () => {
  it('is versioned and covers every analyst intent', () => {
    expect(validateFinanceEvaluationSet(typedEvaluationSet)).toEqual([])
    expect(new Set(typedEvaluationSet.cases.map((item) => item.expectedIntent))).toEqual(
      new Set(['overview', 'risk', 'valuation', 'earnings', 'change', 'comparison']),
    )
  })

  it('accepts a grounded, balanced, non-directive answer', () => {
    const result = evaluateFinanceReport(caseFixture, report())

    expect(result.passed).toBe(true)
    expect(result.score).toBe(1)
    expect(result.checks.every((check) => check.passed)).toBe(true)
  })

  it('rejects unsupported certainty, weak sourcing, and direct trade instructions', () => {
    const result = evaluateFinanceReport(caseFixture, report({
      confidence: 'high',
      directAnswer: 'You should buy NVDA now. It will definitely outperform.',
      strongestCounterargument: [],
      changeConditions: [],
      sources: [{ title: 'Blog', url: 'http://example.com/post' }],
    }))

    expect(result.passed).toBe(false)
    expect(result.checks.filter((check) => !check.passed).map((check) => check.id)).toEqual(
      expect.arrayContaining(['safe-language', 'source-quality', 'balanced-case', 'change-conditions', 'calibrated-uncertainty']),
    )
  })

  it('fails closed when the report falls back instead of completing research', () => {
    const result = evaluateFinanceReport(caseFixture, report({ status: 'fallback', sources: [] }))

    expect(result.passed).toBe(false)
    expect(result.checks.find((check) => check.id === 'research-complete')?.passed).toBe(false)
  })
})
