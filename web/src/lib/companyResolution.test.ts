import { describe, expect, it } from 'vitest'
import { companySearchQueries, resolveCompanyQuestion, resolveQuestionCompanies, type CompanyCandidate } from './companyResolution'

const catalog: CompanyCandidate[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'EQUITY' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
  { symbol: 'APLE', name: 'Apple Hospitality REIT, Inc.', exchange: 'NYSE', type: 'EQUITY' },
  { symbol: 'ALPH', name: 'Alpha Corp.', exchange: 'NASDAQ', type: 'EQUITY' },
  { symbol: 'ALPI', name: 'Alpha Inc.', exchange: 'NYSE', type: 'EQUITY' },
]

describe('question-first company resolution', () => {
  it('extracts useful provider queries from natural language', () => {
    expect(companySearchQueries('Compare Berkshire Hathaway and Nvidia after earnings'))
      .toEqual(['Berkshire Hathaway', 'Nvidia'])
    expect(companySearchQueries('Is $TSLA priced for too much growth?')).toEqual(['TSLA'])
    expect(companySearchQueries('is tesla priced for too much growth?')).toEqual(['tesla'])
  })

  it('resolves explicit tickers in the order they appear', () => {
    expect(resolveCompanyQuestion('Compare $AMD with NVDA after earnings', catalog)).toEqual({
      status: 'resolved', symbols: ['AMD', 'NVDA'], companies: [catalog[1], catalog[0]],
    })
  })

  it('resolves familiar company names without a separate ticker field', () => {
    expect(resolveCompanyQuestion('Is Tesla priced for too much growth?', catalog)).toMatchObject({
      status: 'resolved', symbols: ['TSLA'],
    })
    expect(resolveCompanyQuestion('Compare AMD and Nvidia', catalog)).toMatchObject({
      status: 'resolved', symbols: ['AMD', 'NVDA'],
    })
  })

  it('returns choices when a company phrase has multiple plausible matches', () => {
    expect(resolveCompanyQuestion('What are the biggest risks for Alpha?', catalog)).toEqual({
      status: 'ambiguous', phrase: 'Alpha', choices: [catalog[5], catalog[6]],
    })
  })

  it('prefers an exact primary company name over products that contain the same brand', () => {
    expect(resolveCompanyQuestion('What are the biggest risks for Apple?', catalog)).toMatchObject({
      status: 'resolved', symbols: ['AAPL'],
    })
  })

  it('does not treat ordinary uppercase words as ticker symbols', () => {
    expect(resolveCompanyQuestion('Should I BUY this after the CEO update?', catalog)).toEqual({
      status: 'not_found', suggestions: [],
    })
  })

  it('limits comparisons to two companies', () => {
    expect(resolveCompanyQuestion('Compare TSLA, AMD, and NVDA', catalog)).toMatchObject({
      status: 'resolved', symbols: ['TSLA', 'AMD'], truncated: true,
    })
  })

  it('resolves against provider results without leaking provider mechanics to callers', async () => {
    const search = async (query: string) => catalog.filter((item) => (
      item.symbol === query.toUpperCase() || item.name.toLowerCase().includes(query.toLowerCase())
    ))
    await expect(resolveQuestionCompanies('Compare AMD and Nvidia', search)).resolves.toMatchObject({
      status: 'resolved', symbols: ['AMD', 'NVDA'],
    })
  })
})
