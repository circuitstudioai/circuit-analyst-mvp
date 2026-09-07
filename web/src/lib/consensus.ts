export type Direction = 'bullish' | 'neutral' | 'bearish'

export type EngineOutput = {
  run_id: number
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
  raw_payload?: unknown
  raw_payload_ref?: string
  source_tag?: string
}

export type CategoryView = {
  category: string
  direction: Direction
  agreement_score: number
  confidence_score: number
  engines_total: number
  conflict_flag: boolean
}

export type ConsensusResult = {
  run_id: number
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
  category_consensus: CategoryView[]
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

function categoryViews(row: EngineOutput) {
  if (!row.raw_payload || typeof row.raw_payload !== 'object') return []
  const raw = row.raw_payload as { category_views?: unknown }
  if (!raw.category_views || typeof raw.category_views !== 'object') return []
  const views: Array<{ category: string; direction: Direction; confidence: number }> = []
  for (const [category, value] of Object.entries(raw.category_views as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const view = value as { direction?: unknown; confidence?: unknown }
    if (!['bullish', 'neutral', 'bearish'].includes(String(view.direction))) continue
    const confidence = Number(view.confidence)
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) continue
    views.push({ category, direction: view.direction as Direction, confidence })
  }
  return views
}

function computeCategoryConsensus(rows: EngineOutput[]): CategoryView[] {
  const grouped = new Map<string, Array<{ direction: Direction; confidence: number }>>()
  for (const row of rows) {
    for (const view of categoryViews(row)) {
      const values = grouped.get(view.category) || []
      values.push(view)
      grouped.set(view.category, values)
    }
  }
  return [...grouped.entries()].map(([category, views]) => {
    const buckets = { bullish: 0, neutral: 0, bearish: 0 }
    for (const view of views) buckets[view.direction] += view.confidence / 100
    const max = Math.max(buckets.bullish, buckets.neutral, buckets.bearish)
    const total = buckets.bullish + buckets.neutral + buckets.bearish
    const direction: Direction = max === buckets.bullish ? 'bullish' : max === buckets.bearish ? 'bearish' : 'neutral'
    const agreement = total ? max / total : 0
    return {
      category,
      direction,
      agreement_score: Number(agreement.toFixed(3)),
      confidence_score: Number((views.reduce((sum, view) => sum + view.confidence, 0) / views.length / 100).toFixed(3)),
      engines_total: views.length,
      conflict_flag: views.length > 1 && new Set(views.map((view) => view.direction)).size > 1,
    }
  }).sort((a, b) => a.category.localeCompare(b.category))
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
  const hasCoverage = rows.length >= 2
  const direction: Direction = !hasCoverage ? 'neutral' : maxBucket === bull ? 'bullish' : maxBucket === bear ? 'bearish' : 'neutral'
  const agreement = hasCoverage && total > 0 ? maxBucket / total : 0
  const confScore = weightedDen > 0 ? weightedConf / weightedDen / 100 : 0
  const freshScore = freshnessDen > 0 ? freshnessWeighted / freshnessDen : 0

  // Conflict if strong disagreement among high confidence engines
  const category_consensus = computeCategoryConsensus(rows)
  const conflict = hasCoverage && ((agreement < 0.67 && confScore > 0.62) || category_consensus.some((view) => view.conflict_flag))

  const rationale = !hasCoverage
    ? `Insufficient engine coverage (${rows.length}/2 minimum); consensus abstained.`
    : `${Math.round(agreement * 100)}% engine alignment, confidence ${Math.round(confScore * 100)}%, freshness ${Math.round(freshScore * 100)}%`
  const next_action = !hasCoverage
    ? 'Wait for at least one additional independent engine.'
    : direction === 'bullish'
    ? 'Build bullish watch plan and define invalidation.'
    : direction === 'bearish'
    ? 'Prioritize risk control and downside scenarios.'
    : 'Wait for confirmation; track catalysts and trend shifts.'

  return {
    run_id: rows[0].run_id,
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
    category_consensus,
  }
}
