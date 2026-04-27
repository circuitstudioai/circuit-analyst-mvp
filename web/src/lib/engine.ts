import { AnalyzeResponse, Decision, SignalRow } from './types'

type PriceMap = Record<string, number[]>

async function fetchCloses(symbol: string): Promise<number[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed data fetch for ${symbol}`)
  const json = await res.json()
  const closes: number[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
  return closes.filter((x: number | null) => typeof x === 'number')
}

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function scoreSeries(closes: number[], regimeBias: number) {
  if (closes.length < 110) {
    return { score: 0, decision: 'HOLD' as const, confidence: 0.4, reasons: ['Insufficient price history'] }
  }

  const last = closes[closes.length - 1]
  const ma20 = mean(closes.slice(-20))
  const ma100 = mean(closes.slice(-100))
  const mom20 = last / closes[closes.length - 21] - 1

  const dailyRets: number[] = []
  for (let i = closes.length - 20; i < closes.length; i++) {
    dailyRets.push(closes[i] / closes[i - 1] - 1)
  }
  const vol20 = Math.sqrt(mean(dailyRets.map((r) => r * r)))

  const trend = ma20 > ma100 ? 0.5 : -0.5
  const momentum = Math.max(Math.min(mom20 * 2.0, 0.5), -0.5)
  const riskPenalty = Math.max(Math.min(vol20 * 2.5, 0.3), 0)

  let score = trend + momentum + regimeBias - riskPenalty
  score = Math.max(Math.min(score, 1), -1)

  const decision: Decision = score >= 0.35 ? 'BUY' : score <= -0.35 ? 'SELL' : 'HOLD'
  const confidence = Math.min(0.95, 0.4 + Math.abs(score))

  const reasons = [
    `MA20 ${ma20 > ma100 ? 'above' : 'below'} MA100`,
    `20D momentum ${(mom20 * 100).toFixed(1)}%`,
    `Volatility penalty ${(riskPenalty * 100).toFixed(1)} bps`,
    `Regime bias ${(regimeBias * 100).toFixed(0)} bps`,
  ]

  return { score, decision, confidence, reasons, last }
}

export async function analyzeWatchlist(watchlist: string[]): Promise<AnalyzeResponse> {
  const symbols = [...new Set(watchlist.map((s) => s.trim().toUpperCase()).filter(Boolean))]
  const bench = ['SPY', 'QQQ']
  const all = [...new Set([...symbols, ...bench])]

  const prices: PriceMap = {}
  await Promise.all(
    all.map(async (s) => {
      prices[s] = await fetchCloses(s)
    })
  )

  const minLen = Math.min(...bench.map((b) => prices[b]?.length ?? 0))
  const regimeSeries = Array.from({ length: minLen }, (_, i) => {
    const spy = prices.SPY?.[prices.SPY.length - minLen + i] ?? 0
    const qqq = prices.QQQ?.[prices.QQQ.length - minLen + i] ?? 0
    return (spy + qqq) / 2
  })

  const regime = scoreSeries(regimeSeries, 0)
  const regimeBias = regime.score > 0 ? 0.1 : -0.1

  const signals: SignalRow[] = symbols.map((symbol) => {
    const s = scoreSeries(prices[symbol] ?? [], regimeBias)
    return {
      symbol,
      decision: s.decision,
      confidence: Number(s.confidence.toFixed(2)),
      score: Number(s.score.toFixed(3)),
      lastPrice: Number((s.last ?? 0).toFixed(2)),
      reasons: s.reasons,
    }
  })

  signals.sort((a, b) => b.confidence - a.confidence)

  return {
    asOf: new Date().toISOString(),
    regimeScore: Number(regime.score.toFixed(3)),
    watchlist: symbols,
    signals,
  }
}
