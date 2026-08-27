export type PriceSeries = {
  closes: number[]
  dates: string[]
  provider: string
  status: 'live' | 'fallback'
  detail: string
}

function unavailableSeries(detail: string): PriceSeries {
  return { closes: [], dates: [], provider: 'yahoo-chart', status: 'fallback', detail }
}

export async function fetchYahooDailySeries(symbol: string): Promise<PriceSeries> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return unavailableSeries(`Yahoo chart returned HTTP ${res.status}; no signal generated`)
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

    if (!closes.length) return unavailableSeries('Yahoo chart returned no daily closes; no signal generated')
    return {
      closes,
      dates,
      provider: 'yahoo-chart',
      status: 'live',
      detail: `${closes.length} daily closes`,
    }
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : 'Yahoo chart fetch failed'
    return unavailableSeries(`${detail}; no signal generated`)
  }
}
