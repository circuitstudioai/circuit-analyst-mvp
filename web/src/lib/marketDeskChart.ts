import { ChartMode, ChartRange } from './marketDesk'
import { CycleMarker } from './marketDeskCycle'

export type PriceBar = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjustedClose: number
}

export type CorporateAction = {
  id: string
  kind: 'split' | 'dividend' | 'symbol_change'
  exDate: string
  ratio?: number
  amount?: number
  detail: string
}

export type ChartQuality = 'ready' | 'partial' | 'stale' | 'missing' | 'failed'

export type ChartModel = {
  symbol: string
  range: ChartRange
  mode: ChartMode
  quality: ChartQuality
  provider: string
  currency: string
  exchangeTimezone: string
  retrievedAt: string
  adjustment: 'provider_adjusted_close' | 'unadjusted' | 'unknown'
  bars: PriceBar[]
  markers: CycleMarker[]
  corporateActions: CorporateAction[]
  explainedMoves: string[]
  summary: { start: number | null; end: number | null; changePercent: number | null }
}

const rangeDays: Record<ChartRange, number> = { '1m': 31, '3m': 93, '1y': 366, '5y': 365 * 5 + 2 }

export function sliceBars(bars: PriceBar[], range: ChartRange, asOf: string) {
  const end = Date.parse(`${asOf.slice(0, 10)}T00:00:00Z`)
  const start = end - rangeDays[range] * 86_400_000
  return bars.filter((bar) => {
    const time = Date.parse(`${bar.date}T00:00:00Z`)
    return time >= start && time <= end
  })
}

export function adjustedBar(bar: PriceBar): PriceBar {
  if (!bar.close || !bar.adjustedClose) return bar
  const factor = bar.adjustedClose / bar.close
  return { ...bar, open: bar.open * factor, high: bar.high * factor, low: bar.low * factor, close: bar.adjustedClose }
}

export function explainCorporateMoves(bars: PriceBar[], actions: CorporateAction[]) {
  const notes: string[] = []
  for (let index = 1; index < bars.length; index += 1) {
    const previous = bars[index - 1]
    const current = bars[index]
    if (!previous.close || !current.close) continue
    const rawMove = current.close / previous.close - 1
    const action = actions.find((item) => item.exDate === current.date && item.kind === 'split' && item.ratio)
    if (!action?.ratio) continue
    const adjustedMove = current.adjustedClose / previous.adjustedClose - 1
    if (Math.abs(rawMove) > 0.2 && Math.abs(adjustedMove) < 0.08) {
      notes.push(`${current.date} raw price move is explained by a ${action.ratio}:1 split. It is not a thesis event.`)
    }
  }
  return notes
}

export function buildChartModel(input: {
  symbol: string
  range: ChartRange
  mode: ChartMode
  bars: PriceBar[]
  markers: CycleMarker[]
  corporateActions?: CorporateAction[]
  provider?: string
  currency?: string
  exchangeTimezone?: string
  retrievedAt: string
  asOf?: string
  quality?: ChartQuality
}): ChartModel {
  const actions = input.corporateActions || []
  const rawSliced = sliceBars(input.bars, input.range, input.asOf || input.retrievedAt)
  const sliced = rawSliced.map(adjustedBar)
  const linkedMarkers = input.markers.filter((marker) => marker.evidenceId && marker.symbol === input.symbol)
  const last = input.bars[input.bars.length - 1]
  const stale = last ? Date.parse(input.retrievedAt) - Date.parse(`${last.date}T00:00:00Z`) > 8 * 86_400_000 : false
  const unadjusted = rawSliced.length > 0 && rawSliced.every((bar) => bar.adjustedClose === bar.close)
  let quality: ChartQuality = input.quality || 'ready'
  if (!input.bars.length) quality = input.quality === 'failed' ? 'failed' : 'missing'
  else if (!rawSliced.length) quality = 'missing'
  else if (stale) quality = 'stale'
  else if (unadjusted) quality = 'partial'
  const start = sliced[0]?.close ?? null
  const end = sliced[sliced.length - 1]?.close ?? null
  return {
    symbol: input.symbol,
    range: input.range,
    mode: input.mode,
    quality,
    provider: input.provider || 'unknown',
    currency: input.currency || 'USD',
    exchangeTimezone: input.exchangeTimezone || 'America/New_York',
    retrievedAt: input.retrievedAt,
    adjustment: rawSliced.some((bar) => bar.adjustedClose !== bar.close) ? 'provider_adjusted_close' : rawSliced.length ? 'unadjusted' : 'unknown',
    bars: sliced,
    markers: linkedMarkers,
    corporateActions: actions.filter((action) => rawSliced.some((bar) => bar.date === action.exDate)),
    explainedMoves: explainCorporateMoves(rawSliced, actions),
    summary: {
      start,
      end,
      changePercent: start && end ? (end / start - 1) * 100 : null,
    },
  }
}
