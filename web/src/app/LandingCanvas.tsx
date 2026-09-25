'use client'

import { useState } from 'react'
import styles from './page.module.css'

const stages = [
  { id: 'market', label: '01 · Market', title: 'The price moved first' },
  { id: 'evidence', label: '02 · Evidence', title: 'The filings explain why' },
  { id: 'thesis', label: '03 · Thesis', title: 'The decision gets sharper' },
] as const

type Stage = (typeof stages)[number]['id']

export function LandingCanvas() {
  const [activeStage, setActiveStage] = useState<Stage>('market')

  return (
    <section className={styles.marketCanvas} aria-label="Illustrative analysis for Meridian Systems">
      <header className={styles.canvasHeader}>
        <div>
          <span className={styles.canvasEyebrow}>Illustrative analysis</span>
          <strong>Meridian Systems</strong>
          <small>MRDN · as of Sep 24, 2026</small>
        </div>
        <span className={styles.canvasStatus}><i /> Review complete</span>
      </header>

      <div className={styles.canvasTabs} role="tablist" aria-label="Analysis stages">
        {stages.map((stage) => (
          <button
            key={stage.id}
            type="button"
            role="tab"
            aria-selected={activeStage === stage.id}
            aria-controls="canvas-panel"
            className={activeStage === stage.id ? styles.activeCanvasTab : undefined}
            onClick={() => setActiveStage(stage.id)}
          >
            <span>{stage.label}</span>
            <strong>{stage.title}</strong>
          </button>
        ))}
      </div>

      <div className={styles.canvasBody}>
        <div className={styles.chartPanel}>
          <div className={styles.chartHeading}>
            <div><span>6 month price journey</span><strong>$84.20</strong></div>
            <b>+18.4%</b>
          </div>
          <svg viewBox="0 0 620 260" role="img" aria-label="Illustrative six month price chart rising eighteen point four percent">
            <defs>
              <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b7cbb5" stopOpacity=".58" />
                <stop offset="100%" stopColor="#b7cbb5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g className={styles.chartGrid}>
              <path d="M20 45H600M20 105H600M20 165H600M20 225H600" />
              <path d="M70 20V235M205 20V235M340 20V235M475 20V235" />
            </g>
            <path className={styles.chartArea} d="M20 208 C72 199 88 213 128 184 S190 176 224 151 S282 166 320 128 S378 123 412 94 S467 112 502 75 S556 72 600 40 L600 235 L20 235Z" />
            <path className={styles.chartLine} d="M20 208 C72 199 88 213 128 184 S190 176 224 151 S282 166 320 128 S378 123 412 94 S467 112 502 75 S556 72 600 40" />
            <g className={styles.chartMarker}><circle cx="224" cy="151" r="6" /><path d="M224 143V67" /><text x="238" y="58">Guidance raised</text><text x="238" y="75">Jun 12</text></g>
            <g className={styles.chartMarker}><circle cx="502" cy="75" r="6" /><path d="M502 67V26" /><text x="408" y="19">Margin inflection</text></g>
          </svg>
          <div className={styles.chartFooter}><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span></div>
        </div>

        <aside className={styles.canvasInsight} id="canvas-panel" role="tabpanel">
          {activeStage === 'market' && <>
            <span className={styles.insightNumber}>01 / 03</span>
            <h2>Strength is real. The easy move may be behind it.</h2>
            <p>Price momentum improved after guidance, but the valuation now assumes another clean quarter.</p>
            <dl><div><dt>Trend</dt><dd>Constructive</dd></div><div><dt>Volatility</dt><dd>Cooling</dd></div><div><dt>Setup</dt><dd>Extended</dd></div></dl>
          </>}
          {activeStage === 'evidence' && <>
            <span className={styles.insightNumber}>02 / 03</span>
            <h2>Margins—not hype—are carrying the story.</h2>
            <p>Two filings and the latest call support operating leverage. Customer concentration remains the material challenge.</p>
            <ul className={styles.evidenceList}><li><i className={styles.materialDot} />Q2 filing <b>Material</b></li><li><i className={styles.reviewedDot} />Earnings call <b>Reviewed</b></li><li><i className={styles.watchDot} />Peer pricing <b>Watch</b></li></ul>
          </>}
          {activeStage === 'thesis' && <>
            <span className={styles.insightNumber}>03 / 03</span>
            <h2>Promising business. Patient entry.</h2>
            <p>The evidence supports the company, but not any price. Wait for execution or a better setup to improve the odds.</p>
            <div className={styles.thesisScale}><span>Bear<br/><b>$61</b></span><span>Base<br/><b>$88</b></span><span>Bull<br/><b>$108</b></span></div>
          </>}
          <div className={styles.nextCheckpoint}><span>Next checkpoint</span><strong>Q3 earnings · Oct 29</strong><small>Watch gross margin and top-customer mix</small></div>
        </aside>
      </div>
    </section>
  )
}
