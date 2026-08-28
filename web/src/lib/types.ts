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
  dataAsOf: string | null
  marketDataStatus: 'live' | 'fallback'
  abstained: boolean
  source: string
  evidence: EvidenceBadge[]
  aiExplanation?: string
  aiStatus?: 'complete' | 'cached' | 'fallback' | 'skipped'
  aiErrorCode?: string
}

export type AnalyzeResponse = {
  asOf: string
  regimeScore: number
  watchlist: string[]
  signals: SignalRow[]
  pipeline: PipelineStep[]
  shareId: string
  cached?: boolean
  aiSummary?: {
    status: 'complete' | 'partial' | 'fallback' | 'skipped'
    model: string | null
    generated: number
    cached: number
    failed: number
  }
  saved?: {
    ok?: boolean
    skipped?: boolean
    error?: string
    runId?: number
  }
}

export type RecentRun = {
  id: number
  as_of: string
  regime_score: number
  created_at: string
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
