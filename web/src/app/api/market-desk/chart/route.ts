import { NextRequest, NextResponse } from 'next/server'
import { buildChartModel } from '@/lib/marketDeskChart'
import { MemoryDeskStore } from '@/lib/marketDeskCycle'
import { marketDeskFixture } from '@/lib/marketDeskFixtures'
import { ChartMode, ChartRange } from '@/lib/marketDesk'
import { pilotSymbol } from '@/lib/marketDeskPilot'
import { fetchJson, parseYahooChart } from '@/lib/marketDeskSources'

const ranges = new Set<ChartRange>(['1m', '3m', '1y', '5y'])
const modes = new Set<ChartMode>(['line', 'candle'])

function fixtureMarkers(symbol: string) {
  const company = marketDeskFixture.companies.find((item) => item.symbol === symbol)
  if (!company) return []
  return marketDeskFixture.events.filter((event) => event.companyId === company.id && event.evidenceIds[0]).map((event) => ({
    id: `fixture-${event.id}`,
    symbol,
    date: event.publishedAt.slice(0, 10),
    evidenceId: event.evidenceIds[0],
    eventId: event.id,
    label: event.title,
  }))
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase() || ''
  if (!pilotSymbol(symbol)) return NextResponse.json({ error: 'Chart is available for the five-company pilot only.' }, { status: 404 })
  const requestedRange = req.nextUrl.searchParams.get('range') as ChartRange
  const requestedMode = req.nextUrl.searchParams.get('chart') as ChartMode
  const range = ranges.has(requestedRange) ? requestedRange : '1y'
  const mode = modes.has(requestedMode) ? requestedMode : 'line'
  const retrievedAt = new Date().toISOString()
  const store = (globalThis as { marketDeskStore?: MemoryDeskStore }).marketDeskStore
  const liveMarkers = [...(store?.markers.values() || [])].filter((marker) => marker.symbol === symbol)
  try {
    const payload = await fetchJson(fetch, `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5y&interval=1d&events=div%7Csplit`)
    const parsed = parseYahooChart(payload, retrievedAt)
    return NextResponse.json(buildChartModel({
      symbol,
      range,
      mode,
      bars: parsed.bars,
      markers: [...fixtureMarkers(symbol), ...liveMarkers],
      corporateActions: parsed.corporateActions,
      provider: parsed.provider,
      currency: parsed.currency,
      exchangeTimezone: parsed.exchangeTimezone,
      retrievedAt,
      quality: parsed.quality,
    }))
  } catch (error) {
    return NextResponse.json(buildChartModel({
      symbol,
      range,
      mode,
      bars: [],
      markers: [...fixtureMarkers(symbol), ...liveMarkers],
      provider: 'yahoo-chart',
      retrievedAt,
      quality: 'failed',
      asOf: retrievedAt,
    }), {
      headers: { 'x-market-desk-chart-error': error instanceof Error ? error.message : 'chart fetch failed' },
    })
  }
}
