#!/usr/bin/env node

const SCREENERS = ['most_actives', 'most_watched_tickers']
const USER_AGENT = 'CircuitAnalyst/1.0 universe-research contact=admin@circuitstudio.ai'
const MIN_PRICE = 5
const MIN_MARKET_CAP = 10_000_000_000
const TOP_COUNT = 100

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } })
  if (!response.ok) throw new Error(`${response.status} from ${url}`)
  return response.json()
}

async function screener(id) {
  const url = new URL('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved')
  url.searchParams.set('formatted', 'false')
  url.searchParams.set('scrIds', id)
  url.searchParams.set('count', '250')
  url.searchParams.set('start', '0')
  const payload = await fetchJson(url)
  return payload?.finance?.result?.[0]?.quotes || []
}

async function trending() {
  const payload = await fetchJson('https://query1.finance.yahoo.com/v1/finance/trending/US?count=100')
  return payload?.finance?.result?.[0]?.quotes || []
}

function percentileFromRank(rank, total) {
  if (!rank) return 0
  return Math.max(0, 1 - ((rank - 1) / Math.max(1, total)))
}

function minMax(value, minimum, maximum) {
  if (!Number.isFinite(value) || maximum <= minimum) return 0
  return Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)))
}

function eligible(quote) {
  const symbol = String(quote.symbol || '').toUpperCase()
  const exchange = String(quote.fullExchangeName || '')
  return quote.quoteType === 'EQUITY'
    && /^[A-Z][A-Z.]{0,8}$/.test(symbol)
    && ['NasdaqGS', 'NasdaqGM', 'NYSE', 'NYSEArca', 'NasdaqCM'].includes(exchange)
    && Number(quote.regularMarketPrice) >= MIN_PRICE
    && Number(quote.marketCap) >= MIN_MARKET_CAP
    && Number(quote.averageDailyVolume3Month) > 0
}

function exchangeName(value) {
  if (String(value).startsWith('Nasdaq')) return 'NASDAQ'
  if (value === 'NYSEArca') return 'NYSE ARCA'
  return value || 'UNKNOWN'
}

const [activeRows, watchedRows, trendingRows] = await Promise.all([
  screener(SCREENERS[0]),
  screener(SCREENERS[1]),
  trending(),
])

const activeRank = new Map(activeRows.map((row, index) => [row.symbol, index + 1]))
const watchedRank = new Map(watchedRows.map((row, index) => [row.symbol, index + 1]))
const trendingRank = new Map(trendingRows.map((row, index) => [row.symbol, index + 1]))
const candidates = new Map()

for (const row of [...activeRows, ...watchedRows]) {
  if (eligible(row)) candidates.set(row.symbol, row)
}

const dollarVolumes = [...candidates.values()].map((row) =>
  Number(row.regularMarketPrice) * Number(row.averageDailyVolume3Month))
const logVolumes = dollarVolumes.map((value) => Math.log10(Math.max(1, value)))
const marketCaps = [...candidates.values()].map((row) => Math.log10(Number(row.marketCap)))
const minLogVolume = Math.min(...logVolumes)
const maxLogVolume = Math.max(...logVolumes)
const minLogMarketCap = Math.min(...marketCaps)
const maxLogMarketCap = Math.max(...marketCaps)

const universe = [...candidates.values()].map((row) => {
  const averageDollarVolume = Number(row.regularMarketPrice) * Number(row.averageDailyVolume3Month)
  const liquidityScore = minMax(Math.log10(averageDollarVolume), minLogVolume, maxLogVolume)
  const watchedScore = percentileFromRank(watchedRank.get(row.symbol), watchedRows.length)
  const trendScore = percentileFromRank(trendingRank.get(row.symbol), trendingRows.length)
  const activityAttention = percentileFromRank(activeRank.get(row.symbol), activeRows.length)
  const popularityScore = Math.max(watchedScore, trendScore, activityAttention * 0.7)
  const coverageScore = [row.regularMarketPrice, row.averageDailyVolume3Month, row.marketCap]
    .filter((value) => Number(value) > 0).length / 3
  const sizeScore = minMax(Math.log10(Number(row.marketCap)), minLogMarketCap, maxLogMarketCap)
  const qualityScore = (coverageScore * 0.7) + (sizeScore * 0.3)
  const compositeScore = (liquidityScore * 0.6) + (popularityScore * 0.25) + (qualityScore * 0.15)

  return {
    symbol: row.symbol,
    company_name: row.shortName || row.longName || row.symbol,
    exchange: exchangeName(row.fullExchangeName),
    liquidity_score: Number(liquidityScore.toFixed(4)),
    popularity_score: Number(popularityScore.toFixed(4)),
    composite_score: Number(compositeScore.toFixed(4)),
    average_daily_volume_3m: Math.round(Number(row.averageDailyVolume3Month)),
    average_dollar_volume_3m: Math.round(averageDollarVolume),
    market_cap: Math.round(Number(row.marketCap)),
    source_tags: [
      ...(activeRank.has(row.symbol) ? ['most_active'] : []),
      ...(watchedRank.has(row.symbol) ? ['most_watched'] : []),
      ...(trendingRank.has(row.symbol) ? ['trending'] : []),
    ],
  }
})
  .sort((a, b) => b.composite_score - a.composite_score || a.symbol.localeCompare(b.symbol))
  .slice(0, TOP_COUNT)
  .map((row, index) => ({ ...row, rank: index + 1 }))

if (universe.length !== TOP_COUNT) {
  throw new Error(`Expected ${TOP_COUNT} eligible symbols, found ${universe.length}`)
}

process.stdout.write(`${JSON.stringify({
  methodology_version: 'liquidity-popularity-v1',
  as_of: new Date().toISOString(),
  filters: {
    quote_type: 'EQUITY',
    exchanges: ['NASDAQ', 'NYSE', 'NYSE ARCA'],
    minimum_price: MIN_PRICE,
    minimum_market_cap: MIN_MARKET_CAP,
  },
  weights: { liquidity: 0.6, popularity: 0.25, quality: 0.15 },
  symbols: universe,
}, null, 2)}\n`)
