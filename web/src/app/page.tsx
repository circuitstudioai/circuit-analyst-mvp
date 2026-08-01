'use client'

import { useState } from 'react'
import styles from './page.module.css'

type Signal = {
  symbol: string
  decision: 'BUY' | 'HOLD' | 'SELL'
  confidence: number
  score: number
  lastPrice: number
  reasons: string[]
  thesis: string
  riskFlags: string[]
  invalidation: string
  nextAction: string
  timeHorizon: string
  dataQuality: 'ok' | 'limited' | 'insufficient'
  abstained: boolean
  source: string
  aiExplanation?: string
}

type Consensus = {
  ticker: string
  direction: 'bullish' | 'neutral' | 'bearish'
  agreement_score: number
  confidence_score: number
  freshness_score: number
  conflict_flag: boolean
  rationale: string
}

function cardClass(decision: Signal['decision']) {
  if (decision === 'BUY') return `${styles.signalCard} ${styles.signalCardBuy}`
  if (decision === 'SELL') return `${styles.signalCard} ${styles.signalCardSell}`
  return styles.signalCard
}

export default function HomePage() {
  const [watchlistText, setWatchlistText] = useState('AMD,SOFI,HIMS,HOOD,LMND,OSCR,WELL,ZETA,RLAY')
  const [loading, setLoading] = useState(false)
  const [asOf, setAsOf] = useState<string>('')
  const [regime, setRegime] = useState<number | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [consensus, setConsensus] = useState<Consensus[]>([])
  const [brief, setBrief] = useState<string>('')
  const [error, setError] = useState<string>('')

  async function refreshBrief() {
    const res = await fetch('/api/brief/latest')
    const data = await res.json()
    setBrief(data?.brief?.markdown || '')
  }

  async function onAnalyze() {
    setLoading(true)
    setError('')
    try {
      const watchlist = watchlistText.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ watchlist }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Analyze failed')
      setAsOf(data.asOf)
      setRegime(data.regimeScore)
      setSignals(data.signals || [])

      const c: Consensus[] = []
      for (const s of watchlist) {
        const cr = await fetch('/api/consensus', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ticker: s }),
        })
        if (cr.ok) {
          const cj = await cr.json()
          if (cj?.consensus) c.push(cj.consensus)
        }
      }
      setConsensus(c)
      await refreshBrief()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.desk}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div>
            <div className={styles.eyebrow}>Circuit Studio AI</div>
            <h1 className={styles.title}>Market Desk</h1>
            <p className={styles.subtitle}>
              A watchlist analyst workspace for accountable decision-support: ranked signals,
              evidence, risk flags, invalidation, and next actions from public market data.
            </p>
          </div>
          <div className={styles.stamp}>
            <span className={styles.stampLabel}>Mode</span>
            <span className={styles.stampValue}>Decision support only</span>
            <span className={styles.stampLabel}>Data</span>
            <span className={styles.stampValue}>Free public market feed</span>
          </div>
        </header>

        <section className={styles.controlPanel}>
          <div>
            <label className={styles.label}>Watchlist</label>
            <textarea
              value={watchlistText}
              onChange={(e) => setWatchlistText(e.target.value)}
              rows={2}
              className={styles.textarea}
            />
          </div>
          <button onClick={onAnalyze} disabled={loading} className={styles.button}>
            {loading ? 'Analyzing' : 'Run Analysis'}
          </button>
        </section>

        <div className={styles.statusLine}>
          {asOf && <span className={styles.pill}>As of {new Date(asOf).toLocaleString()}</span>}
          {regime !== null && <span className={styles.pill}>Regime score {regime}</span>}
          {signals.length > 0 && <span className={styles.pill}>{signals.length} symbols scored</span>}
        </div>
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.grid}>
          <section>
            <h2 className={styles.sectionTitle}>Signal Board</h2>
            {signals.length === 0 ? (
              <p className={styles.empty}>Run analysis to generate ranked signal cards.</p>
            ) : (
              <div className={styles.signalGrid}>
                {signals.map((s) => (
                  <article key={s.symbol} className={cardClass(s.decision)}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.symbol}>{s.symbol}</h3>
                      <span className={styles.decision}>{s.abstained ? 'ABSTAIN' : s.decision}</span>
                    </div>
                    <div className={styles.metrics}>
                      <div className={styles.metric}>
                        <span>Price</span>
                        <strong>${s.lastPrice}</strong>
                      </div>
                      <div className={styles.metric}>
                        <span>Confidence</span>
                        <strong>{(s.confidence * 100).toFixed(0)}%</strong>
                      </div>
                      <div className={styles.metric}>
                        <span>Score</span>
                        <strong>{s.score}</strong>
                      </div>
                    </div>
                    <p className={styles.thesis}>{s.thesis}</p>
                    <ul className={styles.list}>
                      <li>{s.nextAction}</li>
                      <li>{s.invalidation}</li>
                      <li>Data quality: {s.dataQuality}</li>
                    </ul>
                    <ul className={styles.list}>
                      {s.riskFlags.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                    {s.aiExplanation && <div className={styles.note}>{s.aiExplanation}</div>}
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className={styles.side}>
            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>Consensus</h2>
              {consensus.length === 0 ? (
                <p className={styles.empty}>Consensus appears when external engine outputs are ingested.</p>
              ) : (
                <div>
                  {consensus.map((c) => (
                    <p key={c.ticker} className={styles.empty}>
                      <strong>{c.ticker}</strong> {c.direction}; confidence {(c.confidence_score * 100).toFixed(0)}%;
                      agreement {(c.agreement_score * 100).toFixed(0)}%{c.conflict_flag ? '; conflict flagged' : ''}.
                    </p>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>Daily Brief</h2>
              {brief ? <pre className={styles.brief}>{brief}</pre> : <p className={styles.empty}>No stored brief yet.</p>}
            </section>
          </aside>
        </div>

        <p className={styles.disclaimer}>
          Educational decision-support only. This app does not provide personalized financial advice,
          execute trades, or know your objectives, risk tolerance, tax situation, or portfolio.
        </p>
      </div>
    </main>
  )
}
