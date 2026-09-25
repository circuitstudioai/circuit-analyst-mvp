'use client'

import { useState } from 'react'
import styles from './page.module.css'

const changes = [
  { id: 'nvda', rank: '01', symbol: 'NVDA', state: 'Thesis changed', title: 'Policy pressure widened beyond the base case', score: 92 },
  { id: 'cost', rank: '02', symbol: 'COST', state: 'Under pressure', title: 'Membership economics met a tougher margin mix', score: 78 },
  { id: 'xom', rank: '03', symbol: 'XOM', state: 'New evidence', title: 'Upstream resilience offset refining weakness', score: 64 },
] as const

type ChangeId = (typeof changes)[number]['id']

export function LandingCanvas() {
  const [activeId, setActiveId] = useState<ChangeId>('nvda')
  const active = changes.find((change) => change.id === activeId) ?? changes[0]

  return <section className={styles.marketCanvas} aria-label="Illustrative Market Desk morning brief">
    <header className={styles.canvasHeader}>
      <div><span className={styles.canvasEyebrow}>Controlled prototype · fixture evidence</span><strong>What deserves your attention</strong><small>Morning brief · Sep 24, 2026</small></div>
      <span className={styles.canvasStatus}><i /> 47 updates reviewed</span>
    </header>
    <div className={styles.monitorCanvasBody}>
      <div className={styles.changeInbox}>
        <div className={styles.inboxSummary}><span>3 material changes</span><small>44 routine updates kept quiet</small></div>
        <div className={styles.changeRows} role="tablist" aria-label="Illustrative material changes">
          {changes.map((change) => <button key={change.id} type="button" role="tab" aria-selected={activeId === change.id} aria-controls="change-detail" className={activeId === change.id ? styles.activeChange : undefined} onClick={() => setActiveId(change.id)}>
            <b>{change.rank}</b><span><i>{change.symbol}</i><small>{change.state}</small><strong>{change.title}</strong></span><em>{change.score}<small>materiality</small></em>
          </button>)}
        </div>
      </div>
      <aside className={styles.changeDetail} id="change-detail" role="tabpanel">
        <span className={styles.insightNumber}>{active.symbol} · Decision room</span>
        <h2>{active.title}</h2>
        {active.id === 'nvda' ? <>
          <p>New export constraints challenge the assumption that policy friction remains manageable without breaking data-center growth.</p>
          <div className={styles.beforeAfter}><span><b>Before</b>Regional limits remain containable.</span><i>→</i><span><b>New evidence</b>Restrictions now reach more products and buyers.</span></div>
          <div className={styles.claimImpact}><span>Affected claim</span><strong>Durable growth with manageable policy friction</strong><small>Supported → under pressure</small></div>
        </> : active.id === 'cost' ? <>
          <p>Renewal strength held, but mix pressure complicates the assumption that operating leverage will arrive cleanly.</p>
          <div className={styles.beforeAfter}><span><b>Before</b>Renewals fund steady margin gains.</span><i>→</i><span><b>New evidence</b>Mix absorbed more of the renewal benefit.</span></div>
          <div className={styles.claimImpact}><span>Affected claim</span><strong>Membership economics compound into margin</strong><small>Supported → challenged</small></div>
        </> : <>
          <p>The portfolio absorbed a weaker refining quarter without changing the broader cash-flow case.</p>
          <div className={styles.beforeAfter}><span><b>Before</b>Upstream carries the cycle.</span><i>→</i><span><b>New evidence</b>Upstream resilience offset refining softness.</span></div>
          <div className={styles.claimImpact}><span>Affected claim</span><strong>Portfolio resilience through the cycle</strong><small>No thesis change</small></div>
        </>}
        <div className={styles.nextCheckpoint}><span>Next proof</span><strong>{active.id === 'nvda' ? 'Regional mix and compliant demand' : active.id === 'cost' ? 'Merchandise margin ex-gas' : 'Capital returns at lower refining margins'}</strong><small>Your judgment stays separate from the system thesis.</small></div>
      </aside>
    </div>
  </section>
}
