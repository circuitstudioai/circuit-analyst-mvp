'use client'

import { useState } from 'react'

type Signal = {
  symbol: string
  decision: 'BUY' | 'HOLD' | 'SELL'
  confidence: number
  score: number
  lastPrice: number
  reasons: string[]
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

      // Build consensus entries from available engine outputs
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
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 6 }}>Circuit Market Desk</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        Aggregate AI intelligence from top open-source finance engines into one explainable analyst workspace.
      </p>

      <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 12, marginBottom: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Watchlist (comma separated)</label>
        <textarea
          value={watchlistText}
          onChange={(e) => setWatchlistText(e.target.value)}
          rows={2}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={onAnalyze} disabled={loading} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: '#111', color: '#fff' }}>
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
          {asOf && <span style={{ color: '#666' }}>As of: {new Date(asOf).toLocaleString()}</span>}
          {regime !== null && <span style={{ color: '#666' }}>Regime score: {regime}</span>}
        </div>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Signal Cards</h2>
        {signals.length === 0 ? (
          <p style={{ color: '#666' }}>Run analysis to generate signal cards.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 }}>
            {signals.map((s) => (
              <article key={s.symbol} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>{s.symbol}</h3>
                  <span style={{ fontWeight: 700, color: s.decision === 'BUY' ? 'green' : s.decision === 'SELL' ? 'crimson' : '#333' }}>{s.decision}</span>
                </div>
                <p style={{ margin: '8px 0 4px' }}>Price: ${s.lastPrice}</p>
                <p style={{ margin: '4px 0' }}>Confidence: {(s.confidence * 100).toFixed(0)}%</p>
                <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                  {s.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                {s.aiExplanation && (
                  <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 8, whiteSpace: 'pre-wrap' }}>
                    <b>Gemini note:</b>
                    <div>{s.aiExplanation}</div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Consensus View</h2>
        {consensus.length === 0 ? (
          <p style={{ color: '#666' }}>Consensus appears when engine outputs are ingested.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {consensus.map((c) => (
              <article key={c.ticker} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>{c.ticker}</h3>
                <p><b>{c.direction.toUpperCase()}</b> {c.conflict_flag ? '⚠ conflict' : ''}</p>
                <p>Agreement: {(c.agreement_score * 100).toFixed(0)}%</p>
                <p>Confidence: {(c.confidence_score * 100).toFixed(0)}%</p>
                <p>Freshness: {(c.freshness_score * 100).toFixed(0)}%</p>
                <p style={{ color: '#555' }}>{c.rationale}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Daily Brief</h2>
        {brief ? (
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', border: '1px solid #eee', padding: 12, borderRadius: 8 }}>{brief}</pre>
        ) : (
          <p style={{ color: '#666' }}>No brief yet. Run analysis first.</p>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Why this is different</h2>
        <ul>
          <li><b>Aggregation layer:</b> combines top OSS finance engines into one desk.</li>
          <li><b>Decision-first:</b> clear directional calls with confidence and rationale.</li>
          <li><b>Consensus + conflict:</b> disagreement is surfaced as an insight, not hidden.</li>
          <li><b>Analyst workstation:</b> practical workflows, no auto-trading hype.</li>
        </ul>
      </section>
    </main>
  )
}
