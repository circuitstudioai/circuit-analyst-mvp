export type PriceSeries = {
  closes: number[]
  dates: string[]
  provider: string
  status: 'live' | 'fallback'
  detail: string
}

function seeded(symbol: string) {
  let seed = 0
  for (const char of symbol) seed = (seed * 31 + char.charCodeAt(0)) >>> 0
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function fallbackSeries(symbol: string, detail: string): PriceSeries {
  const rand = seeded(symbol)
  const dates: string[] = []
  const closes: number[] = []
  let price = 30 + rand() * 220
  const drift = (rand() - 0.45) * 0.002
  for (let i = 252; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000)
    const shock = (rand() - 0.5) * 0.045
    price = Math.max(2, price * (1 + drift + shock))
    closes.push(Number(price.toFixed(2)))
    dates.push(date.toISOString().slice(0, 10))
  }
  return { closes, dates, provider: 'deterministic-fallback', status: 'fallback', detail }
}

export async function fetchYahooDailySeries(symbol: string): Promise<PriceSeries> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return fallbackSeries(symbol, `Yahoo chart returned HTTP ${res.status}`)
    }

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    const timestamps: number[] = result?.timestamp ?? []
    const closesRaw: Array<number | null> = result?.indicators?.quote?.[0]?.close ?? []
    const closes: number[] = []
    const dates: string[] = []
    closesRaw.forEach((close, i) => {
      if (typeof close === 'number') {
        closes.push(close)
        dates.push(new Date((timestamps[i] || 0) * 1000).toISOString().slice(0, 10))
      }
    })

    if (!closes.length) return fallbackSeries(symbol, 'Yahoo chart returned no daily closes')
    return {
      closes,
      dates,
      provider: 'yahoo-chart',
      status: 'live',
      detail: `${closes.length} daily closes`,
    }
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : 'Yahoo chart fetch failed'
    return fallbackSeries(symbol, detail)
  }
}
