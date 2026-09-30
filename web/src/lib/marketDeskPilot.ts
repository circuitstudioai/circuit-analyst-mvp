import { buildChartModel, CorporateAction, PriceBar } from './marketDeskChart'
import { commitCompanyCycle, CompanyCycleResult, contentHash, CycleObservation, MemoryDeskStore, PriorThesis, runCompanyCycle } from './marketDeskCycle'
import { extractFilingObservations, fetchJson, fetchText, parseSecFilingDocuments, parseSecFilings, parseYahooChart, priceObservation } from './marketDeskSources'
import { currentPilotGateReport, pilotCompanies, researchTemplates, watchlistEligibility } from './marketDeskTemplates'
import { ChartMode, ChartRange } from './marketDesk'
import type { SupabaseClient } from '@supabase/supabase-js'

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

const pilotCompanyList = pilotCompanies

export function pilotSymbol(symbol: string) {
  return pilotCompanyList.find((company) => company.symbol === symbol.toUpperCase()) || null
}

export async function collectCompanyInputs(company: (typeof pilotCompanyList)[number], fetchImpl: FetchLike, retrievedAt: string) {
  const failures: string[] = []
  let bars: PriceBar[] = []
  let corporateActions: CorporateAction[] = []
  let currency = 'USD'
  let exchangeTimezone = 'America/New_York'
  try {
    const payload = await fetchJson(fetchImpl, `https://query1.finance.yahoo.com/v8/finance/chart/${company.symbol}?range=5y&interval=1d&events=div%7Csplit`)
    const parsed = parseYahooChart(payload, retrievedAt)
    bars = parsed.bars
    corporateActions = parsed.corporateActions
    currency = parsed.currency
    exchangeTimezone = parsed.exchangeTimezone
    if (!bars.length) failures.push(`${company.symbol} price history was empty`)
  } catch (error) {
    failures.push(`${company.symbol} price history failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }

  const template = researchTemplates[company.archetype]
  let filings: CycleObservation[] = []
  try {
    const payload = await fetchJson(
      fetchImpl,
      `https://data.sec.gov/submissions/CIK${company.cik}.json`,
      { 'User-Agent': process.env.SEC_USER_AGENT || 'Circuit Market Desk research@circuitstudio.ai' },
    )
    filings = parseSecFilings(payload, company.cik, template.lenses, retrievedAt)
    if (!filings.length) failures.push(`${company.symbol} SEC submissions did not include a 10-Q, 10-K, or 8-K`)
  } catch (error) {
    failures.push(`${company.symbol} SEC submissions failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }

  const priceLens = template.lenses[template.lenses.length - 1]
  const price = priceObservation(company.symbol, bars, priceLens.id, retrievedAt)
  return { bars, corporateActions, currency, exchangeTimezone, observations: [...filings, ...(price ? [price] : [])], failures }
}

export async function collectNvdaInputs(fetchImpl: FetchLike, retrievedAt: string) {
  const company = pilotCompanyList.find((item) => item.symbol === 'NVDA')!
  const failures: string[] = []
  const template = researchTemplates[company.archetype]
  let bars: PriceBar[] = []
  let corporateActions: CorporateAction[] = []
  let currency = 'USD'
  let exchangeTimezone = 'America/New_York'
  try {
    const payload = await fetchJson(fetchImpl, `https://query1.finance.yahoo.com/v8/finance/chart/${company.symbol}?range=5y&interval=1d&events=div%7Csplit`)
    const parsed = parseYahooChart(payload, retrievedAt)
    bars = parsed.bars
    corporateActions = parsed.corporateActions
    currency = parsed.currency
    exchangeTimezone = parsed.exchangeTimezone
  } catch (error) {
    failures.push(`NVDA price history failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }

  let filingObservations: CycleObservation[] = []
  const secHeaders = { 'User-Agent': process.env.SEC_USER_AGENT || 'Circuit Market Desk research@circuitstudio.ai' }
  try {
    const submissions = await fetchJson(fetchImpl, `https://data.sec.gov/submissions/CIK${company.cik}.json`, secHeaders)
    const filings = parseSecFilingDocuments(submissions, company.cik)
    const filing = filings.find((item) => item.form === '10-Q' || item.form === '10-K') || filings[0]
    if (!filing) {
      failures.push('NVDA SEC submissions did not include a primary 10-Q, 10-K, or 8-K document')
    } else {
      const html = await fetchText(fetchImpl, filing.sourceUrl, secHeaders)
      filingObservations = extractFilingObservations({ html, filing, lenses: template.lenses, retrievedAt })
      if (!filingObservations.length) failures.push(`NVDA ${filing.form} did not yield supported research-lens passages`)
    }
  } catch (error) {
    failures.push(`NVDA primary filing failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }

  const priceLens = template.lenses[template.lenses.length - 1]
  const price = priceObservation(company.symbol, bars, priceLens.id, retrievedAt)
  return {
    company,
    bars,
    corporateActions,
    currency,
    exchangeTimezone,
    observations: [...filingObservations, ...(price ? [price] : [])],
    failures,
  }
}

export async function runPilotSlice(input: {
  fetchImpl: FetchLike
  store?: MemoryDeskStore
  now?: number
  budgetMs?: number
  clock?: () => number
  priors?: Record<string, PriorThesis | null>
}) {
  const clock = input.clock || Date.now
  const started = input.now ?? clock()
  const budgetMs = input.budgetMs ?? 20_000
  const store = input.store || new MemoryDeskStore()
  const companies: CompanyCycleResult[] = []
  const skipped: string[] = []
  for (const company of pilotCompanyList) {
    if (clock() - started > budgetMs) {
      skipped.push(company.symbol)
      continue
    }
    const companyStarted = clock()
    const collected = await collectCompanyInputs(company, input.fetchImpl, new Date(started).toISOString())
    const cycle = runCompanyCycle({
      symbol: company.symbol,
      archetype: company.archetype,
      observations: collected.observations,
      prior: input.priors?.[company.symbol] || null,
      sourceFailures: collected.failures,
    })
    const saved = commitCompanyCycle(store, cycle)
    companies.push({ ...saved, partialReasons: [...saved.partialReasons, ...(!saved.duplicate && clock() - companyStarted > budgetMs ? ['Company run exceeded the remaining budget'] : [])] })
  }
  const failed = companies.filter((company) => company.status === 'failed').length
  const partial = companies.filter((company) => company.status === 'partial').length + (skipped.length ? 1 : 0)
  return {
    schemaVersion: 'market-desk-cycle/1',
    status: failed === companies.length && companies.length ? 'failed' : partial || skipped.length || failed ? 'partial' : 'completed',
    latencyMs: clock() - started,
    companies,
    skipped,
    storeCounts: { runs: store.runs.size, events: store.events.size, markers: store.markers.size },
    eligibility: watchlistEligibility(currentPilotGateReport),
  }
}

export function chartForSymbol(input: {
  symbol: string
  range: ChartRange
  mode: ChartMode
  bars: PriceBar[]
  markers: CompanyCycleResult['markers']
  corporateActions?: CorporateAction[]
  retrievedAt: string
  currency?: string
  exchangeTimezone?: string
  provider?: string
  quality?: 'ready' | 'partial' | 'stale' | 'missing' | 'failed'
}) {
  return buildChartModel(input)
}

export function judgmentRecord(userId: string, body: unknown) {
  const value = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  if (value.author === 'agent' || value.generatedBy) return { error: 'A user judgment cannot be written by an agent.' }
  const action = value.action
  if (action !== 'keep' && action !== 'update' && action !== 'watch') return { error: 'Judgment action is invalid.' }
  const eventId = typeof value.eventId === 'string' ? value.eventId : ''
  if (!eventId) return { error: 'Judgment requires an event.' }
  return {
    row: {
      user_id: userId,
      event_id: eventId,
      action,
      condition: action === 'watch' && typeof value.condition === 'string' ? value.condition.trim().slice(0, 280) : '',
      thesis_version: typeof value.thesisVersion === 'number' ? value.thesisVersion : null,
      schema_version: 'market-desk-cycle/1',
    },
  }
}

export function annotationRecord(userId: string, body: unknown) {
  const value = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  if (value.author === 'agent' || value.generatedBy) return { error: 'A chart annotation cannot be written by an agent.' }
  const text = typeof value.text === 'string' ? value.text.trim().slice(0, 280) : ''
  const symbol = typeof value.symbol === 'string' ? value.symbol.toUpperCase() : ''
  if (!text || !pilotSymbol(symbol)) return { error: 'Annotation requires a pilot company and note.' }
  return {
    row: {
      user_id: userId,
      symbol,
      body: text,
      chart_range: value.range === '1m' || value.range === '3m' || value.range === '5y' ? value.range : '1y',
      chart_mode: value.mode === 'candle' ? 'candle' : 'line',
      thesis_version: typeof value.thesisVersion === 'number' ? value.thesisVersion : null,
      event_id: typeof value.eventId === 'string' ? value.eventId : null,
      evidence_id: typeof value.evidenceId === 'string' ? value.evidenceId : null,
    },
  }
}

export function monitoringRefusal() {
  return {
    activated: false,
    notification: 'not_sent' as const,
    eligibility: watchlistEligibility(currentPilotGateReport),
  }
}

type InsertClient = {
  from: (table: string) => {
    upsert: (row: unknown, options?: { onConflict?: string }) => PromiseLike<{ error: { message: string } | null }>
  }
}

type LatestRunQuery = {
  select: (columns: string) => LatestRunQuery
  eq: (column: string, value: string) => LatestRunQuery
  order: (column: string, options: { ascending: boolean }) => LatestRunQuery
  limit: (count: number) => LatestRunQuery
  maybeSingle: () => PromiseLike<{ data: { payload?: CompanyCycleResult } | null; error: { message: string } | null }>
}

type LatestRunClient = { from: (table: string) => LatestRunQuery }

export async function loadLatestCycle(client: LatestRunClient | SupabaseClient, symbol: string): Promise<CompanyCycleResult | null> {
  const queryClient = client as unknown as LatestRunClient
  const { data, error } = await queryClient.from('market_desk_runs')
    .select('payload')
    .eq('symbol', symbol.toUpperCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Market Desk latest-cycle read failed: ${error.message}`)
  const result = data?.payload as CompanyCycleResult | undefined
  return result?.symbol === symbol.toUpperCase() ? result : null
}

export async function loadLatestPrior(client: LatestRunClient | SupabaseClient, symbol: string): Promise<PriorThesis | null> {
  const result = await loadLatestCycle(client, symbol)
  if (!result || typeof result.thesisVersion !== 'number') return null
  return {
    version: result.thesisVersion,
    claims: result.claims.map((claim) => ({ lensId: claim.lensId, state: claim.state, evidenceHashes: claim.evidenceHashes })),
  }
}

export async function runNvdaSlice(input: {
  fetchImpl: FetchLike
  store?: MemoryDeskStore
  client?: LatestRunClient | SupabaseClient | null
  now?: number
}) {
  const retrievedAt = new Date(input.now ?? Date.now()).toISOString()
  const collected = await collectNvdaInputs(input.fetchImpl, retrievedAt)
  const prior = input.client ? await loadLatestPrior(input.client, 'NVDA') : null
  const result = runCompanyCycle({
    symbol: 'NVDA',
    archetype: collected.company.archetype,
    observations: collected.observations,
    sourceFailures: collected.failures,
    prior,
  })
  return commitCompanyCycle(input.store || new MemoryDeskStore(), result)
}

export async function persistCycleResult(client: InsertClient, result: CompanyCycleResult) {
  const writes = await Promise.all([
    client.from('market_desk_runs').upsert({
      idempotency_key: result.idempotencyKey,
      symbol: result.symbol,
      status: result.status,
      schema_version: result.schemaVersion,
      inbox: Boolean(result.event?.inbox),
      payload: result,
    }, { onConflict: 'idempotency_key' }),
    ...result.evidence.map((observation) => client.from('market_desk_evidence').upsert(
      evidenceRow(result.symbol, observation),
      { onConflict: 'id' },
    )),
    ...result.markers.map((marker) => client.from('market_desk_markers').upsert({
      id: marker.id,
      symbol: marker.symbol,
      evidence_id: marker.evidenceId,
      event_id: marker.eventId,
      marker_date: marker.date,
      label: marker.label,
    }, { onConflict: 'id' })),
  ])
  return writes.flatMap((write) => write.error ? [write.error.message] : [])
}

export function evidenceRow(symbol: string, observation: CycleObservation) {
  const hash = observation.contentHash || contentHash(`${symbol}|${observation.sourceUrl}|${observation.normalizedFact}`)
  return {
    id: `evidence-${hash}`,
    symbol,
    content_hash: hash,
    source_url: observation.sourceUrl,
    payload: observation,
  }
}
