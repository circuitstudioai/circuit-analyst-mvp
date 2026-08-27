import { NextRequest, NextResponse } from 'next/server'

type YahooQuote = {
  symbol?: string
  shortname?: string
  longname?: string
  exchange?: string
  quoteType?: string
}

const ALLOWED_TYPES = new Set(['EQUITY', 'ETF'])

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 60)
  if (query.length < 1) return NextResponse.json({ items: [] })

  try {
    const url = new URL('https://query1.finance.yahoo.com/v1/finance/search')
    url.searchParams.set('q', query)
    url.searchParams.set('quotesCount', '8')
    url.searchParams.set('newsCount', '0')
    url.searchParams.set('enableFuzzyQuery', 'false')

    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'Circuit-Market-Desk/0.1' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(`symbol provider returned ${response.status}`)

    const payload = await response.json()
    const items = ((payload?.quotes || []) as YahooQuote[])
      .filter((quote) => quote.symbol && ALLOWED_TYPES.has(String(quote.quoteType || '').toUpperCase()))
      .map((quote) => ({
        symbol: String(quote.symbol).toUpperCase(),
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchange || 'Market',
        type: String(quote.quoteType || '').toUpperCase(),
      }))
      .slice(0, 8)

    return NextResponse.json({ items, source: 'yahoo-search' }, {
      headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=1800' },
    })
  } catch {
    return NextResponse.json({ items: [], source: 'unavailable' }, { status: 200 })
  }
}
