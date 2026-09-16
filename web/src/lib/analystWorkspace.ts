import { SignalRow } from './types'

function readableDate(value?: string | null) {
  if (!value) return 'Unavailable'
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return 'Unavailable'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(date)
}

export function evidenceWorkspace(signal: SignalRow) {
  const sources = signal.deepAnalysis?.status === 'complete' ? signal.deepAnalysis.sources : []
  return {
    symbol: signal.symbol,
    confidence: signal.deepAnalysis?.status === 'complete'
      ? signal.deepAnalysis.confidence[0].toUpperCase() + signal.deepAnalysis.confidence.slice(1)
      : signal.confidence >= .75 ? 'High' : signal.confidence >= .5 ? 'Medium' : 'Low',
    freshness: readableDate(signal.dataAsOf),
    researchMode: signal.deepAnalysis?.status === 'complete' ? 'Sourced research' : 'Technical snapshot',
    sourceCount: sources.length,
    sources: sources.map((source) => ({
      title: source.title,
      url: source.url,
      publishedAt: readableDate(source.publishedAt),
    })),
    evidence: signal.evidence,
  }
}
