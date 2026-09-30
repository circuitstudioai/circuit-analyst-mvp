'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  CompanyDeskRecord,
  MandateKind,
  MarketDeskFixture,
  ResearchEvent,
  buildDecisionRoomResearchHref,
  buildThesisDiff,
  marketDeskLabels,
  rankInboxEvents,
} from '@/lib/marketDesk'
import { MarketDeskVnextRollout } from '@/lib/marketDeskRollout'
import styles from './marketDesk.module.css'

type Surface = 'inbox' | 'thesis' | 'lab'
type Judgment = 'keep' | 'update' | 'watch'

const categoryFilters = [
  { value: 'all', label: 'All changes' },
  { value: 'thesis_changed', label: 'Thesis changed' },
  { value: 'assumption_pressure', label: 'Under pressure' },
  { value: 'disagreement', label: 'Disagreement' },
  { value: 'new_evidence', label: 'No thesis change' },
] as const

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

function ThesisView({ company, onOpenEvidence }: { company: CompanyDeskRecord; onOpenEvidence: (id: string) => void }) {
  const current = company.currentThesis
  const previous = company.thesisVersions.at(-2)!
  const diff = buildThesisDiff(previous, current)
  return <section className={styles.thesisView} aria-labelledby="thesis-title">
    <header className={styles.thesisHeader}>
      <div><p className={styles.eyebrow}>Living thesis · version {current.version}</p><h1 id="thesis-title">{company.name}</h1><p>{current.summary}</p></div>
      <div className={styles.freshness}><span>Fresh through</span><strong>{formatDate(current.cutoff)}</strong><small>{company.archetype}</small></div>
    </header>
    <div className={styles.thesisSignals}>
      <div><span>Evidence stance</span><StatePill value={current.stance}>{marketDeskLabels.stance[current.stance]}</StatePill></div>
      <div><span>Thesis status</span><StatePill value={current.status}>{marketDeskLabels.status[current.status]}</StatePill></div>
      <div><span>Valuation setup</span><StatePill value={current.valuation}>{marketDeskLabels.valuation[current.valuation]}</StatePill></div>
      <div><span>Confidence</span><strong>{percent(current.confidence)}</strong></div>
    </div>
    <div className={styles.diffBanner}><span>v{previous.version} → v{current.version}</span><strong>{diff.claimChanges.length ? `${diff.claimChanges.length} claim ${diff.claimChanges.length === 1 ? 'changed' : 'changes'}` : 'No claim-state change'}</strong><p>{diff.summary}</p></div>
    <div className={styles.claimGrid}>
      {current.claims.map((claim, index) => <article key={claim.id}>
        <div className={styles.claimNumber}>0{index + 1}</div><div><span>{claim.importance} claim</span><h2>{claim.title}</h2><p>{claim.detail}</p><button onClick={() => onOpenEvidence(claim.evidenceIds[0])}>{claim.evidenceIds.length} linked {claim.evidenceIds.length === 1 ? 'source' : 'sources'} <span aria-hidden>↗</span></button></div><StatePill value={claim.state}>{marketDeskLabels.claimState[claim.state]}</StatePill>
      </article>)}
    </div>
    <div className={styles.caseGrid}>
      <article><span>The strongest case for</span><p>{company.bullCase}</p></article>
      <article><span>The strongest case against</span><p>{company.bearCase}</p></article>
      <article><span>What appears priced in</span><p>{company.pricedIn}</p></article>
    </div>
    <section className={styles.invalidation}><div><span>What breaks the case</span><h2>Invalidation conditions</h2></div><ol>{company.invalidation.map((item) => <li key={item}>{item}</li>)}</ol></section>
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

function DecisionRoom({ event, company, judgment, onJudge, onBack }: { event: ResearchEvent; company: CompanyDeskRecord; judgment?: Judgment; onJudge: (value: Judgment, condition?: string) => void; onBack: () => void }) {
  const [condition, setCondition] = useState('')
  const evidence = event.evidenceIds.map((id) => company.evidence.find((item) => item.id === id)).filter(Boolean) as CompanyDeskRecord['evidence']
  return <section className={styles.room} aria-labelledby="room-title">
    <button className={styles.backButton} onClick={onBack}>← Change inbox</button>
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
    <section className={styles.evidenceTrail}><div className={styles.sectionIntro}><span>Evidence trail</span><h2>From source to thesis effect</h2></div>{evidence.map((item) => <article key={item.id}><div><span>{item.sourceName}</span><StatePill value={item.freshness}>{item.freshness}</StatePill></div><blockquote>{item.passage}</blockquote><p><b>Normalized fact</b>{item.normalizedFact}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">Inspect source ↗</a></article>)}</section>
    <section className={styles.judgmentBox}>
      <div><span>Your checkpoint</span><h2>The desk informs. You decide.</h2><p>Your judgment is stored separately from the system thesis.</p></div>
      {judgment ? <div className={styles.savedJudgment}><b>Saved</b><span>{judgment === 'keep' ? 'Keep my view' : judgment === 'update' ? 'Update my view' : 'Watch this assumption'}</span><button onClick={() => onJudge(judgment)}>Change response</button></div> : <div className={styles.judgmentActions}>
        <button onClick={() => onJudge('keep')}>Keep my view</button><button onClick={() => onJudge('update')}>Update my view</button>
        <div><input aria-label="Watch condition" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Notify me only if…"/><button disabled={!condition.trim()} onClick={() => onJudge('watch', condition)}>Watch this assumption</button></div>
      </div>}
      <small>Prototype only — watch conditions are saved in this browser session and monitoring is not active.</small>
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

export function MarketDeskExperience({ fixture, rollout }: { fixture: MarketDeskFixture; rollout: MarketDeskVnextRollout }) {
  const [surface, setSurface] = useState<Surface>('inbox')
  const [activeCompanyId, setActiveCompanyId] = useState(fixture.companies[0].id)
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof categoryFilters)[number]['value']>('all')
  const [mandates, setMandates] = useState<Record<string, MandateKind>>(() => Object.fromEntries(fixture.companies.map((company) => [company.id, company.mandate])))
  const [judgments, setJudgments] = useState<Record<string, Judgment>>({})
  const [evidenceId, setEvidenceId] = useState<string | null>(null)

  const companies = useMemo(() => fixture.companies.map((company) => ({ ...company, mandate: mandates[company.id] || company.mandate })), [fixture.companies, mandates])
  const activeCompany = companies.find((company) => company.id === activeCompanyId) || companies[0]
  const activeEvent = fixture.events.find((event) => event.id === activeEventId)
  const visibleEvents = rankInboxEvents(fixture.events).filter((event) => filter === 'all' || event.category === filter)
  const thesisChanges = fixture.events.filter((event) => event.thesisEffect !== 'no_change').length

  function chooseCompany(id: string) {
    setActiveCompanyId(id); setActiveEventId(null); setEvidenceId(null); setSurface('thesis')
  }

  function openEvent(event: ResearchEvent) {
    setActiveCompanyId(event.companyId); setActiveEventId(event.id); setEvidenceId(null)
  }

  return <main className={styles.shell}>
    <div className={styles.prototypeBar}><span>{rollout === 'preview' ? 'Private preview' : 'Market Desk vNext'}</span><p>Controlled five-company prototype · fixture evidence · monitoring is not active</p><Link href="/desk">Open live research ↗</Link></div>
    <div className={styles.workspace}>
      <CompanyRail companies={companies} activeId={activeCompanyId} onSelect={chooseCompany} />
      <div className={styles.mainColumn}>
        <nav className={styles.localNav} aria-label="Market Desk sections">
          <button aria-current={surface === 'inbox' && !activeEvent ? 'page' : undefined} onClick={() => { setSurface('inbox'); setActiveEventId(null) }}>Change inbox <b>{fixture.events.length}</b></button>
          <button aria-current={surface === 'thesis' ? 'page' : undefined} onClick={() => { setSurface('thesis'); setActiveEventId(null) }}>Living thesis</button>
          <button aria-current={surface === 'lab' ? 'page' : undefined} onClick={() => { setSurface('lab'); setActiveEventId(null) }}>Decision Lab</button>
          <label>Mandate<select value={mandates[activeCompany.id]} onChange={(e) => setMandates((current) => ({ ...current, [activeCompany.id]: e.target.value as MandateKind }))}><option value="owned">Owned</option><option value="watching">Watching</option><option value="exploring">Exploring</option></select></label>
        </nav>
        {activeEvent ? <DecisionRoom event={activeEvent} company={activeCompany} judgment={judgments[activeEvent.id]} onJudge={(value) => setJudgments((current) => ({ ...current, [activeEvent.id]: value }))} onBack={() => setActiveEventId(null)} /> : surface === 'thesis' ? <ThesisView company={activeCompany} onOpenEvidence={setEvidenceId} /> : surface === 'lab' ? <DecisionLab fixture={fixture} activeCompany={activeCompany} /> : <section className={styles.inbox}>
          <header className={styles.inboxHeader}><div><p className={styles.eyebrow}>Research brief · {formatDate(fixture.asOf)}</p><h1>What deserves your attention</h1><p>{fixture.processedSilently} updates processed quietly. <strong>{thesisChanges} may change a thesis.</strong></p></div><div className={styles.inboxCount}><strong>{fixture.events.length}</strong><span>open<br/>changes</span></div></header>
          <div className={styles.filters}>{categoryFilters.map((item) => <button key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
          <div className={styles.eventList}>{visibleEvents.map((event, index) => {
            const company = companies.find((item) => item.id === event.companyId)!
            const claim = company.currentThesis.claims.find((item) => item.id === event.affectedClaimId)!
            return <article key={event.id} className={styles.eventCard} data-state={event.state}>
              <button onClick={() => openEvent(event)} aria-label={`Open ${company.symbol}: ${event.title}`}>
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
    {evidenceId && <div className={styles.drawerBackdrop} onClick={() => setEvidenceId(null)}><aside className={styles.evidenceDrawer} onClick={(e) => e.stopPropagation()} aria-label="Evidence detail"><button onClick={() => setEvidenceId(null)} aria-label="Close evidence">×</button>{activeCompany.evidence.filter((item) => item.id === evidenceId).map((item) => <div key={item.id}><p className={styles.eyebrow}>Evidence record</p><h2>{item.sourceName}</h2><StatePill value={item.freshness}>{item.freshness}</StatePill><blockquote>{item.passage}</blockquote><span>Normalized fact</span><p>{item.normalizedFact}</p><dl><div><dt>Published</dt><dd>{formatDate(item.publishedAt)}</dd></div><div><dt>Retrieved</dt><dd>{formatDate(item.retrievedAt)}</dd></div><div><dt>Confidence</dt><dd>{percent(item.confidence)}</dd></div></dl><a href={item.sourceUrl} target="_blank" rel="noreferrer">Open original source ↗</a></div>)}</aside></div>}
  </main>
}
