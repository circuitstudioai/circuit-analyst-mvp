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

export const marketDeskLabels = {
  stance: { favorable: 'Favorable', mixed: 'Mixed', unfavorable: 'Unfavorable', insufficient_evidence: 'Insufficient evidence' },
  status: { strengthened: 'Strengthened', unchanged: 'Unchanged', under_pressure: 'Under pressure', invalidated: 'Invalidated' },
  valuation: { attractive: 'Attractive', fair: 'Fair', expectations_stretched: 'Expectations stretched', insufficient_evidence: 'Insufficient evidence' },
  category: { thesis_changed: 'Thesis changed', assumption_pressure: 'Assumption under pressure', new_evidence: 'New evidence · no thesis change', catalyst: 'Upcoming catalyst', disagreement: 'Meaningful disagreement' },
  mandate: { owned: 'Owned', watching: 'Watching', exploring: 'Exploring' },
  claimState: { supported: 'Supported', watch: 'Under watch', challenged: 'Challenged', uncertain: 'Uncertain' },
  decisionObject: { scenario: 'Scenario sensitivity', expectations_results: 'Expectations vs. results', conflict_map: 'Evidence conflict map', timeline: 'Catalyst timeline', peer_comparison: 'Peer comparison' },
} as const
