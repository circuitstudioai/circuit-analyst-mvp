export type CompanyCandidate = {
  symbol: string
  name: string
  exchange: string
  type: string
}

export type CompanyResolution =
  | { status: 'resolved'; symbols: string[]; companies: CompanyCandidate[]; truncated?: boolean }
  | { status: 'ambiguous'; phrase: string; choices: CompanyCandidate[] }
  | { status: 'not_found'; suggestions: CompanyCandidate[] }

export type CompanySearch = (query: string) => Promise<CompanyCandidate[]>

const ignoredUppercaseWords = new Set([
  'A', 'AI', 'CEO', 'CFO', 'ETF', 'EPS', 'I', 'IPO', 'PE', 'BUY', 'HOLD', 'SELL',
  'THE', 'AND', 'OR', 'IS', 'IT', 'WHAT', 'WHY', 'HOW', 'RISK', 'RISKS',
])

const companySuffixes = /\s+(corporation|corp\.?|inc\.?|incorporated|company|co\.?|plc|holdings?|group|limited|ltd\.?)$/i
const primaryUsExchanges = new Set(['NMS', 'NYQ', 'NGM', 'NCM', 'NASDAQ', 'NYSE'])
const queryStopWords = new Set([
  'after', 'and', 'are', 'before', 'biggest', 'compare', 'could', 'does', 'earnings',
  'for', 'growth', 'how', 'is', 'look', 'much', 'now', 'priced', 'risk', 'risks',
  'should', 'the', 'this', 'too', 'versus', 'what', 'why', 'with',
])

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function aliases(candidate: CompanyCandidate) {
  const name = normalized(candidate.name.replace(companySuffixes, ''))
  const firstWord = name.split(' ')[0]
  return [...new Set([name, firstWord].filter((alias) => alias.length >= 3))]
}

function canonicalCompanyName(candidate: CompanyCandidate) {
  return normalized(candidate.name.replace(companySuffixes, ''))
}

export function companySearchQueries(question: string) {
  const queries: Array<{ index: number; value: string }> = []
  for (const match of question.matchAll(/\$\b([A-Za-z][A-Za-z0-9.-]{0,9})\b/g)) {
    queries.push({ index: match.index ?? 0, value: match[1].toUpperCase() })
  }
  for (const match of question.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g)) {
    const words = match[0].split(/\s+/).filter((word) => !queryStopWords.has(word.toLowerCase()))
    if (words.length) queries.push({ index: match.index ?? 0, value: words.join(' ') })
  }
  for (const match of question.matchAll(/\b[A-Z][A-Z0-9.-]{1,9}\b/g)) {
    if (!ignoredUppercaseWords.has(match[0])) queries.push({ index: match.index ?? 0, value: match[0] })
  }
  if (!queries.length) {
    for (const match of question.matchAll(/\b[a-z][a-z0-9.-]{2,}\b/gi)) {
      if (!queryStopWords.has(match[0].toLowerCase())) queries.push({ index: match.index ?? 0, value: match[0] })
    }
  }
  return [...new Map(queries.sort((a, b) => a.index - b.index).map((query) => [query.value.toLowerCase(), query.value])).values()].slice(0, 6)
}

export function resolveCompanyQuestion(question: string, candidates: CompanyCandidate[], maxSymbols = 5): CompanyResolution {
  const upperQuestion = question.toUpperCase()
  const bySymbol = new Map(candidates.map((candidate) => [candidate.symbol.toUpperCase(), candidate]))
  const matches: Array<{ index: number; candidate: CompanyCandidate }> = []

  for (const match of upperQuestion.matchAll(/\$?\b[A-Z][A-Z0-9.-]{0,9}\b/g)) {
    const token = match[0].replace(/^\$/, '')
    if (ignoredUppercaseWords.has(token)) continue
    const candidate = bySymbol.get(token)
    if (candidate) matches.push({ index: match.index ?? 0, candidate })
  }

  const questionText = normalized(question)
  const phraseGroups = new Map<string, Array<{ index: number; candidate: CompanyCandidate }>>()
  for (const candidate of candidates) {
    for (const alias of aliases(candidate)) {
      const index = questionText.search(new RegExp(`(?:^|\\s)${alias.replace(/\s+/g, '\\s+').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s)`))
      if (index < 0) continue
      const group = phraseGroups.get(alias) || []
      group.push({ index, candidate })
      phraseGroups.set(alias, group)
    }
  }

  const orderedPhraseGroups = [...phraseGroups.entries()].sort((a, b) => a[1][0].index - b[1][0].index || b[0].length - a[0].length)
  for (const [phrase, group] of orderedPhraseGroups) {
    const unique = [...new Map(group.map((item) => [item.candidate.symbol, item])).values()]
    const exact = unique.filter((item) => canonicalCompanyName(item.candidate) === phrase)
    const exactPrimary = exact.filter((item) => primaryUsExchanges.has(item.candidate.exchange.toUpperCase()))
    if (exactPrimary.length === 1) {
      matches.push(exactPrimary[0])
      continue
    }
    if (exactPrimary.length > 1) {
      return {
        status: 'ambiguous', phrase: phrase.replace(/\b\w/g, (letter) => letter.toUpperCase()),
        choices: exactPrimary.map((item) => item.candidate).slice(0, 5),
      }
    }
    if (unique.length > 1 && !unique.some((item) => matches.some((match) => match.candidate.symbol === item.candidate.symbol))) {
      return {
        status: 'ambiguous',
        phrase: phrase.replace(/\b\w/g, (letter) => letter.toUpperCase()),
        choices: unique.map((item) => item.candidate).slice(0, 5),
      }
    }
    matches.push(unique[0])
  }

  const ordered = [...new Map(matches.sort((a, b) => a.index - b.index).map((match) => [match.candidate.symbol, match.candidate])).values()]
  if (!ordered.length) return { status: 'not_found', suggestions: [] }
  return {
    status: 'resolved',
    symbols: ordered.slice(0, maxSymbols).map((candidate) => candidate.symbol),
    companies: ordered.slice(0, maxSymbols),
    ...(ordered.length > maxSymbols ? { truncated: true } : {}),
  }
}

export async function searchCompanyCandidates(query: string): Promise<CompanyCandidate[]> {
  const url = new URL('https://query1.finance.yahoo.com/v1/finance/search')
  url.searchParams.set('q', query)
  url.searchParams.set('quotesCount', '8')
  url.searchParams.set('newsCount', '0')
  url.searchParams.set('enableFuzzyQuery', 'false')
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'Circuit-Market-Desk/0.1' },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return []
    const payload = await response.json()
    const queryText = normalized(query)
    return ((payload?.quotes || []) as Array<Record<string, unknown>>)
      .filter((quote) => ['EQUITY', 'ETF'].includes(String(quote.quoteType || '').toUpperCase()))
      .map((quote) => ({
        symbol: String(quote.symbol || '').toUpperCase(),
        name: String(quote.longname || quote.shortname || quote.symbol || ''),
        exchange: String(quote.exchange || 'Market'),
        type: String(quote.quoteType || '').toUpperCase(),
      }))
      .filter((candidate) => candidate.symbol && (
        candidate.symbol.toLowerCase() === queryText
        || normalized(candidate.name).includes(queryText)
      ))
      .slice(0, 8)
  } catch {
    return []
  }
}

export async function resolveQuestionCompanies(question: string, search: CompanySearch = searchCompanyCandidates) {
  const queries = companySearchQueries(question)
  if (!queries.length) return { status: 'not_found', suggestions: [] } as CompanyResolution
  const groups = await Promise.all(queries.map((query) => search(query)))
  const candidates = [...new Map(groups.flat().map((candidate) => [candidate.symbol, candidate])).values()]
  return resolveCompanyQuestion(question, candidates)
}
