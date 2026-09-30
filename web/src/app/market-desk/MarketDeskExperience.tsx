'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import {
  CompanyDeskRecord,
  EvidenceItem,
  JudgmentAction,
  MandateKind,
  MarketDeskFixture,
  MarketDeskLocation,
  MarketDeskSearchInput,
  MarketDeskSessionState,
  ResearchEvent,
  ThesisVersion,
  buildDecisionRoomResearchHref,
  buildMarketDeskHref,
  buildThesisDiff,
  emptyMarketDeskSession,
  marketDeskLabels,
  marketDeskSessionKey,
  parseMarketDeskSession,
  rankInboxEvents,
  resolveMarketDeskLocation,
} from '@/lib/marketDesk'
import { MarketDeskVnextRollout } from '@/lib/marketDeskRollout'
import { CompanyCycleResult, CycleMarker } from '@/lib/marketDeskCycle'
import { ResearchChart } from './ResearchChart'
import styles from './marketDesk.module.css'

const categoryFilters = [
  { value: 'all', label: 'All changes' },
  { value: 'thesis_changed', label: 'Thesis changed' },
  { value: 'assumption_pressure', label: 'Under pressure' },
  { value: 'disagreement', label: 'Disagreement' },
  { value: 'new_evidence', label: 'No thesis change' },
] as const

const baselineStages = ['Business drivers', 'Current evidence', 'Assumptions', 'Counter-case', 'Claim validation']
const serverSessionSnapshot = '__market_desk_server__'
const sessionListeners = new Set<() => void>()
let sessionSnapshot = ''
let sessionSnapshotReady = false

function subscribeToMarketDeskSession(listener: () => void) {
  sessionListeners.add(listener)
  return () => sessionListeners.delete(listener)
}

function readMarketDeskSession() {
  if (!sessionSnapshotReady) {
    sessionSnapshotReady = true
    sessionSnapshot = window.sessionStorage.getItem(marketDeskSessionKey) || ''
  }
  return sessionSnapshot
}

function writeMarketDeskSession(next: MarketDeskSessionState) {
  sessionSnapshot = JSON.stringify(next)
  sessionSnapshotReady = true
  window.sessionStorage.setItem(marketDeskSessionKey, sessionSnapshot)
  sessionListeners.forEach((listener) => listener())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function StatePill({ value, children }: { value: string; children: React.ReactNode }) {
  return <span className={styles.statePill} data-state={value}>{children}</span>
}

function CompanyRail({ companies, activeId, onSelect }: { companies: CompanyDeskRecord[]; activeId: string; onSelect: (id: string) => void }) {
  return <aside className={styles.companyRail} aria-label="Research mandates">
    <div className={styles.railHeading}><span>Coverage</span><b>{companies.length}</b></div>
    {companies.map((company) => <button key={company.id} className={activeId === company.id ? styles.activeCompany : ''} onClick={() => onSelect(company.id)} aria-pressed={activeId === company.id}>
      <span className={styles.companyMark}>{company.symbol.slice(0, 2)}</span>
      <span><strong>{company.symbol}</strong><small>{marketDeskLabels.mandate[company.mandate]}</small></span>
      <i data-state={company.currentThesis.status} aria-label={marketDeskLabels.status[company.currentThesis.status]} />
    </button>)}
    <div className={styles.prototypeNote}><b>Controlled prototype</b><span>Evidence is fixture-backed. Monitoring is not active.</span></div>
  </aside>
}

function ThesisView({ company, selected, onOpenVersion, onOpenEvidence, children }: { company: CompanyDeskRecord; selected: ThesisVersion; onOpenVersion: (version: number | null) => void; onOpenEvidence: (id: string) => void; children?: React.ReactNode }) {
  const previous = company.thesisVersions.find((version) => version.version === selected.version - 1)
  const diff = previous ? buildThesisDiff(previous, selected) : null
  return <section className={styles.thesisView} aria-labelledby="thesis-title">
    <header className={styles.thesisHeader}>
      <div><p className={styles.eyebrow}>Living thesis · version {selected.version}</p><h1 id="thesis-title">{company.name}</h1><p>{selected.summary}</p></div>
      <div className={styles.freshness}><span>Fresh through</span><strong>{formatDate(selected.cutoff)}</strong><small>{company.archetype}</small></div>
    </header>
    <div className={styles.versionSwitch} role="group" aria-label="Thesis versions">
      {company.thesisVersions.map((version) => <button key={version.id} type="button" aria-pressed={version.id === selected.id} onClick={() => onOpenVersion(version.version === company.currentThesis.version ? null : version.version)}>Version {version.version}{version.version === company.currentThesis.version ? ' · current' : ''}</button>)}
    </div>
    <div className={styles.thesisSignals}>
      <div><span>Evidence stance</span><StatePill value={selected.stance}>{marketDeskLabels.stance[selected.stance]}</StatePill></div>
      <div><span>Thesis status</span><StatePill value={selected.status}>{marketDeskLabels.status[selected.status]}</StatePill></div>
      <div><span>Valuation setup</span><StatePill value={selected.valuation}>{marketDeskLabels.valuation[selected.valuation]}</StatePill></div>
      <div><span>Confidence</span><strong>{percent(selected.confidence)}</strong></div>
    </div>
    {diff && previous ? <div className={styles.diffBanner}><span>v{previous.version} → v{selected.version}</span><strong>{diff.claimChanges.length ? `${diff.claimChanges.length} claim ${diff.claimChanges.length === 1 ? 'changed' : 'changes'}` : 'No claim-state change'}</strong><p>{diff.summary}</p></div> : <div className={styles.diffBanner}><span>Version {selected.version}</span><strong>Baseline</strong><p>This is the first published thesis version. Later versions compare against it.</p></div>}
    <div className={styles.claimGrid}>
      {selected.claims.map((claim, index) => <article key={claim.id}>
        <div className={styles.claimNumber}>0{index + 1}</div><div><span>{claim.importance} claim</span><h2>{claim.title}</h2><p>{claim.detail}</p>{claim.evidenceIds[0] ? <button type="button" onClick={() => onOpenEvidence(claim.evidenceIds[0])}>{claim.evidenceIds.length} linked {claim.evidenceIds.length === 1 ? 'source' : 'sources'} <span aria-hidden>↗</span></button> : <span>No linked source</span>}</div><StatePill value={claim.state}>{marketDeskLabels.claimState[claim.state]}</StatePill>
      </article>)}
    </div>
    <div className={styles.caseGrid}>
      <article><span>The strongest case for</span><p>{company.bullCase}</p></article>
      <article><span>The strongest case against</span><p>{company.bearCase}</p></article>
      <article><span>What appears priced in</span><p>{company.pricedIn}</p></article>
    </div>
    <section className={styles.invalidation}><div><span>What breaks the case</span><h2>Invalidation conditions</h2></div><ol>{company.invalidation.map((item) => <li key={item}>{item}</li>)}</ol></section>
    {children}
    {company.concern ? <p className={styles.concernNote}><b>Your concern.</b> {company.concern}</p> : null}
  </section>
}

function DecisionObjectView({ event }: { event: ResearchEvent }) {
  const content = {
    scenario: [['Pressure case', 'The changed input persists for two quarters'], ['Base case', 'The issue improves as the transition resolves'], ['Resolution case', event.resolution]],
    expectations_results: [['Expected', event.before], ['Observed', event.after], ['Next proof', event.resolution]],
    conflict_map: [['Operating lens', event.bullInterpretation], ['Risk lens', event.bearInterpretation], ['Missing proof', event.resolution]],
    timeline: [['Now', event.after], ['Next checkpoint', event.resolution], ['Thesis threshold', event.whyItMatters]],
    peer_comparison: [['Company evidence', event.after], ['Prior baseline', event.before], ['Comparison needed', event.resolution]],
  }[event.decisionObject]
  return <section className={styles.decisionObject}>
    <div className={styles.objectTitle}><span>Decision object</span><strong>{marketDeskLabels.decisionObject[event.decisionObject]}</strong></div>
    <div>{content.map(([label, body], index) => <article key={label}><b>0{index + 1}</b><span>{label}</span><p>{body}</p></article>)}</div>
  </section>
}

function DecisionRoom({ event, company, judgment, onJudge, onClear, onBack, children }: { event: ResearchEvent; company: CompanyDeskRecord; judgment?: MarketDeskSessionState['judgments'][string]; onJudge: (action: JudgmentAction, condition?: string) => void; onClear: () => void; onBack: () => void; children?: React.ReactNode }) {
  const [condition, setCondition] = useState(judgment?.condition || '')
  const evidence = event.evidenceIds.map((id) => company.evidence.find((item) => item.id === id)).filter((item): item is EvidenceItem => Boolean(item))
  return <section className={styles.room} aria-labelledby="room-title">
    <button className={styles.backButton} type="button" onClick={onBack}>← Change inbox</button>
    <header className={styles.roomHeader}>
      <div><p className={styles.eyebrow}>{company.symbol} · Decision room</p><h1 id="room-title">{event.title}</h1><p>{event.whyItMatters}</p></div>
      <div className={styles.materiality}><span>Materiality</span><strong>{event.materiality}</strong><small>/100</small></div>
    </header>
    <div className={styles.changeStrip}><div><span>Before</span><p>{event.before}</p></div><b aria-hidden>→</b><div><span>New evidence</span><p>{event.after}</p></div></div>
    <div className={styles.interpretations}>
      <article><span>Strongest bull interpretation</span><p>{event.bullInterpretation}</p></article>
      <article><span>Strongest bear interpretation</span><p>{event.bearInterpretation}</p></article>
    </div>
    <DecisionObjectView event={event} />
    {children}
    <section className={styles.evidenceTrail}><div className={styles.sectionIntro}><span>Evidence trail</span><h2>From source to thesis effect</h2></div>{evidence.map((item) => <article key={item.id}><div><span>{item.sourceName}</span><StatePill value={item.freshness}>{item.freshness}</StatePill></div><blockquote>{item.passage}</blockquote><p><b>Normalized fact</b>{item.normalizedFact}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">Inspect source ↗</a></article>)}</section>
    <section className={styles.judgmentBox}>
      <div><span>Your checkpoint</span><h2>The desk informs. You decide.</h2><p>Your judgment is stored separately from the system thesis.</p></div>
      {judgment ? <div className={styles.savedJudgment}><b>Saved</b><span>{judgment.action === 'keep' ? 'Keep my view' : judgment.action === 'update' ? 'Update my view' : 'Watch this assumption'}</span>{judgment.condition ? <small className={styles.savedCondition}>{judgment.condition}</small> : null}<button type="button" onClick={onClear}>Change response</button></div> : <div className={styles.judgmentActions}>
        <button type="button" onClick={() => onJudge('keep')}>Keep my view</button><button type="button" onClick={() => onJudge('update')}>Update my view</button>
        <div><input aria-label="Watch condition" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Notify me only if…"/><button type="button" disabled={!condition.trim()} onClick={() => onJudge('watch', condition)}>Watch this assumption</button></div>
      </div>}
      <small>Saved in this browser tab until you close it. Monitoring is not active, and this is not stored on your account.</small>
    </section>
    <Link className={styles.askDesk} href={buildDecisionRoomResearchHref(company, event)}>Research this change <small>Open with the event and affected claim prefilled</small><span>↗</span></Link>
  </section>
}

function DecisionLab({ fixture, activeCompany }: { fixture: MarketDeskFixture; activeCompany: CompanyDeskRecord }) {
  const decisions = fixture.modelDecisions.filter((item) => item.companyId === activeCompany.id)
  return <section className={styles.lab}>
    <header><div><p className={styles.eyebrow}>Educational model outputs</p><h1>Decision Lab</h1><p>Inspectable classifications from named strategies—not instructions to trade.</p></div><span>Secondary surface</span></header>
    {decisions.length ? decisions.map((decision) => <article key={decision.id}>
      <div className={styles.labVerdict}><span>{activeCompany.symbol}</span><strong data-decision={decision.classification}>{decision.classification}</strong><small>{percent(decision.confidence)} model confidence</small></div>
      <div><span>Strategy</span><h2>{decision.strategy} <small>v{decision.version}</small></h2><p>{decision.horizon} horizon · as of {formatDate(decision.asOf)}</p></div>
      <dl><div><dt>Assumptions</dt><dd>{decision.assumptions.join(' · ')}</dd></div><div><dt>Invalidation</dt><dd>{decision.invalidation}</dd></div><div><dt>Evidence freshness</dt><dd>{decision.freshness}</dd></div><div><dt>Evaluation</dt><dd>{decision.evaluationStatus}</dd></div></dl>
    </article>) : <div className={styles.emptyState}><span>Model abstention</span><h2>No promoted classification for {activeCompany.symbol}</h2><p>The desk does not force a Buy/Hold/Sell label when a named model has not produced a complete, inspectable record.</p></div>}
    <p className={styles.labDisclosure}>For education and research. These model artifacts are not personalized investment recommendations.</p>
  </section>
}

function CoverageSetup({ companies, onMandate, onConcern, onContinue }: { companies: CompanyDeskRecord[]; onMandate: (id: string, mandate: MandateKind) => void; onConcern: (id: string, concern: string) => void; onContinue: () => void }) {
  return <section className={styles.coverage} aria-labelledby="coverage-title">
    <header className={styles.inboxHeader}><div><p className={styles.eyebrow}>Preview coverage</p><h1 id="coverage-title">Which companies should this desk cover?</h1><p>These five companies are preloaded. Their baselines are already ready from controlled fixtures. This is not a live research run, and monitoring is not active.</p></div></header>
    <div className={styles.coverageStages}>{baselineStages.map((stage) => <article key={stage}><span>Ready</span><strong>{stage}</strong></article>)}</div>
    <div className={styles.coverageList}>{companies.map((company) => <article key={company.id}>
      <div><strong>{company.symbol}</strong><small>{company.name}</small></div>
      <label>Mandate<select aria-label={`${company.symbol} mandate`} value={company.mandate} onChange={(event) => onMandate(company.id, event.target.value as MandateKind)}><option value="owned">Owned</option><option value="watching">Watching</option><option value="exploring">Exploring</option></select></label>
      <label>Concern<input aria-label={`${company.symbol} concern`} value={company.concern} onChange={(event) => onConcern(company.id, event.target.value)} /></label>
    </article>)}</div>
    <button className={styles.coverageContinue} type="button" onClick={onContinue}>Review the changes</button>
  </section>
}

function EvidenceDrawer({ item, onClose }: { item: EvidenceItem; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [item.id, onClose])
  return <div className={styles.drawerBackdrop} onClick={onClose}>
    <aside ref={dialogRef} className={styles.evidenceDrawer} role="dialog" aria-modal="true" aria-labelledby="evidence-title" onClick={(event) => event.stopPropagation()}>
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close evidence">×</button>
      <div><p className={styles.eyebrow}>Evidence record</p><h2 id="evidence-title">{item.sourceName}</h2><StatePill value={item.freshness}>{item.freshness}</StatePill><blockquote>{item.passage}</blockquote><span>Normalized fact</span><p>{item.normalizedFact}</p><dl><div><dt>Published</dt><dd>{formatDate(item.publishedAt)}</dd></div><div><dt>Retrieved</dt><dd>{formatDate(item.retrievedAt)}</dd></div><div><dt>Confidence</dt><dd>{percent(item.confidence)}</dd></div></dl><a href={item.sourceUrl} target="_blank" rel="noreferrer">Open original source ↗</a></div>
    </aside>
  </div>
}

export function MarketDeskExperience({ fixture, rollout, search, liveNvda }: { fixture: MarketDeskFixture; rollout: MarketDeskVnextRollout; search: MarketDeskSearchInput; liveNvda: CompanyCycleResult | null }) {
  const router = useRouter()
  const location = useMemo(() => resolveMarketDeskLocation(fixture, search), [fixture, search])
  const sessionRaw = useSyncExternalStore(subscribeToMarketDeskSession, readMarketDeskSession, () => serverSessionSnapshot)
  const session = useMemo(() => sessionRaw === serverSessionSnapshot ? null : parseMarketDeskSession(sessionRaw || null), [sessionRaw])
  const [filter, setFilter] = useState<(typeof categoryFilters)[number]['value']>('all')

  const companies = useMemo(() => fixture.companies.map((company) => ({
    ...company,
    mandate: session?.mandates[company.id] || company.mandate,
    concern: session?.concerns[company.id] ?? company.concern,
  })), [fixture.companies, session])
  const activeCompany = companies.find((company) => company.symbol === location.companySymbol) || companies[0]
  const activeEvent = fixture.events.find((event) => event.id === location.eventId)
  const selectedThesis = activeCompany.thesisVersions.find((version) => version.version === location.version) || activeCompany.currentThesis
  const visibleEvents = rankInboxEvents(fixture.events).filter((event) => filter === 'all' || event.category === filter)
  const thesisChanges = fixture.events.filter((event) => event.thesisEffect !== 'no_change').length
  const evidenceItem = activeCompany.evidence.find((item) => item.id === location.evidenceId)

  const go = useCallback((next: MarketDeskLocation) => {
    router.push(buildMarketDeskHref(next), { scroll: false })
  }, [router])
  const visit = useCallback((next: Partial<MarketDeskLocation>) => {
    go({ ...location, ...next })
  }, [go, location])
  const closeEvidence = useCallback(() => {
    router.replace(buildMarketDeskHref({ ...location, evidenceId: null }), { scroll: false })
  }, [location, router])

  function updateSession(recipe: (current: MarketDeskSessionState) => MarketDeskSessionState) {
    writeMarketDeskSession(recipe(session || emptyMarketDeskSession()))
  }

  const chartMarkers: CycleMarker[] = fixture.events.filter((event) => event.companyId === activeCompany.id && event.evidenceIds[0]).map((event) => ({
    id: `fixture-${event.id}`,
    symbol: activeCompany.symbol,
    date: event.publishedAt.slice(0, 10),
    evidenceId: event.evidenceIds[0],
    eventId: event.id,
    label: event.title,
  }))
  const chart = <ResearchChart
    symbol={activeCompany.symbol}
    range={location.range}
    mode={location.chart}
    markers={chartMarkers}
    annotations={session?.annotations || []}
    onRange={(range) => visit({ range })}
    onMode={(chartMode) => visit({ chart: chartMode })}
    onMarker={(eventId) => {
      const event = fixture.events.find((item) => item.id === eventId)
      const company = companies.find((item) => item.id === event?.companyId)
      if (!event || !company) return
      visit({ view: 'inbox', companySymbol: company.symbol, eventId: event.id, version: null, evidenceId: null })
    }}
    onAnnotate={(text) => updateSession((current) => ({ ...current, annotations: [...current.annotations, { id: `note-${Date.now()}`, symbol: activeCompany.symbol, text, range: location.range, mode: location.chart, createdAt: new Date().toISOString(), thesisVersion: selectedThesis.version, eventId: activeEvent?.id || null, evidenceId: location.evidenceId }].slice(-40) }))}
  />

  return <main className={styles.shell}>
    <div className={styles.prototypeBar}><span>{rollout === 'preview' ? 'Private preview' : 'Market Desk vNext'}</span><p>Five-company preview · fixture evidence · monitoring is not active</p><Link href="/desk">Open live research ↗</Link></div>
    <div className={styles.workspace}>
      <CompanyRail companies={companies} activeId={activeCompany.id} onSelect={(id) => {
        const company = companies.find((item) => item.id === id)
        if (company) visit({ view: 'thesis', companySymbol: company.symbol, eventId: null, version: null, evidenceId: null })
      }} />
      <div className={styles.mainColumn}>
        {activeCompany.symbol === 'NVDA' && liveNvda ? <section className={styles.liveCycle} aria-label="Latest persisted NVDA research cycle">
          <div><span>Live NVDA evidence cycle</span><strong>Thesis v{liveNvda.thesisVersion ?? '—'} · {liveNvda.status}</strong></div>
          <p>{liveNvda.event?.title || 'No new evidence event was created.'}</p>
          <small>{liveNvda.evidence.length} evidence records · {liveNvda.partialReasons.length ? liveNvda.partialReasons.join(' · ') : 'All required evidence lenses present'}</small>
        </section> : null}
        <nav className={styles.localNav} aria-label="Market Desk sections">
          <button type="button" aria-current={!activeEvent && location.view === 'inbox' ? 'page' : undefined} onClick={() => visit({ view: 'inbox', companySymbol: activeCompany.symbol, eventId: null, version: null, evidenceId: null })}>Change inbox <b>{fixture.events.length}</b></button>
          <button type="button" aria-current={!activeEvent && location.view === 'thesis' ? 'page' : undefined} onClick={() => visit({ view: 'thesis', companySymbol: activeCompany.symbol, eventId: null, version: null, evidenceId: null })}>Living thesis</button>
          <button type="button" aria-current={!activeEvent && location.view === 'lab' ? 'page' : undefined} onClick={() => visit({ view: 'lab', companySymbol: activeCompany.symbol, eventId: null, version: null, evidenceId: null })}>Decision Lab</button>
          <label>Mandate<select aria-label={`${activeCompany.symbol} mandate`} value={activeCompany.mandate} onChange={(event) => updateSession((current) => ({ ...current, mandates: { ...current.mandates, [activeCompany.id]: event.target.value as MandateKind } }))}><option value="owned">Owned</option><option value="watching">Watching</option><option value="exploring">Exploring</option></select></label>
        </nav>
        {!session ? <section className={styles.inbox}><p className={styles.eyebrow}>Loading preview session</p></section> : activeEvent ? <DecisionRoom key={activeEvent.id} event={activeEvent} company={activeCompany} judgment={session.judgments[activeEvent.id]} onJudge={(action, condition = '') => updateSession((current) => ({ ...current, judgments: { ...current.judgments, [activeEvent.id]: { action, condition: action === 'watch' ? condition.trim() : '', savedAt: new Date().toISOString() } } }))} onClear={() => updateSession((current) => {
          const judgments = { ...current.judgments }
          delete judgments[activeEvent.id]
          return { ...current, judgments }
        })} onBack={() => visit({ view: 'inbox', companySymbol: activeCompany.symbol, eventId: null, version: null, evidenceId: null })}>{chart}</DecisionRoom> : location.view === 'thesis' ? <ThesisView company={activeCompany} selected={selectedThesis} onOpenVersion={(version) => visit({ view: 'thesis', companySymbol: activeCompany.symbol, eventId: null, version, evidenceId: null })} onOpenEvidence={(id) => visit({ view: 'thesis', companySymbol: activeCompany.symbol, eventId: null, version: location.version, evidenceId: id })}>{chart}</ThesisView> : location.view === 'lab' ? <DecisionLab fixture={fixture} activeCompany={activeCompany} /> : !session.coverageAcknowledged ? <CoverageSetup companies={companies} onMandate={(id, mandate) => updateSession((current) => ({ ...current, mandates: { ...current.mandates, [id]: mandate } }))} onConcern={(id, concern) => updateSession((current) => ({ ...current, concerns: { ...current.concerns, [id]: concern } }))} onContinue={() => updateSession((current) => ({ ...current, coverageAcknowledged: true }))} /> : <section className={styles.inbox}>
          <header className={styles.inboxHeader}><div><p className={styles.eyebrow}>Research brief · {formatDate(fixture.asOf)}</p><h1>What deserves your attention</h1><p>{fixture.processedSilently} updates processed quietly. <strong>{thesisChanges} may change a thesis.</strong></p></div><div className={styles.inboxCount}><strong>{fixture.events.length}</strong><span>open<br/>changes</span></div></header>
          <div className={styles.filters}>{categoryFilters.map((item) => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
          <div className={styles.eventList}>{visibleEvents.map((event, index) => {
            const company = companies.find((item) => item.id === event.companyId)!
            const claim = company.currentThesis.claims.find((item) => item.id === event.affectedClaimId)!
            return <article key={event.id} className={styles.eventCard} data-state={event.state}>
              <button type="button" onClick={() => visit({ view: 'inbox', companySymbol: company.symbol, eventId: event.id, version: null, evidenceId: null })} aria-label={`Open ${company.symbol}: ${event.title}`}>
                <span className={styles.eventRank}>{String(index + 1).padStart(2, '0')}</span>
                <div className={styles.eventCompany}><span>{company.symbol}</span><small>{company.name}</small></div>
                <div className={styles.eventBody}><div><StatePill value={event.category}>{marketDeskLabels.category[event.category]}</StatePill>{event.state !== 'ready' && <StatePill value={event.state}>{event.state}</StatePill>}</div><h2>{event.title}</h2><p>{event.whyItMatters}</p><span>Affects: <b>{claim.title}</b></span></div>
                <div className={styles.eventScore}><span>Materiality</span><strong>{event.materiality}</strong><i style={{ '--score': `${event.materiality}%` } as React.CSSProperties} /></div><span className={styles.openArrow}>↗</span>
              </button>
            </article>
          })}</div>
        </section>}
      </div>
    </div>
    {evidenceItem ? <EvidenceDrawer item={evidenceItem} onClose={closeEvidence} /> : null}
  </main>
}
