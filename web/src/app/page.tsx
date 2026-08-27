'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './page.module.css'
import { AnalyzeResponse, PipelineStep, RecentRun, SignalRow } from '@/lib/types'
import { BetaAccess } from './BetaAccess'

const samples = [
  ['NVDA'],
  ['AMD'],
  ['SOFI'],
  ['HIMS', 'HOOD', 'SOFI', 'AMD'],
  ['LMND', 'OSCR', 'WELL', 'ZETA'],
]

type SymbolSearchResult = {
  symbol: string
  name: string
  exchange: string
  type: string
}

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
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([])
  const [error, setError] = useState<string>('')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [symbolQuery, setSymbolQuery] = useState('')
  const [symbolResults, setSymbolResults] = useState<SymbolSearchResult[]>([])
  const [symbolSearchState, setSymbolSearchState] = useState<'idle' | 'searching' | 'ready'>('idle')

  const loadUserWatchlist = useCallback((symbols: string[]) => {
    setWatchlistText((current) => current === 'NVDA, AMD, SOFI, HIMS' ? symbols.join(', ') : current)
  }, [])

  const pickUniverseSymbol = useCallback((symbol: string) => {
    setWatchlistText((current) => {
      const symbols = [...new Set([...current.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean), symbol])]
      return symbols.slice(0, 12).join(', ')
    })
  }, [])

  const watchlist = useMemo(
    () => watchlistText.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
    [watchlistText]
  )

  useEffect(() => {
    const query = symbolQuery.trim()
    if (!query) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSymbolSearchState('searching')
      try {
        const response = await fetch(`/api/symbols/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        const data = await response.json()
        setSymbolResults(Array.isArray(data?.items) ? data.items : [])
      } catch {
        if (!controller.signal.aborted) setSymbolResults([])
      } finally {
        if (!controller.signal.aborted) setSymbolSearchState('ready')
      }
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [symbolQuery])

  function addSymbol(symbol: string) {
    pickUniverseSymbol(symbol)
    setSymbolQuery('')
    setSymbolResults([])
  }

  const topSetups = useMemo(() => {
    if (!result) return []
    const rank = { BUY: 0, HOLD: 1, SELL: 2 }
    return [...result.signals]
      .sort((a, b) => rank[a.decision] - rank[b.decision] || b.confidence - a.confidence)
      .slice(0, 3)
  }, [result])

  const previousRun = useMemo(() => {
    if (!result) return recentRuns[0]
    const current = new Date(result.asOf).getTime()
    return recentRuns.find((run) => Math.abs(new Date(run.as_of).getTime() - current) > 1000)
  }, [recentRuns, result])

  const visibleRuns = accessToken ? recentRuns : []

  async function fetchRecentRuns() {
    if (!accessToken) {
      setRecentRuns([])
      return
    }
    try {
      const res = await fetch('/api/runs', { cache: 'no-store', headers: { authorization: `Bearer ${accessToken}` } })
      if (!res.ok) return
      const data = await res.json()
      setRecentRuns(Array.isArray(data?.runs) ? data.runs : [])
    } catch {
      setRecentRuns([])
    }
  }

  useEffect(() => {
    let cancelled = false

    if (!accessToken) {
      return () => { cancelled = true }
    }

    fetch('/api/runs', { cache: 'no-store', headers: { authorization: `Bearer ${accessToken}` } })
      .then((res) => res.ok ? res.json() : { runs: [] })
      .then((data) => {
        if (!cancelled) setRecentRuns(Array.isArray(data?.runs) ? data.runs : [])
      })
      .catch(() => {
        if (!cancelled) setRecentRuns([])
      })

    return () => {
      cancelled = true
    }
  }, [accessToken])

  async function runAnalysis(symbols = watchlist) {
    if (!accessToken) {
      setError('Sign in with a beta magic link to run analysis.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ watchlist: symbols }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Analyze failed')
      setResult(data)
      void fetch('/api/me', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ symbols }),
      })
      void fetchRecentRuns()
      const url = new URL(window.location.href)
      url.searchParams.set('tickers', symbols.join(','))
      window.history.replaceState(null, '', url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function submitFeedback(signal: SignalRow, helpful: boolean) {
    if (!accessToken) return
    setFeedback((current) => ({ ...current, [signal.symbol]: 'sending' }))
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ runId: result?.saved?.runId, symbol: signal.symbol, helpful }),
    })
    setFeedback((current) => ({ ...current, [signal.symbol]: response.ok ? 'saved' : 'error' }))
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
            A focused beta market desk that turns a watchlist into decisions,
            thesis, risk, invalidation, next actions, and research-backed evidence.
          </p>
        </div>

        <div className={styles.console}>
          <BetaAccess
            onToken={setAccessToken}
            onLoadWatchlist={loadUserWatchlist}
            onPickSymbol={pickUniverseSymbol}
          />
          <div className={styles.consoleTop}>
            <span>Evidence-led beta</span>
            <span>{accessToken ? 'Authenticated' : 'Read-only preview'}</span>
          </div>
          <label className={styles.label}>Ticker or watchlist</label>
          <div className={styles.symbolSearch}>
            <input
              value={symbolQuery}
              onChange={(event) => {
                const next = event.target.value
                setSymbolQuery(next)
                if (!next.trim()) {
                  setSymbolResults([])
                  setSymbolSearchState('idle')
                }
              }}
              placeholder="Search symbol or company — e.g. TSLA or Shopify"
              aria-label="Search live market symbols"
              autoComplete="off"
            />
            <span>{symbolSearchState === 'searching' ? 'Searching…' : 'Live symbol lookup'}</span>
            {symbolQuery && symbolSearchState === 'ready' && (
              <div className={styles.symbolResults} role="listbox" aria-label="Symbol search results">
                {symbolResults.length ? symbolResults.map((item) => (
                  <button key={`${item.symbol}-${item.exchange}`} type="button" onClick={() => addSymbol(item.symbol)}>
                    <strong>{item.symbol}</strong>
                    <span>{item.name}</span>
                    <small>{item.exchange} · {item.type}</small>
                  </button>
                )) : <p>No supported equity or ETF found.</p>}
              </div>
            )}
          </div>
          <textarea
            value={watchlistText}
            onChange={(e) => setWatchlistText(e.target.value)}
            rows={2}
            className={styles.textarea}
            aria-label="Ticker watchlist"
          />
          <p className={styles.inputHint}>Search by company name or enter any supported Yahoo ticker. Analysis runs live when you press Run analysis; scheduled refresh only powers the daily desk.</p>
          <div className={styles.sampleRow}>
            {samples.map((symbols) => (
              <button key={symbols.join(',')} onClick={() => loadSample(symbols)} className={styles.chip}>
                {symbols.length === 1 ? symbols[0] : `${symbols.length} names`}
              </button>
            ))}
          </div>
          <button onClick={() => runAnalysis()} disabled={loading || !accessToken} className={styles.button}>
            {loading ? 'Analyzing...' : accessToken ? 'Run analysis' : 'Sign in to analyze'}
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

      <section className={styles.ops}>
        <div className={styles.topSetups}>
          <div className={styles.panelHeader}>
            <p className={styles.kicker}>Top setups</p>
            <strong>{result ? `${topSetups.length} ranked` : 'Awaiting run'}</strong>
          </div>
          <div className={styles.setupGrid}>
            {(topSetups.length ? topSetups : placeholderSetups()).map((signal) => (
              <div key={signal.symbol} className={styles.setupTile}>
                <span>{signal.symbol}</span>
                <strong>{signal.decision}</strong>
                <small>{pct(signal.confidence)}</small>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.runLedger}>
          <div className={styles.panelHeader}>
            <p className={styles.kicker}>Run ledger</p>
            <strong>{visibleRuns.length ? `${visibleRuns.length} stored` : 'Storage idle'}</strong>
          </div>
          {visibleRuns.length ? (
            <ol>
              {visibleRuns.slice(0, 4).map((run) => (
                <li key={run.id}>
                  <span>{new Date(run.as_of).toLocaleString()}</span>
                  <strong>Regime {Number(run.regime_score).toFixed(3)}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p>Supabase is not connected on this deployment.</p>
          )}
        </div>

        <div className={styles.diffPanel}>
          <div className={styles.panelHeader}>
            <p className={styles.kicker}>Daily diff</p>
            <strong>{previousRun && result ? regimeDelta(result.regimeScore, previousRun.regime_score) : 'Pending'}</strong>
          </div>
          <p>
            {previousRun && result
              ? `Prior run ${new Date(previousRun.as_of).toLocaleDateString()} at regime ${Number(previousRun.regime_score).toFixed(3)}.`
              : 'Diffs appear after Supabase has at least two saved runs.'}
          </p>
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
            <span>Sign in with a beta magic link, search any supported ticker, and run a live evidence-led analysis.</span>
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
                <div className={styles.feedbackRow}>
                  <span>{feedback[signal.symbol] === 'saved' ? 'Feedback saved' : 'Useful for your decision?'}</span>
                  <button type="button" onClick={() => submitFeedback(signal, true)} disabled={feedback[signal.symbol] === 'sending'}>Yes</button>
                  <button type="button" onClick={() => submitFeedback(signal, false)} disabled={feedback[signal.symbol] === 'sending'}>No</button>
                </div>
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
    { label: 'Persistence', status: 'skipped', detail: 'Supabase status appears after analysis.' },
  ]
}

function placeholderSetups(): Pick<SignalRow, 'symbol' | 'decision' | 'confidence'>[] {
  return [
    { symbol: 'NVDA', decision: 'HOLD', confidence: 0 },
    { symbol: 'AMD', decision: 'HOLD', confidence: 0 },
    { symbol: 'SOFI', decision: 'HOLD', confidence: 0 },
  ]
}

function regimeDelta(current: number, prior: number) {
  const delta = current - Number(prior)
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta.toFixed(3)}`
}
