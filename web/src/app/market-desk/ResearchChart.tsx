'use client'

import { useEffect, useState } from 'react'
import { ChartAnnotation, ChartMode, ChartRange } from '@/lib/marketDesk'
import { ChartModel, PriceBar } from '@/lib/marketDeskChart'
import { CycleMarker } from '@/lib/marketDeskCycle'
import styles from './marketDesk.module.css'

const ranges: ChartRange[] = ['1m', '3m', '1y', '5y']

function points(bars: PriceBar[], width: number, height: number) {
  if (!bars.length) return ''
  const min = Math.min(...bars.map((bar) => bar.low))
  const max = Math.max(...bars.map((bar) => bar.high))
  const span = max - min || 1
  return bars.map((bar, index) => {
    const x = bars.length === 1 ? width / 2 : (index / (bars.length - 1)) * width
    const y = height - ((bar.close - min) / span) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

export function ResearchChart({ symbol, range, mode, markers, annotations, onRange, onMode, onMarker, onAnnotate }: {
  symbol: string
  range: ChartRange
  mode: ChartMode
  markers: CycleMarker[]
  annotations: ChartAnnotation[]
  onRange: (range: ChartRange) => void
  onMode: (mode: ChartMode) => void
  onMarker: (eventId: string) => void
  onAnnotate: (text: string) => void
}) {
  const [model, setModel] = useState<ChartModel | null>(null)
  const [note, setNote] = useState('')
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)')
    const update = () => setNarrow(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/market-desk/chart?symbol=${encodeURIComponent(symbol)}&range=${range}&chart=${mode}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: ChartModel) => {
        if (payload?.symbol && Array.isArray(payload.bars)) setModel(payload)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setModel(null)
      })
    return () => controller.abort()
  }, [symbol, range, mode])

  const displayMode = narrow && mode === 'candle' ? 'line' : mode
  const bars = model?.bars || []
  const width = 640
  const height = 180
  const line = points(bars, width, height)
  const maxVolume = Math.max(...bars.map((bar) => bar.volume), 1)
  const visibleMarkers = (model?.markers || markers).filter((marker) => marker.symbol === symbol)

  return <section className={styles.chartSection} aria-labelledby="chart-title">
    <div className={styles.sectionIntro}>
      <span>Research chart</span>
      <h2 id="chart-title">Price, volume, and evidence</h2>
      <p>This is an inspection surface for the research record. It is not a trading terminal.</p>
    </div>
    <div className={styles.chartControls}>
      <div role="group" aria-label="Chart range">{ranges.map((item) => <button key={item} type="button" aria-pressed={range === item} onClick={() => onRange(item)}>{item}</button>)}</div>
      <div role="group" aria-label="Chart display">{(['line', 'candle'] as const).map((item) => <button key={item} type="button" aria-pressed={mode === item} onClick={() => onMode(item)}>{item}</button>)}</div>
    </div>
    {narrow && mode === 'candle' ? <p className={styles.chartNote}>Candles are simplified to a line on this screen. The price table still lists each bar.</p> : null}
    {!model ? <p className={styles.chartNote}>Loading price history.</p> : <div className={styles.chartFrame}>
      <p className={styles.chartMeta}><b>{model.quality}</b> {model.currency} · {model.exchangeTimezone} · {model.adjustment.replaceAll('_', ' ')} · retrieved {model.retrievedAt.slice(0, 10)} · {model.provider}</p>
      {model.quality === 'failed' || model.quality === 'missing' ? <p className={styles.chartNote}>Price history is {model.quality}. Linked evidence remains listed below.</p> : null}
      {model.quality === 'stale' ? <p className={styles.chartNote}>The latest price is stale relative to the retrieval time.</p> : null}
      {model.quality === 'partial' ? <p className={styles.chartNote}>Adjusted history was not available, so this drawing uses unadjusted prices.</p> : null}
      {model.explainedMoves.map((move) => <p key={move} className={styles.chartNote}>{move}</p>)}
      {bars.length ? <svg viewBox={`0 0 ${width} ${height + 48}`} role="img" aria-label={`${symbol} ${displayMode} chart, ${bars.length} bars`}>
        {displayMode === 'line' ? <polyline points={line} fill="none" stroke="#245d4b" strokeWidth="3" /> : bars.map((bar, index) => {
          const min = Math.min(...bars.map((item) => item.low))
          const max = Math.max(...bars.map((item) => item.high))
          const span = max - min || 1
          const x = (index + 0.5) * (width / bars.length)
          const yHigh = height - ((bar.high - min) / span) * height
          const yLow = height - ((bar.low - min) / span) * height
          const yOpen = height - ((bar.open - min) / span) * height
          const yClose = height - ((bar.close - min) / span) * height
          return <g key={bar.date}><line x1={x} x2={x} y1={yHigh} y2={yLow} stroke="#245d4b" /><rect x={x - 2} y={Math.min(yOpen, yClose)} width="4" height={Math.max(1, Math.abs(yClose - yOpen))} fill={bar.close >= bar.open ? '#2e6d57' : '#8d3b32'} /></g>
        })}
        {bars.map((bar, index) => <rect key={`${bar.date}-volume`} x={(index / bars.length) * width} y={height + 8 + (1 - bar.volume / maxVolume) * 32} width={Math.max(1, width / bars.length - 1)} height={(bar.volume / maxVolume) * 32} fill="#c8bfa6" />)}
      </svg> : null}
      <p className={styles.chartSummary}>{model.summary.changePercent === null ? 'No price change in this range.' : `${model.summary.changePercent >= 0 ? '+' : ''}${model.summary.changePercent.toFixed(1)}% over this range.`}</p>
    </div>}
    <div className={styles.markerList}>{visibleMarkers.length ? visibleMarkers.map((marker) => <button key={marker.id} type="button" onClick={() => marker.eventId && onMarker(marker.eventId)} disabled={!marker.eventId}>{marker.date} · {marker.label}</button>) : <p>No evidence-linked markers for this company.</p>}</div>
    <details className={styles.chartTable}>
      <summary>Price and volume table</summary>
      <table>
        <caption>{symbol} adjusted price and volume. {model?.currency || 'USD'}, {model?.exchangeTimezone || 'America/New_York'}.</caption>
        <thead><tr><th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th></tr></thead>
        <tbody>{bars.map((bar) => <tr key={bar.date}><td>{bar.date}</td><td>{bar.open.toFixed(2)}</td><td>{bar.high.toFixed(2)}</td><td>{bar.low.toFixed(2)}</td><td>{bar.close.toFixed(2)}</td><td>{Math.round(bar.volume)}</td></tr>)}</tbody>
      </table>
    </details>
    <form className={styles.annotationForm} onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return; onAnnotate(note.trim()); setNote('') }}>
      <label>Note on this chart<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} /></label>
      <button type="submit" disabled={!note.trim()}>Save note</button>
      <small>Saved in this browser tab. The note stays off the shareable URL. Monitoring is not active.</small>
    </form>
    {annotations.filter((item) => item.symbol === symbol).map((item) => <p key={item.id} className={styles.chartNote}><b>Your note.</b> {item.text}</p>)}
  </section>
}
