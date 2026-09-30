import { createHash } from 'node:crypto'
import { ResearchArchetype, researchTemplates } from './marketDeskTemplates'

export const marketDeskCycleSchema = 'market-desk-cycle/1'
const interruptThreshold = 60

export type ObservationDirection = 'up' | 'down' | 'flat' | 'unknown'
export type ClaimState = 'supported' | 'watch' | 'challenged' | 'uncertain'

export type CycleObservation = {
  lensId: string
  sourceType: 'filing' | 'earnings' | 'market_data' | 'company_release' | 'regulatory'
  sourceName: string
  sourceUrl: string
  passage: string
  normalizedFact: string
  publishedAt: string
  retrievedAt: string
  freshness: 'current' | 'stale' | 'missing'
  confidence: number
  metric: string
  value: number | null
  unit: string
  direction: ObservationDirection
  contentHash?: string
}

export type PriorClaim = {
  lensId: string
  state: ClaimState
  evidenceHashes: string[]
}

export type PriorThesis = {
  version: number
  claims: PriorClaim[]
}

export type CycleClaim = {
  id: string
  lensId: string
  title: string
  state: ClaimState
  confidence: number
  evidenceHashes: string[]
  changed: boolean
  effect: 'supports' | 'challenges' | 'adds_uncertainty' | 'no_material_effect'
}

export type CycleMarker = {
  id: string
  symbol: string
  date: string
  evidenceId: string
  eventId: string | null
  label: string
}

export type CompanyCycleResult = {
  schemaVersion: typeof marketDeskCycleSchema
  symbol: string
  archetype: ResearchArchetype
  templateVersion: string
  status: 'completed' | 'partial' | 'failed'
  idempotencyKey: string
  duplicate: boolean
  thesisVersion: number | null
  stance: 'favorable' | 'mixed' | 'unfavorable' | 'insufficient_evidence'
  thesisStatus: 'strengthened' | 'unchanged' | 'under_pressure' | 'invalidated'
  claims: CycleClaim[]
  evidence: CycleObservation[]
  event: {
    id: string
    inbox: boolean
    category: 'thesis_changed' | 'assumption_pressure' | 'new_evidence'
    materiality: number
    title: string
    evidenceIds: string[]
  } | null
  markers: CycleMarker[]
  partialReasons: string[]
  recovery: string | null
}

export type CompanyCycleInput = {
  symbol: string
  archetype: ResearchArchetype
  observations: CycleObservation[]
  prior?: PriorThesis | null
  sourceFailures?: string[]
}

export function contentHash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 24)
}

function observationHash(observation: CycleObservation) {
  return observation.contentHash || contentHash([
    observation.lensId,
    observation.sourceUrl,
    observation.publishedAt,
    observation.normalizedFact,
    observation.value === null ? '' : String(observation.value),
  ].join('|'))
}

function nextState(prior: ClaimState | null, observation: CycleObservation | undefined, missing: boolean): Pick<CycleClaim, 'state' | 'effect' | 'changed'> {
  if (!observation || missing) {
    const state = prior || 'uncertain'
    return { state, effect: 'no_material_effect', changed: false }
  }
  if (observation.freshness === 'stale' || observation.freshness === 'missing' || observation.confidence < 0.5) {
    return { state: 'watch', effect: 'adds_uncertainty', changed: prior !== 'watch' }
  }
  if (observation.direction === 'down') return { state: 'challenged', effect: 'challenges', changed: prior !== 'challenged' }
  if (observation.direction === 'up') return { state: 'supported', effect: 'supports', changed: prior !== 'supported' }
  if (observation.direction === 'flat') return { state: prior || 'supported', effect: 'no_material_effect', changed: false }
  return { state: 'watch', effect: 'adds_uncertainty', changed: prior !== 'watch' }
}

export function runCompanyCycle(input: CompanyCycleInput): CompanyCycleResult {
  const template = researchTemplates[input.archetype]
  const observations = input.observations.map((observation) => ({ ...observation, contentHash: observationHash(observation) }))
  const usable = observations.filter((observation) => observation.freshness !== 'missing' && observation.sourceUrl && observation.passage)
  const priorVersion = input.prior?.version || 0
  const hashes = usable.map((observation) => observation.contentHash).sort()
  const idempotencyKey = contentHash([marketDeskCycleSchema, input.symbol, String(priorVersion), ...hashes].join('|'))
  const partialReasons = [...(input.sourceFailures || [])]
  const missingLenses = template.lenses.filter((lens) => lens.required && !usable.some((observation) => observation.lensId === lens.id))
  if (missingLenses.length) partialReasons.push(`Missing evidence for ${missingLenses.map((lens) => lens.title).join(', ')}`)

  if (!usable.length) {
    return {
      schemaVersion: marketDeskCycleSchema,
      symbol: input.symbol,
      archetype: input.archetype,
      templateVersion: template.version,
      status: 'failed',
      idempotencyKey,
      duplicate: false,
      thesisVersion: input.prior?.version || null,
      stance: 'insufficient_evidence',
      thesisStatus: 'unchanged',
      claims: [],
      evidence: [],
      event: null,
      markers: [],
      partialReasons: partialReasons.length ? partialReasons : ['No usable evidence was retrieved'],
      recovery: 'Retry source collection. Do not publish a high-confidence thesis from this run.',
    }
  }

  const priorHashes = new Set((input.prior?.claims || []).flatMap((claim) => claim.evidenceHashes))
  const claims = template.lenses.map((lens) => {
    const related = usable.filter((observation) => observation.lensId === lens.id)
    const observation = related[related.length - 1]
    const prior = input.prior?.claims.find((claim) => claim.lensId === lens.id)
    const transition = nextState(prior?.state || null, observation, !observation)
    const evidenceHashes = related.map((item) => item.contentHash)
    const evidenceChanged = Boolean(prior && observation)
      && [...evidenceHashes].sort().join('|') !== [...(prior?.evidenceHashes || [])].sort().join('|')
    return {
      id: `${input.symbol.toLowerCase()}-${lens.id}`,
      lensId: lens.id,
      title: lens.title,
      state: transition.state,
      confidence: observation ? observation.confidence : 0,
      evidenceHashes,
      changed: Boolean(input.prior) && (transition.changed || evidenceChanged),
      effect: transition.effect,
    }
  })

  const changed = claims.some((claim) => claim.changed)
  const challenged = claims.filter((claim) => claim.state === 'challenged')
  const thesisVersion = input.prior && !changed ? input.prior.version : priorVersion + 1
  const requiredCount = template.lenses.filter((lens) => lens.required).length
  const unresolved = claims.filter((claim) => claim.state === 'uncertain' || claim.state === 'watch').length
  const stance = missingLenses.length >= Math.ceil(requiredCount / 2)
    ? 'insufficient_evidence'
    : challenged.length || unresolved === claims.length ? 'mixed' : 'favorable'
  const thesisStatus = challenged.length === template.lenses.length
    ? 'invalidated'
    : challenged.length ? 'under_pressure' : changed ? 'strengthened' : 'unchanged'
  const strongestChallenge = challenged.sort((a, b) => b.confidence - a.confidence)[0]
  const materiality = strongestChallenge
    ? Math.round(Math.min(99, 68 + strongestChallenge.confidence * 30))
    : changed ? 42 : 20
  const newObservations = usable.filter((observation) => !priorHashes.has(observation.contentHash))
  const inbox = Boolean(input.prior) && changed && materiality >= interruptThreshold && challenged.length > 0
  const event = newObservations.length || !input.prior ? {
    id: `event-${idempotencyKey}`,
    inbox,
    category: inbox ? (input.prior?.claims.some((claim) => claim.state === 'challenged') ? 'assumption_pressure' as const : 'thesis_changed' as const) : 'new_evidence' as const,
    materiality,
    title: inbox ? `${strongestChallenge?.title || 'A required lens'} needs another look` : input.prior ? 'New evidence did not change the thesis' : 'Baseline thesis published',
    evidenceIds: newObservations.map((observation) => `evidence-${observation.contentHash}`),
  } : null
  const markers = (event ? newObservations : []).map((observation) => ({
    id: `marker-${observation.contentHash}`,
    symbol: input.symbol,
    date: observation.publishedAt.slice(0, 10),
    evidenceId: `evidence-${observation.contentHash}`,
    eventId: event?.id || null,
    label: observation.normalizedFact,
  }))

  return {
    schemaVersion: marketDeskCycleSchema,
    symbol: input.symbol,
    archetype: input.archetype,
    templateVersion: template.version,
    status: partialReasons.length ? 'partial' : 'completed',
    idempotencyKey,
    duplicate: false,
    thesisVersion,
    stance,
    thesisStatus,
    claims,
    evidence: observations,
    event,
    markers,
    partialReasons,
    recovery: partialReasons.length ? 'Review the missing lenses before treating the thesis as complete.' : null,
  }
}

export type StoredCycle = {
  idempotencyKey: string
  result: CompanyCycleResult
}

export class MemoryDeskStore {
  runs = new Map<string, StoredCycle>()
  events = new Map<string, CompanyCycleResult['event']>()
  markers = new Map<string, CycleMarker>()

  commit(result: CompanyCycleResult) {
    const existing = this.runs.get(result.idempotencyKey)
    if (existing) return { ...existing.result, duplicate: true }
    const saved = { ...result, duplicate: false }
    this.runs.set(result.idempotencyKey, { idempotencyKey: result.idempotencyKey, result: saved })
    if (saved.event) this.events.set(saved.event.id, saved.event)
    for (const marker of saved.markers) this.markers.set(marker.id, marker)
    return saved
  }
}

export function commitCompanyCycle(store: MemoryDeskStore, result: CompanyCycleResult) {
  return store.commit(result)
}
