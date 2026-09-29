export type MandateKind = 'owned' | 'watching' | 'exploring'
export type EvidenceStance = 'favorable' | 'mixed' | 'unfavorable' | 'insufficient_evidence'
export type ThesisStatus = 'strengthened' | 'unchanged' | 'under_pressure' | 'invalidated'
export type ValuationSetup = 'attractive' | 'fair' | 'expectations_stretched' | 'insufficient_evidence'
export type ClaimState = 'supported' | 'watch' | 'challenged' | 'uncertain'
export type EventCategory = 'thesis_changed' | 'assumption_pressure' | 'new_evidence' | 'catalyst' | 'disagreement'
export type ThesisEffect = 'strengthened' | 'challenged' | 'invalidated' | 'no_change'
export type DecisionObject = 'scenario' | 'expectations_results' | 'conflict_map' | 'timeline' | 'peer_comparison'

export type EvidenceItem = {
  id: string
  sourceType: 'filing' | 'earnings' | 'market_data' | 'company_release' | 'regulatory'
  sourceName: string
  sourceUrl: string
  passage: string
  normalizedFact: string
  publishedAt: string
  retrievedAt: string
  freshness: 'current' | 'stale' | 'missing'
  confidence: number
}

export type ThesisClaim = {
  id: string
  title: string
  detail: string
  kind: 'fact' | 'interpretation'
  importance: 'core' | 'supporting'
  state: ClaimState
  confidence: number
  evidenceIds: string[]
}

export type ThesisVersion = {
  id: string
  version: number
  cutoff: string
  stance: EvidenceStance
  status: ThesisStatus
  valuation: ValuationSetup
  confidence: number
  summary: string
  claims: ThesisClaim[]
  published: boolean
}

export type CompanyDeskRecord = {
  id: string
  symbol: string
  name: string
  sector: string
  archetype: string
  mandate: MandateKind
  concern: string
  bullCase: string
  bearCase: string
  pricedIn: string
  catalysts: string[]
  invalidation: string[]
  evidence: EvidenceItem[]
  thesisVersions: ThesisVersion[]
  currentThesis: ThesisVersion
}

export type ResearchEvent = {
  id: string
  companyId: string
  category: EventCategory
  thesisEffect: ThesisEffect
  eventType: 'guidance' | 'results' | 'evidence_conflict' | 'catalyst' | 'filing'
  state: 'ready' | 'stale' | 'partial' | 'failed'
  title: string
  affectedClaimId: string
  before: string
  after: string
  whyItMatters: string
  bullInterpretation: string
  bearInterpretation: string
  resolution: string
  materiality: number
  reliability: number
  publishedAt: string
  evidenceIds: string[]
  availableObjects: DecisionObject[]
  decisionObject: DecisionObject
  read: boolean
}

export type ModelDecision = {
  id: string
  companyId: string
  strategy: string
  version: string
  horizon: string
  classification: 'buy' | 'hold' | 'sell'
  confidence: number
  assumptions: string[]
  invalidation: string
  asOf: string
  freshness: string
  evaluationStatus: string
}

export type MarketDeskFixture = {
  asOf: string
  generatedFrom: 'controlled_fixture'
  processedSilently: number
  companies: CompanyDeskRecord[]
  events: ResearchEvent[]
  modelDecisions: ModelDecision[]
}

export type ThesisDiff = {
  fromVersion: number
  toVersion: number
  stanceChanged: boolean
  statusChanged: boolean
  summary: string
  claimChanges: Array<{ claimId: string; title: string; beforeState: ClaimState; afterState: ClaimState }>
}

function required(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid Market Desk fixture: ${message}`)
}

export function assertMarketDeskFixture(value: unknown): asserts value is MarketDeskFixture {
  required(Boolean(value && typeof value === 'object'), 'root must be an object')
  const fixture = value as MarketDeskFixture
  required(fixture.generatedFrom === 'controlled_fixture', 'fixture boundary must be explicit')
  required(Array.isArray(fixture.companies) && fixture.companies.length === 5, 'exactly five prototype companies are required')
  required(new Set(fixture.companies.map((company) => company.id)).size === fixture.companies.length, 'company IDs must be unique')

  for (const company of fixture.companies) {
    required(Boolean(company.id && company.symbol && company.name && company.archetype), 'company identity is incomplete')
    required(company.thesisVersions.length >= 2, `${company.symbol} needs two thesis versions`)
    required(company.currentThesis.id === company.thesisVersions.at(-1)?.id, `${company.symbol} current thesis pointer is invalid`)
    const evidenceIds = new Set(company.evidence.map((item) => item.id))
    for (const item of company.evidence) {
      required(Boolean(item.sourceUrl && item.passage && item.normalizedFact), `${item.id} is missing source lineage`)
      required(item.confidence >= 0 && item.confidence <= 1, `${item.id} confidence is invalid`)
    }
    for (const version of company.thesisVersions) {
      required(version.published, `${version.id} must be immutable/published`)
      required(version.claims.length >= 3 && version.claims.length <= 7, `${version.id} requires 3–7 claims`)
      for (const claim of version.claims) {
        if (claim.kind === 'fact') required(claim.evidenceIds.length > 0, `${claim.id} factual claim has no evidence`)
        for (const id of claim.evidenceIds) required(evidenceIds.has(id), `${claim.id} references missing evidence ${id}`)
      }
    }
  }

  const companyIds = new Set(fixture.companies.map((company) => company.id))
  for (const event of fixture.events) {
    required(companyIds.has(event.companyId), `${event.id} references a missing company`)
    const company = fixture.companies.find((item) => item.id === event.companyId)!
    required(company.currentThesis.claims.some((claim) => claim.id === event.affectedClaimId), `${event.id} references a missing claim`)
    required(event.decisionObject === resolveDecisionObject(event), `${event.id} decision object violates selection policy`)
    for (const id of event.evidenceIds) required(company.evidence.some((item) => item.id === id), `${event.id} references missing evidence ${id}`)
  }
}

export function buildThesisDiff(before: ThesisVersion, after: ThesisVersion): ThesisDiff {
  const afterById = new Map(after.claims.map((claim) => [claim.id, claim]))
  const claimChanges = before.claims.flatMap((claim) => {
    const next = afterById.get(claim.id)
    if (!next || next.state === claim.state) return []
    return [{ claimId: claim.id, title: claim.title, beforeState: claim.state, afterState: next.state }]
  })
  return {
    fromVersion: before.version,
    toVersion: after.version,
    stanceChanged: before.stance !== after.stance,
    statusChanged: before.status !== after.status,
    summary: after.summary,
    claimChanges,
  }
}

const categoryWeight: Record<EventCategory, number> = {
  thesis_changed: 20,
  assumption_pressure: 16,
  disagreement: 12,
  catalyst: 8,
  new_evidence: 0,
}

export function rankInboxEvents(events: ResearchEvent[]) {
  return [...events].sort((a, b) => {
    const aScore = a.materiality * .7 + a.reliability * .3 + categoryWeight[a.category]
    const bScore = b.materiality * .7 + b.reliability * .3 + categoryWeight[b.category]
    return bScore - aScore || b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id)
  })
}

const preferredObject: Record<ResearchEvent['eventType'], DecisionObject[]> = {
  guidance: ['scenario', 'expectations_results', 'timeline'],
  results: ['expectations_results', 'scenario', 'peer_comparison'],
  evidence_conflict: ['conflict_map'],
  catalyst: ['timeline', 'scenario'],
  filing: ['peer_comparison', 'expectations_results', 'timeline'],
}

export function resolveDecisionObject(input: Pick<ResearchEvent, 'eventType' | 'availableObjects'>): DecisionObject {
  const match = preferredObject[input.eventType].find((object) => input.availableObjects.includes(object))
  if (!match) throw new Error(`No supported decision object for ${input.eventType}`)
  return match
}

export type DeskSurface = 'inbox' | 'thesis' | 'lab'
export type JudgmentAction = 'keep' | 'update' | 'watch'

export type StoredJudgment = {
  action: JudgmentAction
  condition: string
  savedAt: string
}

export type MarketDeskSessionState = {
  mandates: Record<string, MandateKind>
  concerns: Record<string, string>
  judgments: Record<string, StoredJudgment>
  coverageAcknowledged: boolean
}

export type MarketDeskSearchInput = {
  view?: string | string[]
  company?: string | string[]
  event?: string | string[]
  version?: string | string[]
  evidence?: string | string[]
}

export type MarketDeskLocation = {
  view: DeskSurface
  companySymbol: string
  eventId: string | null
  version: number | null
  evidenceId: string | null
}

export const marketDeskSessionKey = 'market-desk-session-v1'

const mandateKinds = new Set<MandateKind>(['owned', 'watching', 'exploring'])
const judgmentActions = new Set<JudgmentAction>(['keep', 'update', 'watch'])

export function emptyMarketDeskSession(): MarketDeskSessionState {
  return { mandates: {}, concerns: {}, judgments: {}, coverageAcknowledged: false }
}

function firstSearchValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.trim() || ''
}

export function parseMarketDeskSession(raw: string | null): MarketDeskSessionState {
  if (!raw) return emptyMarketDeskSession()
  try {
    const value = JSON.parse(raw) as Partial<MarketDeskSessionState>
    const mandates: Record<string, MandateKind> = {}
    if (value.mandates && typeof value.mandates === 'object') {
      for (const [id, kind] of Object.entries(value.mandates)) {
        if (typeof id === 'string' && mandateKinds.has(kind)) mandates[id] = kind
      }
    }
    const concerns: Record<string, string> = {}
    if (value.concerns && typeof value.concerns === 'object') {
      for (const [id, concern] of Object.entries(value.concerns)) {
        if (typeof concern === 'string') concerns[id] = concern.slice(0, 280)
      }
    }
    const judgments: Record<string, StoredJudgment> = {}
    if (value.judgments && typeof value.judgments === 'object') {
      for (const [id, judgment] of Object.entries(value.judgments)) {
        if (!judgment || typeof judgment !== 'object') continue
        const record = judgment as Partial<StoredJudgment>
        if (!record.action || !judgmentActions.has(record.action)) continue
        judgments[id] = {
          action: record.action,
          condition: record.action === 'watch' && typeof record.condition === 'string' ? record.condition.trim().slice(0, 280) : '',
          savedAt: typeof record.savedAt === 'string' ? record.savedAt : '',
        }
      }
    }
    return {
      mandates,
      concerns,
      judgments,
      coverageAcknowledged: value.coverageAcknowledged === true,
    }
  } catch {
    return emptyMarketDeskSession()
  }
}

export function resolveMarketDeskLocation(fixture: MarketDeskFixture, input: MarketDeskSearchInput = {}): MarketDeskLocation {
  const fallback = fixture.companies[0]
  if (!fallback) throw new Error('Market Desk fixture has no companies')
  const event = fixture.events.find((item) => item.id === firstSearchValue(input.event))
  const requestedCompany = fixture.companies.find((item) => item.symbol === firstSearchValue(input.company).toUpperCase())
  const company = (event ? fixture.companies.find((item) => item.id === event.companyId) : requestedCompany) || fallback
  if (event) {
    return { view: 'inbox', companySymbol: company.symbol, eventId: event.id, version: null, evidenceId: null }
  }

  const requestedView = firstSearchValue(input.view)
  const view: DeskSurface = requestedView === 'thesis' || requestedView === 'lab' ? requestedView : 'inbox'
  const requestedVersion = Number(firstSearchValue(input.version))
  const version = view === 'thesis' && company.thesisVersions.some((item) => item.version === requestedVersion) && requestedVersion !== company.currentThesis.version
    ? requestedVersion
    : null
  const requestedEvidence = firstSearchValue(input.evidence)
  const evidenceId = view === 'thesis' && company.evidence.some((item) => item.id === requestedEvidence) ? requestedEvidence : null
  return { view, companySymbol: company.symbol, eventId: null, version, evidenceId }
}

export function marketDeskRequestHref(input: MarketDeskSearchInput) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    const raw = Array.isArray(value) ? value[0] : value
    if (typeof raw === 'string' && raw.length) params.append(key, raw)
  }
  const query = params.toString()
  return query ? `/market-desk?${query}` : '/market-desk'
}

export function buildMarketDeskHref(location: MarketDeskLocation) {
  const params = new URLSearchParams()
  if (location.eventId) {
    params.set('company', location.companySymbol)
    params.set('event', location.eventId)
  } else if (location.view === 'thesis' || location.view === 'lab') {
    params.set('view', location.view)
    params.set('company', location.companySymbol)
    if (location.version) params.set('version', String(location.version))
    if (location.evidenceId) params.set('evidence', location.evidenceId)
  }
  const query = params.toString()
  return query ? `/market-desk?${query}` : '/market-desk'
}

export function buildDecisionRoomResearchHref(company: CompanyDeskRecord, event: ResearchEvent) {
  const claim = company.currentThesis.claims.find((item) => item.id === event.affectedClaimId)
  const question = [
    `Investigate this change for ${company.name} (${company.symbol}): ${event.title}.`,
    `It may affect the thesis claim “${claim?.title || event.affectedClaimId}.”`,
    event.whyItMatters,
    'Verify the new evidence, challenge the current interpretation, and explain what would confirm or reverse the thesis impact.',
  ].join(' ')
  const query = new URLSearchParams({
    tickers: company.symbol,
    source: 'decision-room',
    question,
  })
  return `/desk?${query.toString()}`
}

export const marketDeskLabels = {
  stance: { favorable: 'Favorable', mixed: 'Mixed', unfavorable: 'Unfavorable', insufficient_evidence: 'Insufficient evidence' },
  status: { strengthened: 'Strengthened', unchanged: 'Unchanged', under_pressure: 'Under pressure', invalidated: 'Invalidated' },
  valuation: { attractive: 'Attractive', fair: 'Fair', expectations_stretched: 'Expectations stretched', insufficient_evidence: 'Insufficient evidence' },
  category: { thesis_changed: 'Thesis changed', assumption_pressure: 'Assumption under pressure', new_evidence: 'New evidence · no thesis change', catalyst: 'Upcoming catalyst', disagreement: 'Meaningful disagreement' },
  mandate: { owned: 'Owned', watching: 'Watching', exploring: 'Exploring' },
  claimState: { supported: 'Supported', watch: 'Under watch', challenged: 'Challenged', uncertain: 'Uncertain' },
  decisionObject: { scenario: 'Scenario sensitivity', expectations_results: 'Expectations vs. results', conflict_map: 'Evidence conflict map', timeline: 'Catalyst timeline', peer_comparison: 'Peer comparison' },
} as const
