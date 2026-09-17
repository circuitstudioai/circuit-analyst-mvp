import { AnalysisIntent, SignalRow } from './types'

export type ContextualVisual =
  | { kind: 'price'; title: string }
  | { kind: 'risk'; title: string; favorable: number; caution: number; uncertain: number }
  | { kind: 'valuation'; title: string; available: boolean; items: SignalRow['evidence'] }
  | { kind: 'comparison'; title: string }

export function priceChange(signal: SignalRow) {
  const rows = signal.priceHistory || []
  if (rows.length < 2 || !Number.isFinite(rows[0].close) || !Number.isFinite(rows.at(-1)?.close)) return null
  return Number(((rows.at(-1)!.close / rows[0].close - 1) * 100).toFixed(1))
}

export function contextualVisual(intent: AnalysisIntent | undefined, signal: SignalRow): ContextualVisual {
  if (intent === 'risk') {
    return {
      kind: 'risk', title: 'Case and risks', favorable: signal.bullCase.length,
      caution: signal.bearCase.length + signal.riskFlags.length,
      uncertain: signal.dataQuality === 'ok' ? 0 : 1,
    }
  }
  if (intent === 'valuation') {
    const items = signal.evidence.filter((item) => /valu|fundamental|revenue|margin|cash flow|multiple/i.test(`${item.label} ${item.detail}`))
    return { kind: 'valuation', title: 'Valuation evidence', available: items.length > 0, items }
  }
  if (intent === 'comparison') return { kind: 'comparison', title: 'Company comparison' }
  return { kind: 'price', title: intent === 'change' ? 'Price since the prior view' : intent === 'earnings' ? 'Price around recent results' : 'Recent price path' }
}
