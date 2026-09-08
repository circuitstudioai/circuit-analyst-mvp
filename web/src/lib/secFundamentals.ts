import { EvidenceItem, EvidencePacket, packet } from './evidence'

const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json'
const FACTS_URL = (cik: string) => `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`
const CONCEPTS = {
  revenue: ['us-gaap', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'USD'],
  net_income: ['us-gaap', 'NetIncomeLoss', 'USD'],
  assets: ['us-gaap', 'Assets', 'USD'],
  cash: ['us-gaap', 'CashAndCashEquivalentsAtCarryingValue', 'USD'],
  shares_outstanding: ['dei', 'EntityCommonStockSharesOutstanding', 'shares'],
} as const

let tickerCache: { expires: number; rows: Record<string, { cik_str: number; ticker: string }> } | null = null

function headers() {
  return { 'User-Agent': process.env.SEC_USER_AGENT || 'Circuit Market Desk research@circuitstudio.ai', 'Accept-Encoding': 'gzip, deflate' }
}

async function json(url: string) {
  const response = await fetch(url, { headers: headers(), next: { revalidate: 3600 } })
  if (!response.ok) throw new Error(`SEC returned HTTP ${response.status}`)
  return response.json()
}

async function cikForTicker(ticker: string) {
  if (!tickerCache || tickerCache.expires < Date.now()) {
    tickerCache = { rows: await json(TICKERS_URL), expires: Date.now() + 86_400_000 }
  }
  const row = Object.values(tickerCache.rows).find((value) => value.ticker.toUpperCase() === ticker)
  if (!row) throw new Error(`SEC CIK not found for ${ticker}`)
  return String(row.cik_str).padStart(10, '0')
}

export async function fetchSecEvidence(ticker: string, asOf: string): Promise<EvidencePacket> {
  const cik = await cikForTicker(ticker)
  const url = FACTS_URL(cik)
  const payload = await json(url)
  const facts = payload?.facts || {}
  const items: EvidenceItem[] = Object.entries(CONCEPTS).map(([metric, [namespace, concept, unit]]) => {
    const observations = facts?.[namespace]?.[concept]?.units?.[unit] || []
    const candidates = observations.filter((row: Record<string, unknown>) => row.filed && row.val !== null && row.val !== undefined)
    candidates.sort((a: Record<string, unknown>, b: Record<string, unknown>) => `${b.filed}|${b.end}`.localeCompare(`${a.filed}|${a.end}`))
    const row = candidates[0]
    if (!row) return {
      id: `sec-${metric}-missing`, kind: 'fact', metric, value: null, unit, ticker, period: 'latest', confidence: 0,
      freshness_seconds: null, missing_status: 'unavailable', notes: `SEC concept ${concept} unavailable`,
    }
    const publishedAt = `${row.filed}T00:00:00Z`
    return {
      id: `sec-${metric}-${row.accn || row.filed}`, kind: 'fact', metric, value: row.val, unit, ticker,
      period: row.fy ? `FY${row.fy}` : String(row.end || 'latest'), confidence: 0.98,
      freshness_seconds: Math.max(0, Math.floor((new Date(asOf).getTime() - new Date(publishedAt).getTime()) / 1000)),
      missing_status: 'present', source: { provider: 'sec_companyfacts', url, retrieved_at: asOf, published_at: publishedAt, observed_at: row.end ? String(row.end) : null },
      notes: `SEC concept ${namespace}:${concept}; form ${row.form || 'unknown'}`,
    }
  })
  return packet(ticker, asOf, 'sec_fundamentals', items, { cik })
}
