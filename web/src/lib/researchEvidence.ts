import research from '../../public/research/pead_yahoo_evidence.json'
import { EvidenceBadge } from './types'

type ResearchEvent = {
  date: string
  symbol: string
  decision: string
  conviction: number | null
  confidence: number | null
  reasoning: string
  signed_return_20d?: number | null
  benchmark_adjusted_20d?: number | null
}

type ResearchPayload = {
  generated_at: string
  model: string
  summary: Array<{
    window: string
    n_events: number
    mean_signed_return: number
    hit_rate: number
    mean_benchmark_adjusted: number
  }>
  latest_by_symbol: Record<string, ResearchEvent>
}

const payload = research as ResearchPayload

function pct(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a'
  return `${(value * 100).toFixed(1)}%`
}

function confidencePct(value: number | null) {
  return typeof value === 'number' && !Number.isNaN(value) ? `${(value * 100).toFixed(0)}%` : 'n/a'
}

export function researchSummary() {
  const window20 = payload.summary.find((row) => row.window === '20d')
  if (!window20) return null
  return {
    generatedAt: payload.generated_at,
    events: window20.n_events,
    signedReturn: window20.mean_signed_return,
    benchmarkAdjusted: window20.mean_benchmark_adjusted,
    hitRate: window20.hit_rate,
  }
}

export function evidenceForSymbol(symbol: string): EvidenceBadge[] {
  const event = payload.latest_by_symbol[symbol.toUpperCase()]
  const summary = researchSummary()
  if (!event || !summary) return []

  return [
    {
      label: 'PEAD event study',
      detail: `${summary.events} historical earnings-surprise events; 20D signed ${pct(summary.signedReturn)}, SPY-adjusted ${pct(summary.benchmarkAdjusted)}`,
      strength: 'research',
    },
    {
      label: 'Latest PEAD signal',
      detail: `${event.decision.toUpperCase()} on ${event.date}; confidence ${confidencePct(event.confidence)}; 20D outcome ${pct(event.signed_return_20d || undefined)}`,
      strength: 'research',
    },
  ]
}

export function latestResearchEvent(symbol: string) {
  return payload.latest_by_symbol[symbol.toUpperCase()] || null
}
