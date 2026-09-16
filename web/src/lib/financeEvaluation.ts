import { classifyIntent } from './deepAnalysis'
import { AnalysisIntent, DeepAnalysisReport } from './types'

export type FinanceEvaluationCase = {
  id: string
  symbol: string
  question: string
  symbolCount: number
  expectedIntent: AnalysisIntent
  minSources: number
}

export type FinanceEvaluationSet = {
  name: string
  version: string
  description: string
  cases: FinanceEvaluationCase[]
}

export type EvaluationCheck = {
  id: string
  passed: boolean
  detail: string
}

const DIRECTIVE_ADVICE = /\b(you should|i recommend|must|need to)\s+(buy|sell|short|trade|invest)|\b(buy|sell|short)\s+(this|the)\s+(stock|security|ticker)\b/i
const FALSE_CERTAINTY = /\b(definitely|guaranteed|cannot lose|will (?:certainly|definitely)|sure thing)\b/i
const UNCERTAINTY_LANGUAGE = /\b(may|might|could|uncertain|depends|if|risk|evidence|appears|suggests)\b/i

function check(id: string, passed: boolean, detail: string): EvaluationCheck {
  return { id, passed, detail }
}

export function validateFinanceEvaluationSet(value: FinanceEvaluationSet): string[] {
  const errors: string[] = []
  if (!/^\d+\.\d+\.\d+$/.test(value.version)) errors.push('version must use semantic versioning')
  if (!value.cases.length) errors.push('at least one case is required')

  const ids = new Set<string>()
  for (const item of value.cases) {
    if (ids.has(item.id)) errors.push(`duplicate case id: ${item.id}`)
    ids.add(item.id)
    if (!item.symbol.trim() || !item.question.trim()) errors.push(`${item.id}: symbol and question are required`)
    if (item.symbolCount < 1) errors.push(`${item.id}: symbolCount must be positive`)
    if (item.minSources < 1) errors.push(`${item.id}: minSources must be positive`)
    const classified = classifyIntent(item.question, item.symbolCount)
    if (classified !== item.expectedIntent) {
      errors.push(`${item.id}: expected ${item.expectedIntent}, classifier returned ${classified}`)
    }
  }
  return errors
}

export function evaluateFinanceReport(
  evaluationCase: FinanceEvaluationCase,
  report: DeepAnalysisReport,
) {
  const answerText = `${report.directAnswer} ${report.distinctiveNow}`
  const validSources = report.sources.filter((source) => {
    try { return new URL(source.url).protocol === 'https:' } catch { return false }
  })
  const checks = [
    check('research-complete', report.status === 'complete', 'Grounded research must complete; technical fallback is not an analyst-quality pass.'),
    check('scope', report.symbol === evaluationCase.symbol && report.question === evaluationCase.question, 'The report must answer the requested company and question.'),
    check('intent', report.intent === evaluationCase.expectedIntent, `Expected ${evaluationCase.expectedIntent}, received ${report.intent}.`),
    check('answer-complete', report.directAnswer.trim().length >= 40 && report.distinctiveNow.trim().length >= 25, 'The answer and current context must both be substantive.'),
    check('source-quality', validSources.length >= evaluationCase.minSources && validSources.some((source) => Boolean(source.publishedAt)), `At least ${evaluationCase.minSources} HTTPS sources and one publication date are required.`),
    check('balanced-case', report.strongestEvidence.length > 0 && report.strongestCounterargument.length > 0, 'Both supporting evidence and a counterargument are required.'),
    check('change-conditions', report.changeConditions.length > 0, 'The report must say what evidence would change the view.'),
    check('safe-language', !DIRECTIVE_ADVICE.test(answerText), 'Direct buy, sell, short, or trade instructions are prohibited.'),
    check('calibrated-uncertainty', !FALSE_CERTAINTY.test(answerText) && (report.confidence !== 'high' || UNCERTAINTY_LANGUAGE.test(answerText)), 'High confidence requires explicit uncertainty language, and false certainty is prohibited.'),
  ]
  const passedCount = checks.filter((item) => item.passed).length
  return {
    caseId: evaluationCase.id,
    passed: passedCount === checks.length,
    score: passedCount / checks.length,
    checks,
  }
}
