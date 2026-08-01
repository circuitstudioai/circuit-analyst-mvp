export type Decision = 'BUY' | 'HOLD' | 'SELL'

export type SignalRow = {
  symbol: string
  decision: Decision
  confidence: number
  score: number
  lastPrice: number
  reasons: string[]
  thesis: string
  bullCase: string[]
  bearCase: string[]
  riskFlags: string[]
  catalysts: string[]
  invalidation: string
  nextAction: string
  timeHorizon: string
  dataQuality: 'ok' | 'limited' | 'insufficient'
  abstained: boolean
  source: string
  evidence: EvidenceBadge[]
  aiExplanation?: string
}

export type AnalyzeResponse = {
  asOf: string
  regimeScore: number
  watchlist: string[]
  signals: SignalRow[]
  pipeline: PipelineStep[]
  shareId: string
}

export type EvidenceBadge = {
  label: string
  detail: string
  strength: 'rule' | 'research' | 'ai' | 'cache'
}

export type PipelineStep = {
  label: string
  status: 'complete' | 'skipped' | 'fallback'
  detail: string
}
