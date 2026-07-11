export type Decision = 'BUY' | 'HOLD' | 'SELL'

export type SignalRow = {
  symbol: string
  decision: Decision
  confidence: number
  score: number
  lastPrice: number
  reasons: string[]
  thesis: string
  riskFlags: string[]
  invalidation: string
  nextAction: string
  timeHorizon: string
  dataQuality: 'ok' | 'limited' | 'insufficient'
  abstained: boolean
  source: string
  aiExplanation?: string
}

export type AnalyzeResponse = {
  asOf: string
  regimeScore: number
  watchlist: string[]
  signals: SignalRow[]
}
