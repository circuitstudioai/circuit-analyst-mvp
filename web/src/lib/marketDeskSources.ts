import { contentHash, CycleObservation } from './marketDeskCycle'
import { PriceBar, CorporateAction } from './marketDeskChart'
import { ResearchLens } from './marketDeskTemplates'

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export function parseYahooChart(payload: unknown, retrievedAt: string) {
  const result = (payload as { chart?: { result?: Array<Record<string, unknown>> } })?.chart?.result?.[0]
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp as number[] : []
  const quote = ((result?.indicators as { quote?: Array<Record<string, unknown>> } | undefined)?.quote || [])[0] || {}
  const adjusted = ((result?.indicators as { adjclose?: Array<Record<string, unknown>> } | undefined)?.adjclose || [])[0]?.adjclose
  const opens = Array.isArray(quote.open) ? quote.open as Array<number | null> : []
  const highs = Array.isArray(quote.high) ? quote.high as Array<number | null> : []
  const lows = Array.isArray(quote.low) ? quote.low as Array<number | null> : []
  const closes = Array.isArray(quote.close) ? quote.close as Array<number | null> : []
  const volumes = Array.isArray(quote.volume) ? quote.volume as Array<number | null> : []
  const adjustedCloses = Array.isArray(adjusted) ? adjusted as Array<number | null> : []
  const bars: PriceBar[] = []
  timestamps.forEach((timestamp, index) => {
    const close = closes[index]
    if (typeof close !== 'number') return
    bars.push({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open: typeof opens[index] === 'number' ? opens[index] as number : close,
      high: typeof highs[index] === 'number' ? highs[index] as number : close,
      low: typeof lows[index] === 'number' ? lows[index] as number : close,
      close,
      volume: typeof volumes[index] === 'number' ? volumes[index] as number : 0,
      adjustedClose: typeof adjustedCloses[index] === 'number' ? adjustedCloses[index] as number : close,
    })
  })
  const events = (result?.events || {}) as { splits?: Record<string, { numerator?: number; denominator?: number; date?: number }>; dividends?: Record<string, { amount?: number; date?: number }> }
  const corporateActions: CorporateAction[] = [
    ...Object.entries(events.splits || {}).map(([key, split]) => {
      const ratio = split.numerator && split.denominator ? split.numerator / split.denominator : undefined
      const date = split.date ? new Date(split.date * 1000).toISOString().slice(0, 10) : key.slice(0, 10)
      return { id: `split-${date}`, kind: 'split' as const, exDate: date, ratio, detail: ratio ? `${ratio}:1 split` : 'Split' }
    }),
    ...Object.entries(events.dividends || {}).map(([key, dividend]) => {
      const date = dividend.date ? new Date(dividend.date * 1000).toISOString().slice(0, 10) : key.slice(0, 10)
      return { id: `dividend-${date}`, kind: 'dividend' as const, exDate: date, amount: dividend.amount, detail: dividend.amount ? `Dividend ${dividend.amount}` : 'Dividend' }
    }),
  ]
  const meta = (result?.meta || {}) as { currency?: string; exchangeTimezoneName?: string }
  return {
    bars,
    corporateActions,
    currency: meta.currency || 'USD',
    exchangeTimezone: meta.exchangeTimezoneName || 'America/New_York',
    provider: 'yahoo-chart',
    retrievedAt,
    quality: bars.length ? 'ready' as const : 'failed' as const,
  }
}

export function parseSecFilings(payload: unknown, cik: string, lenses: ResearchLens[], retrievedAt: string): CycleObservation[] {
  const recent = (payload as { filings?: { recent?: Record<string, string[]> } })?.filings?.recent
  if (!recent?.form || !recent.filingDate || !recent.accessionNumber || !recent.primaryDocument) return []
  const rows = recent.form.map((form, index) => ({
    form,
    filingDate: recent.filingDate[index],
    accession: recent.accessionNumber[index],
    document: recent.primaryDocument[index],
  })).filter((row) => row.form && row.filingDate && row.accession && row.document)
  const periodic = rows.find((row) => row.form === '10-Q' || row.form === '10-K')
  const current = rows.find((row) => row.form === '8-K')
  return [periodic, current].flatMap((row, index) => {
    if (!row) return []
    const lens = lenses[Math.min(index, lenses.length - 1)]
    const accession = row.accession.replace(/-/g, '')
    const url = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/${row.document}`
    const fact = `${row.form} filed ${row.filingDate}`
    return [{
      lensId: lens.id,
      sourceType: 'filing' as const,
      sourceName: `SEC ${row.form}`,
      sourceUrl: url,
      passage: fact,
      normalizedFact: fact,
      publishedAt: `${row.filingDate}T00:00:00Z`,
      retrievedAt,
      freshness: 'current' as const,
      confidence: 0.9,
      metric: row.form,
      value: null,
      unit: 'filing',
      direction: 'unknown' as const,
      contentHash: contentHash(`${cik}|${row.accession}|${row.form}`),
    }]
  })
}

export function priceObservation(symbol: string, bars: PriceBar[], lensId: string, retrievedAt: string): CycleObservation | null {
  if (bars.length < 2) return null
  const last = bars[bars.length - 1]
  const prior = bars[Math.max(0, bars.length - 22)]
  if (!prior.adjustedClose || !last.adjustedClose) return null
  const change = last.adjustedClose / prior.adjustedClose - 1
  const direction = Math.abs(change) < 0.03 ? 'flat' : change > 0 ? 'up' : 'down'
  const ageDays = (Date.parse(retrievedAt) - Date.parse(`${last.date}T00:00:00Z`)) / 86_400_000
  const fact = `${symbol} adjusted price changed ${(change * 100).toFixed(1)}% over the recent window ending ${last.date}.`
  return {
    lensId,
    sourceType: 'market_data',
    sourceName: 'Adjusted daily price',
    sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
    passage: fact,
    normalizedFact: fact,
    publishedAt: `${last.date}T00:00:00Z`,
    retrievedAt,
    freshness: ageDays > 8 ? 'stale' : 'current',
    confidence: ageDays > 8 ? 0.45 : 0.8,
    metric: 'adjusted_close_change',
    value: change,
    unit: 'ratio',
    direction,
    contentHash: contentHash(`${symbol}|${last.date}|${change.toFixed(4)}`),
  }
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3) {
  let last: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      last = error
    }
  }
  throw last instanceof Error ? last : new Error('Source request failed')
}

export async function fetchJson(fetchImpl: FetchLike, url: string, headers: HeadersInit = {}) {
  return withRetry(async () => {
    const response = await fetchImpl(url, { headers, cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
    return response.json()
  })
}
