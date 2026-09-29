import { describe, expect, it } from 'vitest'
import {
  assertMarketDeskFixture,
  buildDecisionRoomResearchHref,
  buildMarketDeskHref,
  buildThesisDiff,
  parseMarketDeskSession,
  rankInboxEvents,
  resolveDecisionObject,
  resolveMarketDeskLocation,
} from './marketDesk'
import { marketDeskFixture } from './marketDeskFixtures'

describe('Market Desk contracts', () => {
  it('validates one shared contract for all five archetypes', () => {
    expect(() => assertMarketDeskFixture(marketDeskFixture)).not.toThrow()
    expect(marketDeskFixture.companies.map((company) => company.symbol)).toEqual([
      'NVDA', 'COST', 'XOM', 'JPM', 'HIMS',
    ])
    expect(new Set(marketDeskFixture.companies.map((company) => company.archetype)).size).toBe(5)
  })

  it('requires evidence lineage for every factual thesis claim', () => {
    for (const company of marketDeskFixture.companies) {
      for (const version of company.thesisVersions) {
        for (const claim of version.claims.filter((item) => item.kind === 'fact')) {
          expect(claim.evidenceIds.length, `${company.symbol}:${claim.id}`).toBeGreaterThan(0)
          for (const evidenceId of claim.evidenceIds) {
            expect(company.evidence.some((item) => item.id === evidenceId)).toBe(true)
          }
        }
      }
    }
  })

  it('builds deterministic immutable thesis diffs', () => {
    const company = marketDeskFixture.companies[0]
    const before = structuredClone(company.thesisVersions[0])
    const after = structuredClone(company.thesisVersions[1])
    const first = buildThesisDiff(before, after)
    const second = buildThesisDiff(before, after)

    expect(first).toEqual(second)
    expect(first.claimChanges.some((change) => change.beforeState !== change.afterState)).toBe(true)
    expect(company.thesisVersions[0]).toEqual(before)
    expect(company.thesisVersions[1]).toEqual(after)
  })

  it('ranks material thesis effects above newer no-change information', () => {
    const ranked = rankInboxEvents(marketDeskFixture.events)
    expect(ranked[0].thesisEffect).not.toBe('no_change')
    expect(ranked.at(-1)?.thesisEffect).toBe('no_change')
    expect(ranked.map((event) => event.id)).toEqual(rankInboxEvents(marketDeskFixture.events).map((event) => event.id))
  })

  it('selects supported decision objects without ticker-specific policy', () => {
    expect(resolveDecisionObject({ eventType: 'guidance', availableObjects: ['scenario', 'timeline'] })).toBe('scenario')
    expect(resolveDecisionObject({ eventType: 'evidence_conflict', availableObjects: ['conflict_map'] })).toBe('conflict_map')
    expect(resolveDecisionObject({ eventType: 'catalyst', availableObjects: ['timeline', 'peer_comparison'] })).toBe('timeline')
  })

  it('hands the active change and thesis claim to the live research desk', () => {
    const event = marketDeskFixture.events[0]
    const company = marketDeskFixture.companies.find((item) => item.id === event.companyId)!
    const claim = company.currentThesis.claims.find((item) => item.id === event.affectedClaimId)!
    const href = buildDecisionRoomResearchHref(company, event)
    const url = new URL(href, 'https://market-desk.test')

    expect(url.pathname).toBe('/desk')
    expect(url.searchParams.get('tickers')).toBe(company.symbol)
    expect(url.searchParams.get('source')).toBe('decision-room')
    expect(url.searchParams.get('question')).toContain(event.title)
    expect(url.searchParams.get('question')).toContain(claim.title)
    expect(url.searchParams.get('question')).toContain(event.whyItMatters)
  })

  it('demonstrates required integrity states', () => {
    const states = new Set(marketDeskFixture.events.map((event) => event.state))
    expect(states).toEqual(expect.objectContaining(new Set(['ready', 'stale', 'partial', 'failed'])))
    expect(marketDeskFixture.events.some((event) => event.thesisEffect === 'no_change')).toBe(true)
    expect(marketDeskFixture.events.some((event) => event.category === 'disagreement')).toBe(true)
    expect(marketDeskFixture.companies.some((company) => company.currentThesis.stance === 'insufficient_evidence')).toBe(true)
  })
})

describe('Market Desk preview state', () => {
  it('restores a tab session without dropping the watch condition', () => {
    const raw = JSON.stringify({
      mandates: { 'company-nvda': 'owned', 'company-cost': 'nope' },
      concerns: { 'company-nvda': 'Margin durability' },
      judgments: {
        'event-nvda-margin': { action: 'watch', condition: ' Only if gross margin stays below 70% ', savedAt: '2026-09-29T00:00:00Z' },
        'event-cost-sales': { action: 'recommend' },
      },
      coverageAcknowledged: true,
    })
    const session = parseMarketDeskSession(raw)

    expect(session.coverageAcknowledged).toBe(true)
    expect(session.mandates).toEqual({ 'company-nvda': 'owned' })
    expect(session.concerns['company-nvda']).toBe('Margin durability')
    expect(session.judgments['event-nvda-margin']).toEqual({
      action: 'watch',
      condition: 'Only if gross margin stays below 70%',
      savedAt: '2026-09-29T00:00:00Z',
    })
    expect(session.judgments['event-cost-sales']).toBeUndefined()
    expect(parseMarketDeskSession('not-json').coverageAcknowledged).toBe(false)
  })

  it('builds a restorable location for a company, prior version, and evidence record', () => {
    const location = resolveMarketDeskLocation(marketDeskFixture, { view: 'thesis', company: 'nvda', version: '1', evidence: 'nvda-e1' })
    expect(location).toEqual({ view: 'thesis', companySymbol: 'NVDA', eventId: null, version: 1, evidenceId: 'nvda-e1' })
    expect(buildMarketDeskHref(location)).toBe('/market-desk?view=thesis&company=NVDA&version=1&evidence=nvda-e1')
    expect(resolveMarketDeskLocation(marketDeskFixture, { view: 'thesis', company: 'NVDA', version: '2' }).version).toBeNull()
  })

  it('opens a change on the company that owns it and ignores unknown records', () => {
    const location = resolveMarketDeskLocation(marketDeskFixture, { company: 'COST', event: 'event-hims-regulation', evidence: 'cost-e1' })
    expect(location).toEqual({ view: 'inbox', companySymbol: 'HIMS', eventId: 'event-hims-regulation', version: null, evidenceId: null })
    expect(buildMarketDeskHref(location)).toBe('/market-desk?company=HIMS&event=event-hims-regulation')
    expect(buildMarketDeskHref(resolveMarketDeskLocation(marketDeskFixture, { company: 'NOPE', view: 'nope' }))).toBe('/market-desk')
  })
})

describe('Market Desk decision-language boundary', () => {
  it('keeps buy, hold, and sell inside named educational model records', () => {
    const serializedEvents = JSON.stringify(marketDeskFixture.events).toLowerCase()
    expect(serializedEvents).not.toMatch(/you should (buy|sell)|buy now|sell now/)

    for (const decision of marketDeskFixture.modelDecisions) {
      expect(decision).toMatchObject({
        strategy: expect.any(String),
        horizon: expect.any(String),
        asOf: expect.any(String),
        invalidation: expect.any(String),
        evaluationStatus: expect.any(String),
      })
      expect(['buy', 'hold', 'sell']).toContain(decision.classification)
    }
  })
})
