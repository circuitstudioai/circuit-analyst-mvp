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
  priceHistory?: Array<{ date: string; close: number }>
  aiExplanation?: string
  aiStatus?: 'complete' | 'cached' | 'fallback' | 'skipped'
  aiErrorCode?: string
  deepAnalysis?: DeepAnalysisReport
}

export type AnalysisIntent = 'overview' | 'risk' | 'valuation' | 'earnings' | 'change' | 'comparison'

export type DeepAnalysisSource = {
  title: string
  url: string
  publishedAt?: string | null
}

export type DeepAnalysisReport = {
  symbol: string
  question: string
  intent: AnalysisIntent
  status: 'complete' | 'fallback'
  view: 'favorable' | 'mixed' | 'unfavorable' | 'insufficient_evidence'
  confidence: 'low' | 'medium' | 'high'
  directAnswer: string
  distinctiveNow: string
  strongestEvidence: string[]
  strongestCounterargument: string[]
  changeConditions: string[]
  sources: DeepAnalysisSource[]
  model?: string
  errorCode?: string
}

export type AnalyzeResponse = {
  asOf: string
  regimeScore: number
  watchlist: string[]
  question?: string
  intent?: AnalysisIntent
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

export type DeskConsensus = {
  ticker: string
  direction: 'bullish' | 'neutral' | 'bearish'
  agreement_score: number
  confidence_score: number
  freshness_score: number
  conflict_flag: boolean
  engines_total: number
  rationale: string
  next_action: string
  category_consensus?: Array<{
    category: string
    direction: 'bullish' | 'neutral' | 'bearish'
    agreement_score: number
    confidence_score: number
    engines_total: number
    conflict_flag: boolean
  }>
}

export type DeskEngine = {
  ticker: string
  engine_name: string
  direction: 'bullish' | 'neutral' | 'bearish'
  confidence: number
  thesis_summary?: string
  run_timestamp: string
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
  status: 'complete' | 'partial' | 'skipped' | 'fallback'
  detail: string
}
