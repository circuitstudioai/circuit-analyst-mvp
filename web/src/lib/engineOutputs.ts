import { EngineOutput } from './consensus'
import { AnalyzeResponse, Decision } from './types'

const directions = new Set(['bullish', 'neutral', 'bearish'])

function signalDirection(decision: Decision) {
  if (decision === 'BUY') return 'bullish' as const
  if (decision === 'SELL') return 'bearish' as const
  return 'neutral' as const
}

export function ruleEngineOutputsFromAnalysis(payload: AnalyzeResponse, runId: number): EngineOutput[] {
  return payload.signals.map((signal) => ({
    run_id: runId,
    ticker: signal.symbol,
    market: 'US',
    run_timestamp: payload.asOf,
    engine_name: 'circuit_rule_engine',
    direction: signalDirection(signal.decision),
    confidence: Math.round(signal.confidence * 100),
    time_horizon: signal.timeHorizon,
    thesis_summary: signal.thesis,
    bull_case: signal.bullCase,
    bear_case: signal.bearCase,
    risk_flags: signal.riskFlags,
    catalysts: signal.catalysts,
    suggested_next_action: signal.nextAction,
    raw_payload: {
      score: signal.score,
      lastPrice: signal.lastPrice,
      invalidation: signal.invalidation,
      dataQuality: signal.dataQuality,
      abstained: signal.abstained,
      evidence: signal.evidence,
    },
    source_tag: 'api_refresh',
  }))
}

export function validateEngineOutputRows(input: unknown) {
  if (!Array.isArray(input)) return { rows: [], error: 'rows must be an array' }
  if (input.length > 200) return { rows: [], error: 'max 200 rows per ingest' }

  const rows: EngineOutput[] = []
  for (const item of input) {
    const row = item as Partial<EngineOutput>
    const runId = Number(row.run_id)
    const ticker = String(row.ticker || '').trim().toUpperCase()
    const engineName = String(row.engine_name || '').trim()
    const market = String(row.market || 'US').trim().toUpperCase()
    const direction = String(row.direction || '').trim()
    const confidence = Number(row.confidence)
    const runTimestamp = String(row.run_timestamp || '').trim()

    if (!Number.isSafeInteger(runId) || runId <= 0) return { rows: [], error: 'invalid run_id' }
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) return { rows: [], error: 'invalid ticker' }
    if (!/^[a-zA-Z0-9_-]{2,48}$/.test(engineName)) return { rows: [], error: 'invalid engine_name' }
    if (!directions.has(direction)) return { rows: [], error: 'invalid direction' }
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
      return { rows: [], error: 'confidence must be 0..100' }
    }
    if (!runTimestamp || Number.isNaN(new Date(runTimestamp).getTime())) {
      return { rows: [], error: 'invalid run_timestamp' }
    }

    rows.push({
      run_id: runId,
      ticker,
      market,
      run_timestamp: new Date(runTimestamp).toISOString(),
      engine_name: engineName,
      direction: direction as EngineOutput['direction'],
      confidence,
      time_horizon: String(row.time_horizon || 'swing'),
      thesis_summary: row.thesis_summary ? String(row.thesis_summary).slice(0, 800) : undefined,
      bull_case: stringList(row.bull_case),
      bear_case: stringList(row.bear_case),
      risk_flags: stringList(row.risk_flags),
      catalysts: stringList(row.catalysts),
      suggested_next_action: row.suggested_next_action ? String(row.suggested_next_action).slice(0, 400) : undefined,
      raw_payload: row.raw_payload ?? null,
      raw_payload_ref: row.raw_payload_ref ? String(row.raw_payload_ref).slice(0, 500) : undefined,
      source_tag: row.source_tag ? String(row.source_tag).slice(0, 80) : undefined,
    })
  }

  return { rows }
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).slice(0, 500)).slice(0, 12)
}
