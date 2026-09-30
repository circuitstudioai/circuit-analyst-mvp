import { describe, expect, it } from 'vitest'
import {
  assertMarketDeskFixture,
  buildDecisionRoomResearchHref,
  buildThesisDiff,
  rankInboxEvents,
  resolveDecisionObject,
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
