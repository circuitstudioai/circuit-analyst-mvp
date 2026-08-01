'use client'

import { useMemo, useState } from 'react'
import styles from './page.module.css'
import { AnalyzeResponse, PipelineStep, SignalRow } from '@/lib/types'

const samples = [
  ['NVDA'],
  ['AMD'],
  ['SOFI'],
  ['HIMS', 'HOOD', 'SOFI', 'AMD'],
  ['LMND', 'OSCR', 'WELL', 'ZETA'],
]

function cardClass(decision: SignalRow['decision']) {
  if (decision === 'BUY') return `${styles.report} ${styles.reportBuy}`
  if (decision === 'SELL') return `${styles.report} ${styles.reportSell}`
  return styles.report
}

function verdict(signal: SignalRow) {
  if (signal.abstained) return 'Abstain'
  if (signal.decision === 'BUY') return 'Bullish'
  if (signal.decision === 'SELL') return 'Bearish'
  return 'Neutral'
}

function pct(value: number) {
  return `${(value * 100).toFixed(0)}%`
}

function formatList(items: string[]) {
  return items.length ? items : ['No major item flagged.']
}

export default function HomePage() {
  const [watchlistText, setWatchlistText] = useState(() => {
    if (typeof window === 'undefined') return 'NVDA, AMD, SOFI, HIMS'
    return new URLSearchParams(window.location.search).get('tickers') || 'NVDA, AMD, SOFI, HIMS'
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string>('')

  const watchlist = useMemo(
    () => watchlistText.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
    [watchlistText]
  )

  async function runAnalysis(symbols = watchlist) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ watchlist: symbols }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Analyze failed')
      setResult(data)
      const url = new URL(window.location.href)
      url.searchParams.set('tickers', symbols.join(','))
      window.history.replaceState(null, '', url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  function loadSample(symbols: string[]) {
    setWatchlistText(symbols.join(', '))
    void runAnalysis(symbols)
  }

  function copyReport() {
    if (!result) return
    const lines = result.signals.map((s) => {
      return `${s.symbol}: ${verdict(s)} / ${pct(s.confidence)} confidence\n${s.thesis}\nInvalidation: ${s.invalidation}\nNext: ${s.nextAction}`
    })
    void navigator.clipboard.writeText(lines.join('\n\n'))
  }

  return (
    <main className={styles.desk}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Circuit Studio AI</p>
          <h1>Circuit Market Desk</h1>
          <p>
            A public no-login AI stock analyst demo that turns a watchlist into decisions,
            thesis, risk, invalidation, next actions, and research-backed evidence.
          </p>
        </div>

        <div className={styles.console}>
          <div className={styles.consoleTop}>
            <span>Public demo</span>
            <span>No account required</span>
          </div>
          <label className={styles.label}>Ticker or watchlist</label>
          <textarea
            value={watchlistText}
            onChange={(e) => setWatchlistText(e.target.value)}
            rows={2}
            className={styles.textarea}
            aria-label="Ticker watchlist"
          />
          <div className={styles.sampleRow}>
            {samples.map((symbols) => (
              <button key={symbols.join(',')} onClick={() => loadSample(symbols)} className={styles.chip}>
                {symbols.length === 1 ? symbols[0] : `${symbols.length} names`}
              </button>
            ))}
          </div>
          <button onClick={() => runAnalysis()} disabled={loading} className={styles.button}>
            {loading ? 'Analyzing...' : 'Run analysis'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </section>

      <section className={styles.band}>
        <div className={styles.pipeline}>
          {(result?.pipeline || fallbackPipeline()).map((step) => (
            <PipelineItem key={step.label} step={step} />
          ))}
        </div>
      </section>

      <section className={styles.results}>
        <div className={styles.resultHeader}>
          <div>
            <p className={styles.kicker}>Analyst report</p>
            <h2>{result ? `${result.signals.length} symbols scored` : 'Run a watchlist to generate the desk'}</h2>
          </div>
          <div className={styles.actions}>
            {result?.asOf && <span className={styles.meta}>As of {new Date(result.asOf).toLocaleString()}</span>}
            {result && <span className={styles.meta}>Regime {result.regimeScore}</span>}
            {result && <button onClick={copyReport} className={styles.secondaryButton}>Copy report</button>}
          </div>
        </div>

        {!result ? (
          <div className={styles.empty}>
            <strong>Try NVDA, AMD, SOFI, or your own watchlist.</strong>
            <span>The first useful screen is the tool itself: no login, no credits, no setup.</span>
          </div>
        ) : (
          <div className={styles.reportGrid}>
            {result.signals.map((signal) => (
              <article key={signal.symbol} className={cardClass(signal.decision)}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.symbol}>{signal.symbol}</span>
                    <h3>{verdict(signal)}</h3>
                  </div>
                  <span className={styles.score}>{pct(signal.confidence)}</span>
                </div>

                <div className={styles.metrics}>
                  <span>${signal.lastPrice}</span>
                  <span>Score {signal.score}</span>
                  <span>{signal.dataQuality}</span>
                </div>

                <p className={styles.thesis}>{signal.thesis}</p>

                <div className={styles.twoCol}>
                  <ListBlock title="Bull case" items={formatList(signal.bullCase)} />
                  <ListBlock title="Bear case" items={formatList(signal.bearCase)} />
                </div>

                <ListBlock title="Risk flags" items={formatList(signal.riskFlags)} />
                <ListBlock title="Catalysts" items={formatList(signal.catalysts)} />

                <div className={styles.callout}>
                  <strong>Invalidation</strong>
                  <span>{signal.invalidation}</span>
                </div>
                <div className={styles.callout}>
                  <strong>Next action</strong>
                  <span>{signal.nextAction}</span>
                </div>

                <div className={styles.evidence}>
                  {signal.evidence.map((item) => (
                    <span key={`${item.label}-${item.detail}`} className={`${styles.badge} ${styles[item.strength]}`}>
                      <strong>{item.label}</strong>
                      {item.detail}
                    </span>
                  ))}
                </div>

                {signal.aiExplanation && <pre className={styles.aiNote}>{signal.aiExplanation}</pre>}
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <strong>Built by Circuit Studio AI.</strong>
        <span>Educational decision-support only. Not personalized financial advice.</span>
        <a href="https://circuitstudio.ai">Work with us</a>
      </footer>
    </main>
  )
}

function PipelineItem({ step }: { step: PipelineStep }) {
  return (
    <div className={`${styles.pipelineItem} ${styles[step.status]}`}>
      <span>{step.status}</span>
      <strong>{step.label}</strong>
      <p>{step.detail}</p>
    </div>
  )
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.listBlock}>
      <strong>{title}</strong>
      <ul>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function fallbackPipeline(): PipelineStep[] {
  return [
    { label: 'Public price fetch', status: 'skipped', detail: 'Waiting for a watchlist.' },
    { label: 'Rule scoring', status: 'skipped', detail: 'Trend, momentum, risk, and regime checks.' },
    { label: 'Research evidence', status: 'skipped', detail: 'PEAD harness evidence appears when tickers match.' },
    { label: 'AI summary', status: 'skipped', detail: 'Optional Gemini server enrichment.' },
  ]
}
