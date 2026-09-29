import { describe, expect, it } from 'vitest'
import { buildChartModel, explainCorporateMoves } from './marketDeskChart'
import { commitCompanyCycle, MemoryDeskStore, runCompanyCycle } from './marketDeskCycle'
import { annotationRecord, judgmentRecord, monitoringRefusal, persistCycleResult, runPilotSlice } from './marketDeskPilot'
import { parseSecFilings, parseYahooChart, priceObservation, withRetry } from './marketDeskSources'
import { currentPilotGateReport, researchTemplates, watchlistEligibility } from './marketDeskTemplates'

const observation = {
  lensId: 'margins',
  sourceType: 'filing' as const,
  sourceName: 'SEC 10-Q',
  sourceUrl: 'https://www.sec.gov/Archives/example',
  passage: 'Gross margin guidance moved below the prior baseline.',
  normalizedFact: 'Gross margin guidance moved below the prior baseline.',
  publishedAt: '2026-09-19T00:00:00Z',
  retrievedAt: '2026-09-29T00:00:00Z',
  freshness: 'current' as const,
  confidence: 0.9,
  metric: 'gross_margin',
  value: 0.68,
  unit: 'ratio',
  direction: 'down' as const,
  contentHash: 'margin-down',
}

describe('Market Desk live cycle', () => {
  it('publishes one baseline and then one inbox event without duplicating a rerun', () => {
    const store = new MemoryDeskStore()
    const baseline = commitCompanyCycle(store, runCompanyCycle({
      symbol: 'NVDA',
      archetype: 'high_growth_platform',
      observations: [
        { ...observation, lensId: 'demand', direction: 'up', contentHash: 'demand' },
        { ...observation, lensId: 'margins', direction: 'flat', contentHash: 'margins' },
        { ...observation, lensId: 'concentration', direction: 'flat', contentHash: 'concentration' },
      ],
    }))
    expect(baseline.thesisVersion).toBe(1)
    expect(baseline.event?.inbox).toBe(false)
    expect(baseline.markers).toHaveLength(3)
    expect(baseline.markers.every((marker) => marker.evidenceId)).toBe(true)

    const update = commitCompanyCycle(store, runCompanyCycle({
      symbol: 'NVDA',
      archetype: 'high_growth_platform',
      prior: { version: baseline.thesisVersion || 1, claims: baseline.claims.map((claim) => ({ lensId: claim.lensId, state: claim.state, evidenceHashes: claim.evidenceHashes })) },
      observations: [
        { ...observation, lensId: 'demand', direction: 'up', contentHash: 'demand' },
        observation,
        { ...observation, lensId: 'concentration', direction: 'flat', contentHash: 'concentration' },
      ],
    }))
    expect(update.event?.inbox).toBe(true)
    expect(update.thesisStatus).toBe('under_pressure')
    expect(store.events.size).toBe(2)

    const replay = commitCompanyCycle(store, runCompanyCycle({
      symbol: 'NVDA',
      archetype: 'high_growth_platform',
      prior: { version: baseline.thesisVersion || 1, claims: baseline.claims.map((claim) => ({ lensId: claim.lensId, state: claim.state, evidenceHashes: claim.evidenceHashes })) },
      observations: [
        { ...observation, lensId: 'demand', direction: 'up', contentHash: 'demand' },
        observation,
        { ...observation, lensId: 'concentration', direction: 'flat', contentHash: 'concentration' },
      ],
    }))
    expect(replay.duplicate).toBe(true)
    expect(store.events.size).toBe(2)
    expect(store.markers.size).toBe(4)
  })

  it('fails closed when evidence cannot be retrieved and abstains when lenses are missing', () => {
    const failed = runCompanyCycle({ symbol: 'HIMS', archetype: 'emerging_consumer_health', observations: [], sourceFailures: ['SEC unavailable'] })
    expect(failed.status).toBe('failed')
    expect(failed.thesisVersion).toBeNull()
    expect(failed.markers).toEqual([])
    expect(failed.recovery).toMatch(/Retry source collection/)

    const partial = runCompanyCycle({
      symbol: 'HIMS',
      archetype: 'emerging_consumer_health',
      observations: [{ ...observation, lensId: 'growth', direction: 'up', contentHash: 'growth' }],
    })
    expect(partial.status).toBe('partial')
    expect(partial.stance).toBe('insufficient_evidence')
    expect(partial.event?.inbox).toBe(false)
  })
})

describe('research-aware chart', () => {
  it('adjusts split moves out of the thesis and keeps marker lineage', () => {
    const bars = [
      { date: '2026-09-18', open: 100, high: 101, low: 99, close: 100, volume: 10, adjustedClose: 50 },
      { date: '2026-09-19', open: 50, high: 52, low: 49, close: 51, volume: 12, adjustedClose: 51 },
    ]
    expect(explainCorporateMoves(bars, [{ id: 'split-2026-09-19', kind: 'split', exDate: '2026-09-19', ratio: 2, detail: '2:1 split' }])[0]).toMatch(/not a thesis event/)
    const model = buildChartModel({
      symbol: 'NVDA',
      range: '1y',
      mode: 'line',
      bars,
      markers: [{ id: 'marker-1', symbol: 'NVDA', date: '2026-09-19', evidenceId: 'evidence-1', eventId: 'event-1', label: 'Margin guide' }],
      corporateActions: [{ id: 'split-2026-09-19', kind: 'split', exDate: '2026-09-19', ratio: 2, detail: '2:1 split' }],
      retrievedAt: '2026-09-29T00:00:00Z',
      provider: 'yahoo-chart',
    })
    expect(model.adjustment).toBe('provider_adjusted_close')
    expect(model.markers[0].evidenceId).toBe('evidence-1')
    expect(model.explainedMoves).toHaveLength(1)
    expect(model.currency).toBe('USD')
  })

  it('parses provider bars, filings, and retries without dropping a failed source', async () => {
    const parsed = parseYahooChart({
      chart: { result: [{ timestamp: [Date.parse('2026-09-19T00:00:00Z') / 1000], indicators: { quote: [{ open: [100], high: [110], low: [90], close: [105], volume: [20] }], adjclose: [{ adjclose: [105] }] }, meta: { currency: 'USD', exchangeTimezoneName: 'America/New_York' } }] },
    }, '2026-09-29T00:00:00Z')
    expect(parsed.bars).toHaveLength(1)
    const filings = parseSecFilings({
      filings: { recent: { form: ['10-Q', '8-K'], filingDate: ['2026-08-27', '2026-09-01'], accessionNumber: ['0001-26-000001', '0001-26-000002'], primaryDocument: ['a.htm', 'b.htm'] } },
    }, '0001045810', researchTemplates.high_growth_platform.lenses, '2026-09-29T00:00:00Z')
    expect(filings.map((filing) => filing.lensId)).toEqual(['demand', 'margins'])
    expect(priceObservation('NVDA', parsed.bars, 'concentration', '2026-09-29T00:00:00Z')).toBeNull()
    let calls = 0
    await expect(withRetry(async () => {
      calls += 1
      throw new Error('down')
    }, 2)).rejects.toThrow('down')
    expect(calls).toBe(2)
  })
})

describe('later-phase gates', () => {
  it('keeps user watchlists, alerts, and agent-written judgments closed', () => {
    expect(watchlistEligibility(currentPilotGateReport).eligible).toBe(false)
    expect(monitoringRefusal().notification).toBe('not_sent')
    expect(judgmentRecord('user-1', { author: 'agent', action: 'watch', eventId: 'event-1', condition: 'margin' }).error).toMatch(/cannot be written by an agent/)
    expect(annotationRecord('user-1', { symbol: 'NVDA', text: 'Check the margin guide', range: '1y', mode: 'line' }).row?.body).toBe('Check the margin guide')
    expect(annotationRecord('user-1', { symbol: 'AAPL', text: 'Outside the pilot' }).error).toMatch(/pilot company/)
  })

  it('runs the five-company slice once and replays it without a second event', async () => {
    const yahoo = { chart: { result: [{ timestamp: [Date.parse('2026-08-01T00:00:00Z') / 1000, Date.parse('2026-09-19T00:00:00Z') / 1000], indicators: { quote: [{ open: [100, 110], high: [101, 112], low: [99, 108], close: [100, 111], volume: [1, 2] }], adjclose: [{ adjclose: [100, 111] }] }, meta: { currency: 'USD', exchangeTimezoneName: 'America/New_York' } }] } }
    const sec = { filings: { recent: { form: ['10-Q', '8-K'], filingDate: ['2026-08-27', '2026-09-01'], accessionNumber: ['0001-26-000001', '0001-26-000002'], primaryDocument: ['a.htm', 'b.htm'] } } }
    const fetchImpl = async (url: string) => new Response(JSON.stringify(url.includes('sec.gov') ? sec : yahoo), { status: 200 })
    const store = new MemoryDeskStore()
    const first = await runPilotSlice({ fetchImpl, store, now: Date.parse('2026-09-29T00:00:00Z'), clock: () => Date.parse('2026-09-29T00:00:00Z') })
    expect(first.companies).toHaveLength(5)
    expect(first.companies.every((company) => company.status !== 'failed')).toBe(true)
    const events = store.events.size
    const second = await runPilotSlice({ fetchImpl, store, now: Date.parse('2026-09-29T00:00:00Z'), clock: () => Date.parse('2026-09-29T00:00:00Z') })
    expect(second.companies.every((company) => company.duplicate)).toBe(true)
    expect(store.events.size).toBe(events)
    expect(first.eligibility.eligible).toBe(false)
  })

  it('upserts cycle rows through the server client and reports a write failure', async () => {
    const result = runCompanyCycle({
      symbol: 'COST',
      archetype: 'quality_compounder',
      observations: [{ ...observation, lensId: 'retention', direction: 'up', contentHash: 'retention' }],
    })
    const tables: string[] = []
    const errors = await persistCycleResult({
      from(table) {
        tables.push(table)
        return { upsert: async () => ({ error: table === 'market_desk_markers' ? { message: 'marker write failed' } : null }) }
      },
    }, result)
    expect(tables).toContain('market_desk_runs')
    expect(errors).toEqual(result.markers.map(() => 'marker write failed'))
  })
})
