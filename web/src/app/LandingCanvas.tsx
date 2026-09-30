'use client'

import { useState } from 'react'
import styles from './page.module.css'

const changes = [
  { id: 'nvda', rank: '01', symbol: 'NVDA', state: 'May change the view', title: 'New export rules increase risk to data-center growth', priority: 'High' },
  { id: 'cost', rank: '02', symbol: 'COST', state: 'Assumption at risk', title: 'Higher costs weakened the expected margin improvement', priority: 'Medium' },
  { id: 'xom', rank: '03', symbol: 'XOM', state: 'View unchanged', title: 'Strong production offset weaker refining results', priority: 'Low' },
] as const

type ChangeId = (typeof changes)[number]['id']

export function LandingCanvas() {
  const [activeId, setActiveId] = useState<ChangeId>('nvda')
  const active = changes.find((change) => change.id === activeId) ?? changes[0]

  return <section className={styles.marketCanvas} aria-label="Example Market Desk morning review using fixture data">
    <header className={styles.canvasHeader}>
      <div><span className={styles.canvasEyebrow}>Example using fixture data</span><strong>Updates worth reviewing</strong><small>Morning review · Sep 24, 2026</small></div>
      <span className={styles.canvasStatus}><i /> 47 updates checked</span>
    </header>
    <div className={styles.monitorCanvasBody}>
      <div className={styles.changeInbox}>
        <div className={styles.inboxSummary}><span>3 may affect your view</span><small>44 did not change the research</small></div>
        <div className={styles.changeRows} role="tablist" aria-label="Example updates worth reviewing">
          {changes.map((change) => <button key={change.id} type="button" role="tab" aria-selected={activeId === change.id} aria-controls="change-detail" className={activeId === change.id ? styles.activeChange : undefined} onClick={() => setActiveId(change.id)}>
            <b>{change.rank}</b><span><i>{change.symbol}</i><small>{change.state}</small><strong>{change.title}</strong></span><em>{change.priority}<small>priority</small></em>
          </button>)}
        </div>
      </div>
      <aside className={styles.changeDetail} id="change-detail" role="tabpanel">
        <span className={styles.insightNumber}>{active.symbol} · Why this matters</span>
        <h2>{active.title}</h2>
        {active.id === 'nvda' ? <>
          <p>The earlier research assumed export limits would stay narrow. The new rules put more overseas revenue at risk and increase uncertainty around data-center growth.</p>
          <div className={styles.beforeAfter}><span><b>Earlier view</b>Export limits would affect a narrow part of the business.</span><i>→</i><span><b>New information</b>The restrictions now cover more products and buyers.</span></div>
          <div className={styles.claimImpact}><span>What this could change</span><strong>Data-center growth can continue without a large hit from export policy.</strong><small>May need another look</small></div>
        </> : active.id === 'cost' ? <>
          <p>Renewals remained strong, but higher costs weakened the expected improvement in operating margins.</p>
          <div className={styles.beforeAfter}><span><b>Earlier view</b>Renewals would support steady margin gains.</span><i>→</i><span><b>New information</b>Higher costs absorbed more of the renewal benefit.</span></div>
          <div className={styles.claimImpact}><span>What this could change</span><strong>Membership growth will lead to better margins.</strong><small>Assumption at risk</small></div>
        </> : <>
          <p>Strong production offset weaker refining results, so the broader cash-flow view did not change.</p>
          <div className={styles.beforeAfter}><span><b>Earlier view</b>Production can carry the business through weaker refining periods.</span><i>→</i><span><b>New information</b>Production strength offset refining weakness.</span></div>
          <div className={styles.claimImpact}><span>What this could change</span><strong>The business can remain resilient through the cycle.</strong><small>View unchanged</small></div>
        </>}
        <div className={styles.nextCheckpoint}><span>What to check next</span><strong>{active.id === 'nvda' ? 'Regional sales mix and demand for compliant products' : active.id === 'cost' ? 'Merchandise margins excluding gas' : 'Capital returns if refining margins stay lower'}</strong><small>Market Desk shows the evidence. You decide whether to change your view.</small></div>
      </aside>
    </div>
  </section>
}
