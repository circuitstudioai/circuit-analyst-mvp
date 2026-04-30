export type Direction = 'bullish' | 'neutral' | 'bearish'

export type EngineOutput = {
  ticker: string
  market: string
  run_timestamp: string
  engine_name: string
  direction: Direction
  confidence: number // 0..100
  time_horizon?: string
  thesis_summary?: string
  bull_case?: string[]
  bear_case?: string[]
  risk_flags?: string[]
  catalysts?: string[]
  suggested_next_action?: string
  raw_payload?: any
  raw_payload_ref?: string
  source_tag?: string
}

export type ConsensusResult = {
  ticker: string
  market: string
  direction: Direction
  agreement_score: number
  confidence_score: number
  freshness_score: number
  conflict_flag: boolean
  engines_total: number
  engines_bullish: number
  engines_neutral: number
  engines_bearish: number
  rationale: string
  next_action: string
}

const WEIGHTS: Record<string, number> = {
  tradingagents: 1,
  daily_stock_analysis: 1,
  openbb_context: 0.8,
}

function engineWeight(engine: string) {
  return WEIGHTS[engine] ?? 1
}

function recencyWeight(tsIso: string) {
  const ageHours = Math.max(0, (Date.now() - new Date(tsIso).getTime()) / 36e5)
  // Half-life-ish decay by 24h chunks
  return Math.max(0.3, Math.exp(-ageHours / 24))
}

export function computeConsensus(rows: EngineOutput[]): ConsensusResult | null {
  if (!rows.length) return null

  const ticker = rows[0].ticker
  const market = rows[0].market || 'US'

  let bull = 0
  let neu = 0
  let bear = 0
  let weightedConf = 0
  let weightedDen = 0
  let freshnessWeighted = 0
  let freshnessDen = 0

  for (const r of rows) {
    const w = engineWeight(r.engine_name)
    const rw = recencyWeight(r.run_timestamp)
    const conf = Math.max(0, Math.min(100, r.confidence || 50))

    if (r.direction === 'bullish') bull += w
    else if (r.direction === 'bearish') bear += w
    else neu += w

    weightedConf += conf * w
    weightedDen += w

    freshnessWeighted += rw * w
    freshnessDen += w
  }

  const total = bull + neu + bear
  const maxBucket = Math.max(bull, neu, bear)
  const direction: Direction = maxBucket === bull ? 'bullish' : maxBucket === bear ? 'bearish' : 'neutral'
  const agreement = total > 0 ? maxBucket / total : 0
  const confScore = weightedDen > 0 ? weightedConf / weightedDen / 100 : 0
  const freshScore = freshnessDen > 0 ? freshnessWeighted / freshnessDen : 0

  // Conflict if strong disagreement among high confidence engines
  const conflict = agreement < 0.67 && confScore > 0.62

  const rationale = `${Math.round(agreement * 100)}% engine alignment, confidence ${Math.round(confScore * 100)}%, freshness ${Math.round(freshScore * 100)}%`
  const next_action = direction === 'bullish'
    ? 'Build bullish watch plan and define invalidation.'
    : direction === 'bearish'
    ? 'Prioritize risk control and downside scenarios.'
    : 'Wait for confirmation; track catalysts and trend shifts.'

  return {
    ticker,
    market,
    direction,
    agreement_score: Number(agreement.toFixed(3)),
    confidence_score: Number(confScore.toFixed(3)),
    freshness_score: Number(freshScore.toFixed(3)),
    conflict_flag: conflict,
    engines_total: rows.length,
    engines_bullish: rows.filter((r) => r.direction === 'bullish').length,
    engines_neutral: rows.filter((r) => r.direction === 'neutral').length,
    engines_bearish: rows.filter((r) => r.direction === 'bearish').length,
    rationale,
    next_action,
  }
}
