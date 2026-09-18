'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../page.module.css'
import { AnalyzeResponse, DeskConsensus, DeskEngine, PipelineStep, RecentRun, SignalRow } from '@/lib/types'
import { BetaAccess } from '../BetaAccess'
import { evidenceWorkspace } from '@/lib/analystWorkspace'
import { contextualVisual, priceChange } from '@/lib/contextualVisual'

type CompanyChoice = {
  symbol: string
  name: string
  exchange: string
  type: string
}

type CompanyClarification = { phrase: string; choices: CompanyChoice[] }

type FeedbackDraft = {
  helpful: boolean
  reason: string
  comment: string
  state: 'editing' | 'sending' | 'saved' | 'error'
}

type FollowUp = 'summary' | 'simple' | 'risks' | 'valuation' | 'evidence' | 'change'

type ResearchThread = { id: string; title: string; symbols: string[]; updated_at: string }
type ResearchMessage = { id: number; role: 'user' | 'assistant'; content: string; runId?: number | null; createdAt?: string }
type JobProgress = { status: string; currentStage: string; completedStages: string[]; percent: number; terminal: boolean }

const followUps: Array<{ id: FollowUp; label: string }> = [
  { id: 'simple', label: 'Explain this simply' },
  { id: 'risks', label: 'What could go wrong?' },
  { id: 'valuation', label: 'Show the valuation view' },
  { id: 'evidence', label: 'Show the evidence' },
  { id: 'change', label: 'What changed?' },
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

function evidenceView(signal: SignalRow) {
  if (signal.deepAnalysis?.status === 'complete') {
    if (signal.deepAnalysis.view === 'insufficient_evidence') return 'Not enough reliable information'
    return signal.deepAnalysis.view[0].toUpperCase() + signal.deepAnalysis.view.slice(1)
  }
  if (signal.abstained) return 'Not enough reliable information'
  if (signal.decision === 'BUY') return 'Favorable'
  if (signal.decision === 'SELL') return 'Unfavorable'
  return 'Mixed'
}

function pct(value: number) {
  return `${(value * 100).toFixed(0)}%`
}

function formatList(items: string[]) {
  return items.length ? items : ['No major item flagged.']
}

function researchAction(signal: SignalRow) {
  if (signal.deepAnalysis?.status === 'complete') {
    if (signal.deepAnalysis.view === 'favorable') return 'Evidence currently leans favorable'
    if (signal.deepAnalysis.view === 'unfavorable') return 'Evidence currently leans unfavorable'
    if (signal.deepAnalysis.view === 'insufficient_evidence') return 'Wait for reliable evidence'
    return 'Evidence is mixed'
  }
  if (signal.abstained) return 'Wait for reliable evidence'
  if (signal.decision === 'BUY') return 'Keep on your watchlist'
  if (signal.decision === 'SELL') return 'Approach with caution'
  return 'Investigate before deciding'
}

export default function HomePage() {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [watchlistText, setWatchlistText] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('tickers') || ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([])
  const [error, setError] = useState<string>('')
  const [deskConsensus, setDeskConsensus] = useState<DeskConsensus[]>([])
  const [deskEngines, setDeskEngines] = useState<DeskEngine[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, FeedbackDraft>>({})
  const [generalFeedbackOpen, setGeneralFeedbackOpen] = useState(false)
  const [generalComment, setGeneralComment] = useState('')
  const [generalFeedbackState, setGeneralFeedbackState] = useState<'idle' | 'sending' | 'saved' | 'error'>('idle')
  const [clarification, setClarification] = useState<CompanyClarification | null>(null)
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState<FollowUp>('summary')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [threads, setThreads] = useState<ResearchThread[]>([])
  const [messages, setMessages] = useState<ResearchMessage[]>([])
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null)
  const openedRun = useRef<string | null>(null)

  useEffect(() => {
    const pendingQuestion = window.sessionStorage.getItem('pending-research-question')
    if (!pendingQuestion) return
    const timer = window.setTimeout(() => setQuestion(pendingQuestion), 0)
    window.sessionStorage.removeItem('pending-research-question')
    return () => window.clearTimeout(timer)
  }, [])

  const loadUserWatchlist = useCallback((symbols: string[]) => {
    setWatchlistText((current) => current || symbols.slice(0, 2).join(', '))
  }, [])

  const pickUniverseSymbol = useCallback((symbol: string) => {
    setWatchlistText((current) => {
      const symbols = [...new Set([...current.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean), symbol])]
      return symbols.slice(0, 2).join(', ')
    })
  }, [])

  const watchlist = useMemo(
    () => watchlistText.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
    [watchlistText]
  )

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
  const activeSignal = result?.signals.find((signal) => signal.symbol === activeSymbol) || result?.signals[0] || null
  const evidencePanel = activeSignal ? evidenceWorkspace(activeSignal) : null
  const activeIntent = result?.intent || activeSignal?.deepAnalysis?.intent
  const evidenceVisual = activeSignal ? contextualVisual(activeIntent, activeSignal) : null
  const resumableRunId = result?.outcome?.researchStatus !== 'complete' ? result?.saved?.runId : undefined

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

  const refreshConversations = useCallback(async (threadId?: string | null) => {
    if (!accessToken) return
    const [threadResponse, messageResponse] = await Promise.all([
      fetch('/api/conversations', { cache: 'no-store', headers: { authorization: `Bearer ${accessToken}` } }),
      threadId ? fetch(`/api/conversations?threadId=${encodeURIComponent(threadId)}`, { cache: 'no-store', headers: { authorization: `Bearer ${accessToken}` } }) : null,
    ])
    if (threadResponse.ok) {
      const data = await threadResponse.json()
      setThreads(Array.isArray(data?.threads) ? data.threads : [])
    }
    if (messageResponse?.ok) {
      const data = await messageResponse.json()
      setMessages(Array.isArray(data?.messages) ? data.messages : [])
    }
  }, [accessToken])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshConversations(conversationId) }, 0)
    return () => window.clearTimeout(timer)
  }, [conversationId, refreshConversations])

  const trackEvent = useCallback((eventName: string, fields: Record<string, unknown> = {}) => {
    if (!accessToken) return
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ eventName, ...fields }),
    })
  }, [accessToken])

  useEffect(() => {
    if (!result) return
    const runKey = String(result.saved?.runId || result.shareId)
    if (openedRun.current === runKey) return
    openedRun.current = runKey
    trackEvent('report_opened', {
      runId: result.saved?.runId,
      properties: { symbolCount: result.signals.length, cached: Boolean(result.cached) },
    })
  }, [result, trackEvent])

  async function runAnalysis(symbols: string[] = [], resumeRunId?: number, askedQuestion = question) {
    if (!accessToken) {
      if (askedQuestion.trim()) window.sessionStorage.setItem('pending-research-question', askedQuestion.trim())
      router.push('/login?next=/desk')
      return
    }
    setLoading(true)
    setJobProgress({ status: 'queued', currentStage: 'queued', completedStages: [], percent: 0, terminal: false })
    setError('')
    setClarification(null)
    try {
      const res = await fetch('/api/analysis-jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ watchlist: symbols, question: askedQuestion, resumeRunId, threadId: conversationId }),
      })
      const queued = await res.json()
      if (res.status === 409 && queued?.resolution?.status === 'ambiguous') {
        setClarification({ phrase: queued.resolution.phrase, choices: queued.resolution.choices })
        return
      }
      if (!res.ok) throw new Error(queued?.error || 'Could not start research.')
      const resolvedSymbols = Array.isArray(queued.symbols) ? queued.symbols : symbols
      if (resolvedSymbols.length) setWatchlistText(resolvedSymbols.join(', '))
      let data: AnalyzeResponse | null = null
      for (let attempt = 0; attempt < 360; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000))
        const poll = await fetch(`/api/analysis-jobs?id=${encodeURIComponent(queued.jobId)}`, {
          cache: 'no-store', headers: { authorization: `Bearer ${accessToken}` },
        })
        const snapshot = await poll.json()
        if (!poll.ok) throw new Error(snapshot?.error || 'Could not read analysis progress')
        setJobProgress(snapshot.job.progress)
        if (!snapshot.job.progress.terminal) continue
        if (snapshot.job.progress.status === 'failed') throw new Error(snapshot.job.error || 'Analyze failed')
        data = snapshot.job.result as AnalyzeResponse
        break
      }
      if (!data) throw new Error('Analysis timed out. You can safely try again.')
      setResult(data)
      setQuestion(askedQuestion)
      if (data.conversationId) setConversationId(data.conversationId)
      setActiveSymbol(data.signals?.[0]?.symbol || null)
      setFollowUp('summary')
      const runId = Number(data?.saved?.runId)
      if (runId) {
        const deskResponse = await fetch(`/api/desk?runId=${runId}`, {
          cache: 'no-store', headers: { authorization: `Bearer ${accessToken}` },
        })
        if (deskResponse.ok) {
          const desk = await deskResponse.json()
          setDeskConsensus(Array.isArray(desk?.consensus) ? desk.consensus : [])
          setDeskEngines(Array.isArray(desk?.engines) ? desk.engines : [])
        }
      }
      void fetch('/api/me', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ symbols }),
      })
      void fetchRecentRuns()
      void refreshConversations(data.conversationId)
      const url = new URL(window.location.href)
      if (data.watchlist.length) url.searchParams.set('tickers', data.watchlist.join(','))
      window.history.replaceState(null, '', url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function askFollowUp() {
    const next = followUpQuestion.replace(/\s+/g, ' ').trim()
    if (!next) return
    setFollowUpQuestion('')
    await runAnalysis(result?.watchlist || watchlist, undefined, next)
  }

  async function openConversation(thread: ResearchThread) {
    setConversationId(thread.id)
    setWatchlistText(thread.symbols.join(', '))
    setResult(null)
    setMessages([])
  }

  function newConversation() {
    setConversationId(null)
    setMessages([])
    setResult(null)
    setFollowUp('summary')
    setQuestion('')
    setClarification(null)
    setError('')
  }

  function beginFeedback(signal: SignalRow, helpful: boolean) {
    setFeedback((current) => ({
      ...current,
      [signal.symbol]: { helpful, reason: helpful ? 'actionable' : 'unclear', comment: '', state: 'editing' },
    }))
  }

  async function submitFeedback(signal: SignalRow) {
    if (!accessToken) return
    const draft = feedback[signal.symbol]
    if (!draft) return
    setFeedback((current) => ({ ...current, [signal.symbol]: { ...draft, state: 'sending' } }))
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        runId: result?.saved?.runId,
        symbol: signal.symbol,
        helpful: draft.helpful,
        reason: draft.reason,
        comment: draft.comment,
      }),
    })
    setFeedback((current) => ({
      ...current,
      [signal.symbol]: { ...draft, state: response.ok ? 'saved' : 'error' },
    }))
  }

  async function submitGeneralFeedback() {
    if (!accessToken || !generalComment.trim()) return
    setGeneralFeedbackState('sending')
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        eventName: 'beta_feedback_sent',
        properties: { source: 'persistent_feedback', comment: generalComment.trim().slice(0, 1000) },
      }),
    })
    setGeneralFeedbackState(response.ok ? 'saved' : 'error')
    if (response.ok) setGeneralComment('')
  }

  function copyReport() {
    if (!result) return
    const lines = result.signals.map((s) => {
      return `${s.symbol}: ${verdict(s)} / ${pct(s.confidence)} confidence\n${s.thesis}\nInvalidation: ${s.invalidation}\nNext: ${s.nextAction}`
    })
    void navigator.clipboard.writeText(lines.join('\n\n'))
    trackEvent('decision_brief_used', {
      runId: result.saved?.runId,
      properties: { source: 'copy_report', symbolCount: result.signals.length },
    })
  }

  return (
    <main className={styles.desk}>
      <section className={styles.workspaceShell}>
        <aside className={styles.conversationRail} aria-label="Research conversations">
          <BetaAccess
            onToken={setAccessToken}
            onLoadWatchlist={loadUserWatchlist}
            onPickSymbol={pickUniverseSymbol}
            compact
          />
          <div className={styles.railHeading}>
            <div><p className={styles.kicker}>Saved work</p><strong>Recent research</strong></div>
            <button type="button" onClick={newConversation} disabled={!accessToken} aria-label="Start a new conversation">+</button>
          </div>
          <p className={styles.railIntro}>Open a previous question or start a new one.</p>
          <nav className={styles.threadList} aria-label="Saved research conversations">
            {threads.length ? threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={thread.id === conversationId ? styles.activeThread : undefined}
                onClick={() => void openConversation(thread)}
              >
                <span>{thread.symbols.join(' · ') || 'Research'}</span>
                <strong>{thread.title}</strong>
                <small>{new Date(thread.updated_at).toLocaleDateString()}</small>
              </button>
            )) : <div className={styles.emptyRail}><strong>No saved threads yet</strong><span>Your first question starts one.</span></div>}
          </nav>
          <div className={styles.railStatus}><i className={accessToken ? styles.statusLive : undefined}/><span>{accessToken ? 'Ready' : 'Saved research appears here'}</span></div>
        </aside>

        <section className={styles.conversation} aria-live="polite">
        <div className={styles.conversationHeader}>
          <div><span>{conversationId ? 'Saved research' : 'New question'}</span><strong>{activeSignal ? `${activeSignal.symbol} research` : 'What do you want to understand?'}</strong></div>
          {result?.asOf && <time dateTime={result.asOf}>Updated {new Date(result.asOf).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>}
        </div>
        {messages.length > 0 && (
          <div className={styles.transcript} aria-label="Conversation history">
            {messages.map((message) => <div key={message.id} className={message.role === 'user' ? styles.userMessage : styles.analystMessage}><span>{message.role === 'user' ? 'You' : 'Circuit'}</span><p>{message.content}</p></div>)}
          </div>
        )}
        <ResearchJourney loading={loading} result={result} progress={jobProgress} />
        {!activeSignal && !loading ? (
          <section className={styles.questionCard}>
            <div className={styles.questionCardIntro}>
              <span className={styles.assistantMark}>C</span>
              <div><h1>Ask about a company.</h1><p>Start with the decision or concern you have. Include a company name or ticker.</p></div>
            </div>
            <form className={styles.primaryComposer} onSubmit={(event) => { event.preventDefault(); void runAnalysis() }}>
              <label htmlFor="research-question">Your question</label>
              <textarea
                id="research-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={5}
                placeholder="What are Nvidia’s biggest risks?"
                maxLength={500}
                autoFocus
              />
              <div><span>Try “Compare AMD and Intel after earnings.”</span><button type="submit" disabled={loading || !question.trim()}>{loading ? 'Researching…' : 'Start research'}</button></div>
            </form>
            {clarification && (
              <div className={styles.clarification} role="group" aria-label={`Choose ${clarification.phrase}`}>
                <strong>Which {clarification.phrase} did you mean?</strong>
                <p>Choose a company and I’ll continue with your question.</p>
                <div>{clarification.choices.map((choice) => (
                  <button key={`${choice.symbol}-${choice.exchange}`} type="button" onClick={() => void runAnalysis([choice.symbol])}>
                    <b>{choice.symbol}</b><span>{choice.name}</span><small>{choice.exchange}</small>
                  </button>
                ))}</div>
              </div>
            )}
            {error && <p className={styles.error}>{error}</p>}
          </section>
        ) : activeSignal ? (
          <>
            {result && result.signals.length > 1 && (
              <div className={styles.companyTabs} aria-label="Analyzed companies">
                {result.signals.map((signal) => (
                  <button key={signal.symbol} className={signal.symbol === activeSignal.symbol ? styles.activeCompany : undefined} onClick={() => { setActiveSymbol(signal.symbol); setFollowUp('summary') }}>
                    {signal.symbol}
                  </button>
                ))}
              </div>
            )}
            <article className={styles.answerCard}>
              {result?.outcome && (
                <div className={`${styles.outcomeBanner} ${styles[`outcome_${result.outcome.researchStatus}`]}`}>
                  <strong>{result.outcome.researchStatus === 'complete' ? `Research complete · ${activeSignal.deepAnalysis?.sources.length || 0} sources` : result.outcome.researchStatus === 'partial' ? 'Some research is unavailable' : 'Price and trend data only'}</strong>
                  <span>{result.outcome.researchStatus === 'complete' ? 'Sources and counterarguments were checked.' : result.outcome.error || 'Part of the research could not be completed.'}</span>
                </div>
              )}
              {resumableRunId && result && (
                <button className={styles.resumeButton} type="button" disabled={loading} onClick={() => runAnalysis(result.watchlist, resumableRunId)}>
                  {loading ? 'Resuming research…' : 'Resume failed research stages'}
                </button>
              )}
              <div className={styles.answerLead}>
                <span className={styles.assistantMark}>C</span>
                <div>
                  <p className={styles.kicker}>Current view</p>
                  <h2>{researchAction(activeSignal)}</h2>
                </div>
                <span className={styles.viewBadge}>{evidenceView(activeSignal)}</span>
              </div>

              <div className={styles.decisionSentence}>
                <strong>{activeSignal.symbol} looks {evidenceView(activeSignal).toLowerCase()}.</strong>
                <span>Confidence is {activeSignal.deepAnalysis?.status === 'complete' ? activeSignal.deepAnalysis.confidence : activeSignal.confidence >= .75 ? 'high' : activeSignal.confidence >= .5 ? 'medium' : 'low'}. <InfoTip label="What confidence means" text="Confidence reflects how complete and consistent the available evidence is. It is not a prediction of future returns." /></span>
              </div>

              {followUp === 'summary' && activeSignal.deepAnalysis?.status === 'complete' && <DeepResearchBrief signal={activeSignal} />}
              {followUp === 'summary' && activeSignal.deepAnalysis?.status !== 'complete' && <>
                <div className={styles.fallbackNotice}><strong>Limited result</strong><span>Company research was unavailable, so this answer uses price and trend data only.</span></div>
                <p className={styles.answerText}>{activeSignal.aiExplanation || activeSignal.thesis}</p>
                <div className={styles.answerGrid}>
                  <div><span>Why <InfoTip label="How the recent trend is measured" text="We compare the stock’s average price over about one month with its average over about five months. Exact values remain in Advanced evidence." /></span><p>{activeSignal.reasons[0] || activeSignal.thesis}</p></div>
                  <div><span>What could change this</span><p>{activeSignal.invalidation}</p></div>
                  <div><span>What to do next</span><p>{activeSignal.nextAction}</p></div>
                </div>
                <PriceJourney signal={activeSignal} />
                <div className={styles.debateGrid}>
                  <section><span className={styles.debateLabel}>Positive case</span><ul>{formatList(activeSignal.bullCase).slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></section>
                  <section><span className={styles.debateLabel}>Challenge</span><ul>{formatList([...activeSignal.riskFlags, ...activeSignal.bearCase]).slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></section>
                </div>
                <EvidenceBalance signal={activeSignal} />
              </>}
              {followUp === 'simple' && <div className={styles.followUpAnswer}><strong>In simple terms</strong><p>{activeSignal.thesis}</p><p>This is a research signal, not a prediction or instruction to trade.</p></div>}
              {followUp === 'risks' && <div className={styles.followUpAnswer}><strong>The main things that could go wrong</strong><ul>{formatList([...activeSignal.riskFlags, ...activeSignal.bearCase]).slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></div>}
              {followUp === 'valuation' && <div className={styles.followUpAnswer}><strong>Valuation view</strong><p>The detailed valuation engine uses visible bear, base, and bull assumptions when SEC fundamentals are available.</p><p>Open Advanced evidence below to inspect the assumptions and calculations. If the data is incomplete, Market Desk abstains.</p></div>}
              {followUp === 'evidence' && <div className={styles.followUpAnswer}><strong>Evidence used</strong><ul>{activeSignal.evidence.map((item) => <li key={`${item.label}-${item.detail}`}><b>{item.label}:</b> {item.detail}</li>)}</ul><small>Market data as of {activeSignal.dataAsOf || 'unavailable'}.</small></div>}
              {followUp === 'change' && <div className={styles.followUpAnswer}><strong>Change since the prior run</strong><p>{previousRun ? `The prior saved run was ${new Date(previousRun.as_of).toLocaleDateString()}. Open Advanced evidence for the detailed comparison.` : 'A reliable comparison will appear after this company has at least two saved runs.'}</p></div>}

              <div className={styles.followUpRow}>
                {followUps.map((item) => <button key={item.id} aria-pressed={followUp === item.id} onClick={() => setFollowUp(item.id)}>{item.label}</button>)}
                {followUp !== 'summary' && <button onClick={() => setFollowUp('summary')}>Back to summary</button>}
              </div>
              <form className={styles.followUpComposer} onSubmit={(event) => { event.preventDefault(); void askFollowUp() }}>
                <label htmlFor="follow-up-question">Continue the conversation</label>
                <div><input id="follow-up-question" value={followUpQuestion} onChange={(event) => setFollowUpQuestion(event.target.value)} placeholder={`Ask a follow-up about ${activeSignal.symbol}…`} maxLength={500}/><button type="submit" disabled={loading || !followUpQuestion.trim()}>{loading ? 'Thinking…' : 'Ask'}</button></div>
                <small>I’ll keep the prior questions and answers in context, then verify new factual claims.</small>
              </form>
              <p className={styles.answerCaveat}>Educational research support only. The evidence can be incomplete or wrong; verify it before making financial decisions.</p>
            </article>
          </>
        ) : null}
        </section>

        <aside className={styles.evidenceRail} aria-label="Evidence for this answer">
          <div className={styles.railHeading}>
            <div><p className={styles.kicker}>For this answer</p><strong>Evidence</strong></div>
            {evidencePanel && <span className={styles.evidenceTicker}>{evidencePanel.symbol}</span>}
          </div>
          {evidencePanel && activeSignal ? (
            <>
              <div className={styles.evidenceVitals}>
                <div><span>Mode</span><strong>{evidencePanel.researchMode}</strong></div>
                <div><span>Confidence</span><strong>{evidencePanel.confidence}</strong></div>
                <div><span>Freshness</span><strong>{evidencePanel.freshness}</strong></div>
              </div>
              {evidenceVisual && <ContextualEvidenceVisual visual={evidenceVisual} signal={activeSignal} signals={result?.signals || [activeSignal]} />}
              <section className={styles.railSection}>
                <div className={styles.railSectionTitle}><strong>Source file</strong><span>{evidencePanel.sourceCount}</span></div>
                {evidencePanel.sources.length ? evidencePanel.sources.slice(0, 5).map((source, index) => (
                  <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer">
                    <i>{String(index + 1).padStart(2, '0')}</i><span><strong>{source.title}</strong><small>{source.publishedAt}</small></span>
                  </a>
                )) : <p className={styles.railEmpty}>No external sources are attached to this technical snapshot.</p>}
              </section>
              <section className={styles.railSection}>
                <div className={styles.railSectionTitle}><strong>Evidence signals</strong><span>{evidencePanel.evidence.length}</span></div>
                {evidencePanel.evidence.slice(0, 4).map((item) => (
                  <button key={`${item.label}-${item.detail}`} type="button" onClick={() => setFollowUp('evidence')}>
                    <span><strong>{item.label}</strong><small>{item.detail}</small></span><b>↗</b>
                  </button>
                ))}
              </section>
              <div className={styles.railPrompts}>
                <button type="button" onClick={() => setFollowUp('risks')}>Challenge this view</button>
                <button type="button" onClick={() => setFollowUp('change')}>What changed?</button>
              </div>
            </>
          ) : (
            <div className={styles.emptyEvidence}>
              <span>⌁</span><strong>Sources and charts appear here</strong><p>Ask a question to see the data and sources used in the answer.</p>
            </div>
          )}
        </aside>
      </section>

      <details className={styles.advancedDesk}>
        <summary>Advanced evidence and system details</summary>

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
            <p className={styles.kicker}>Ranked results</p>
            <strong>{result ? `${topSetups.length} shown` : 'No research yet'}</strong>
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
            <p className={styles.kicker}>Saved runs</p>
            <strong>{visibleRuns.length ? `${visibleRuns.length} saved` : 'None saved'}</strong>
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
            <p>No saved runs are available.</p>
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
            <p className={styles.kicker}>Model comparison</p>
            <h2>{deskConsensus.length ? `${deskConsensus.length} combined views` : 'No model comparison yet'}</h2>
          </div>
          <span className={styles.meta}>{deskEngines.length} engine outputs</span>
        </div>
        {deskConsensus.length ? (
          <div className={styles.consensusGrid}>
            {deskConsensus.map((view) => (
              <article key={view.ticker} className={styles.consensusCard}>
                <div className={styles.cardHeader}>
                  <div><span className={styles.symbol}>{view.ticker}</span><h3>{view.direction}</h3></div>
                  <span className={styles.score}>{Math.round(view.agreement_score * 100)}% align</span>
                </div>
                <p className={styles.thesis}>{view.rationale}</p>
                <div className={styles.engineStrip}>
                  {deskEngines.filter((engine) => engine.ticker === view.ticker).map((engine) => (
                    <span key={engine.engine_name}><strong>{engine.engine_name.replaceAll('_', ' ')}</strong>{engine.direction} · {engine.confidence}%</span>
                  ))}
                </div>
                <div className={styles.categoryGrid}>
                  {(view.category_consensus || []).map((category) => (
                    <span key={category.category} className={category.conflict_flag ? styles.categoryConflict : undefined}>
                      <strong>{category.category}</strong>{category.direction} · {Math.round(category.agreement_score * 100)}%
                    </span>
                  ))}
                </div>
                <div className={styles.callout}><strong>Next action</strong><span>{view.next_action}</span></div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}><strong>No comparison available.</strong><span>This section needs results from at least two independent models for the same company.</span></div>
        )}
      </section>

      <section className={styles.results}>
        <div className={styles.resultHeader}>
          <div>
            <p className={styles.kicker}>Detailed results</p>
            <h2>{result ? `${result.signals.length} ${result.signals.length === 1 ? 'company' : 'companies'}` : 'Ask a question to begin'}</h2>
          </div>
          <div className={styles.actions}>
            {result?.asOf && <span className={styles.meta}>As of {new Date(result.asOf).toLocaleString()}</span>}
            {result?.cached && <span className={`${styles.meta} ${styles.cachedMeta}`}>Unchanged cached run</span>}
            {result && <span className={styles.meta}>Regime {result.regimeScore}</span>}
            {result && <button onClick={copyReport} className={styles.secondaryButton}>Copy report</button>}
          </div>
        </div>

        {!result ? (
          <div className={styles.empty}>
            <strong>No detailed results yet.</strong>
            <span>Ask about a supported public company to see the underlying scores and evidence.</span>
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

                <div className={styles.dataTape}>
                  <span>Daily close · {signal.dataAsOf || 'unavailable'}</span>
                  <span className={signal.marketDataStatus === 'live' ? styles.liveData : styles.fallbackData}>
                    {signal.marketDataStatus === 'live' ? 'Live provider data' : 'Data unavailable'}
                  </span>
                  <span className={signal.aiStatus === 'complete' || signal.aiStatus === 'cached' ? styles.aiReady : styles.aiFallback}>
                    {signal.aiStatus === 'complete' ? 'AI note generated' : signal.aiStatus === 'cached' ? 'AI note cached' : 'Deterministic only'}
                  </span>
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

                {signal.aiExplanation
                  ? <pre className={styles.aiNote}>{signal.aiExplanation}</pre>
                  : <p className={styles.aiUnavailable}>AI enrichment unavailable{signal.aiErrorCode ? ` (${signal.aiErrorCode})` : ''}. The rule-based analysis above remains complete.</p>}
                <div className={styles.feedbackRow}>
                  <span>{feedback[signal.symbol]?.state === 'saved' ? 'Feedback saved—thank you.' : 'Useful for your decision?'}</span>
                  {feedback[signal.symbol]?.state !== 'saved' && <>
                    <button type="button" onClick={() => beginFeedback(signal, true)} aria-pressed={feedback[signal.symbol]?.helpful === true}>Yes</button>
                    <button type="button" onClick={() => beginFeedback(signal, false)} aria-pressed={feedback[signal.symbol]?.helpful === false}>No</button>
                  </>}
                </div>
                {feedback[signal.symbol]?.state !== 'saved' && feedback[signal.symbol] && (
                  <div className={styles.feedbackDetail}>
                    <label>
                      {feedback[signal.symbol].helpful ? 'What helped most?' : 'What was missing or unclear?'}
                      <select
                        value={feedback[signal.symbol].reason}
                        onChange={(event) => setFeedback((current) => ({ ...current, [signal.symbol]: { ...current[signal.symbol], reason: event.target.value } }))}
                      >
                        {feedback[signal.symbol].helpful ? <>
                          <option value="actionable">Clear next action</option>
                          <option value="other">Evidence, risk, or invalidation</option>
                        </> : <>
                          <option value="unclear">Unclear</option>
                          <option value="too_generic">Too generic</option>
                          <option value="wrong_data">Data looks wrong</option>
                          <option value="missing_catalyst">Missing catalyst</option>
                          <option value="other">Other</option>
                        </>}
                      </select>
                    </label>
                    <textarea
                      value={feedback[signal.symbol].comment}
                      onChange={(event) => setFeedback((current) => ({ ...current, [signal.symbol]: { ...current[signal.symbol], comment: event.target.value } }))}
                      placeholder="Optional context"
                      maxLength={1000}
                      rows={2}
                    />
                    <button type="button" onClick={() => submitFeedback(signal)} disabled={feedback[signal.symbol].state === 'sending'}>
                      {feedback[signal.symbol].state === 'sending' ? 'Sending…' : 'Send feedback'}
                    </button>
                    {feedback[signal.symbol].state === 'error' && <small>Could not save. Try again.</small>}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      </details>

      {accessToken && (
        <button type="button" className={styles.feedbackLauncher} onClick={() => setGeneralFeedbackOpen(true)}>
          Send beta feedback
        </button>
      )}
      {generalFeedbackOpen && (
        <div className={styles.feedbackModalBackdrop} role="dialog" aria-modal="true" aria-labelledby="beta-feedback-title">
          <div className={styles.feedbackModal}>
            <button type="button" className={styles.modalClose} onClick={() => { setGeneralFeedbackOpen(false); setGeneralFeedbackState('idle') }} aria-label="Close feedback">×</button>
            <p className={styles.kicker}>Beta line</p>
            <h2 id="beta-feedback-title">Tell us what worked or failed.</h2>
            <p>Share bugs, confusing language, missing context, or anything that saved you time.</p>
            <textarea value={generalComment} onChange={(event) => setGeneralComment(event.target.value)} maxLength={1000} rows={5} placeholder="What happened?" />
            <button type="button" onClick={submitGeneralFeedback} disabled={!generalComment.trim() || generalFeedbackState === 'sending'}>
              {generalFeedbackState === 'sending' ? 'Sending…' : generalFeedbackState === 'saved' ? 'Feedback saved' : 'Send to the product team'}
            </button>
            {generalFeedbackState === 'error' && <small>Could not save. Try again.</small>}
          </div>
        </div>
      )}

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

function ResearchJourney({ loading, result, progress }: { loading: boolean; result: AnalyzeResponse | null; progress: JobProgress | null }) {
  const stages = [
    ['Market data', 'Gathering current price history', null],
    ['Company research', 'Checking filings, results, and company context', 'research'],
    ['Risks', 'Checking what could weaken the case', 'challenge'],
    ['Answer', 'Summarizing the evidence in plain English', 'synthesis'],
  ] as const
  if (!loading && !result) return null
  const progressIndex = progress?.currentStage === 'market_data' ? 0
    : progress?.currentStage === 'evidence' || progress?.currentStage === 'research' ? 1
      : progress?.currentStage === 'challenge' ? 2
        : progress?.currentStage === 'synthesis' || progress?.currentStage === 'verification' ? 3 : 0
  const displayedActive = !loading && result ? stages.length : progressIndex
  const researchComplete = result?.outcome?.researchStatus === 'complete'
  const actualDetail = (name: string, fallback: string) => {
    const label = name === 'Market data' ? 'Public price fetch' : name === 'Company research' ? 'Research evidence' : name === 'Answer' ? 'AI summary' : 'Rule scoring'
    return result?.pipeline.find((step) => step.label === label)?.detail || fallback
  }
  return (
    <section className={styles.journey} aria-label="Research progress">
      <div className={styles.journeyHeader}><div><p className={styles.kicker}>Research progress</p><h2>{loading ? 'Checking the evidence…' : researchComplete ? 'Research complete' : 'Some research is unavailable'}</h2></div><span>{loading && progress ? `${progress.percent}%` : `${Math.max(displayedActive, 1)}/${stages.length}`}</span></div>
      <ol>
        {stages.map(([name, detail, checkpointName], index) => {
          const checkpoint = checkpointName ? result?.signals[0]?.deepAnalysis?.stages?.find((stage) => stage.name === checkpointName) : undefined
          const blockedByResearch = !loading && Boolean(result) && !researchComplete && index >= 1
          const complete = !blockedByResearch && (!loading || index < displayedActive)
          const working = loading && index === displayedActive
          const checkpointFailed = checkpoint?.status === 'failed'
          return <li key={name} className={complete ? styles.stageComplete : working ? styles.stageWorking : styles.stageWaiting}><i>{complete ? '✓' : working ? '•' : blockedByResearch || checkpointFailed ? '!' : index + 1}</i><div><strong>{name}</strong><span>{complete ? actualDetail(name, detail) : blockedByResearch ? result?.outcome?.error || 'Research provider unavailable' : detail}</span></div><small>{complete ? checkpoint?.resumed ? 'Resumed' : 'Complete' : working ? 'Working' : blockedByResearch || checkpointFailed ? 'Unavailable' : 'Waiting'}</small></li>
        })}
      </ol>
    </section>
  )
}

function ContextualEvidenceVisual({ visual, signal, signals }: {
  visual: ReturnType<typeof contextualVisual>
  signal: SignalRow
  signals: SignalRow[]
}) {
  if (visual.kind === 'price') return <PriceJourney signal={signal} compact title={visual.title} />
  if (visual.kind === 'risk') {
    const total = Math.max(1, visual.favorable + visual.caution + visual.uncertain)
    return <section className={styles.contextVisual} aria-label="Balance of the case and risks">
      <div className={styles.contextVisualHeader}><span>Question focus</span><strong>{visual.title}</strong></div>
      <div className={styles.riskTotals}><b>{visual.favorable}<small>supporting</small></b><b>{visual.caution}<small>caution</small></b><b>{visual.uncertain}<small>uncertain</small></b></div>
      <div className={styles.balanceBar} aria-hidden="true"><i className={styles.favorableBar} style={{ width: `${visual.favorable / total * 100}%` }}/><i className={styles.cautionBar} style={{ width: `${visual.caution / total * 100}%` }}/><i className={styles.uncertainBar} style={{ width: `${visual.uncertain / total * 100}%` }}/></div>
      <p>These are counts of the points shown in the report, not probabilities.</p>
    </section>
  }
  if (visual.kind === 'valuation') {
    return <section className={styles.contextVisual} aria-label="Valuation evidence">
      <div className={styles.contextVisualHeader}><span>Question focus</span><strong>{visual.title}</strong></div>
      {visual.available ? <ul>{visual.items.slice(0, 4).map((item) => <li key={`${item.label}-${item.detail}`}><strong>{item.label}</strong><span>{item.detail}</span></li>)}</ul> : <div className={styles.visualUnavailable}><strong>No reliable valuation figure in this result</strong><span>The answer will not invent a multiple, target, or consensus estimate.</span></div>}
    </section>
  }
  return <section className={styles.contextVisual} aria-label="Company comparison">
    <div className={styles.contextVisualHeader}><span>Question focus</span><strong>{visual.title}</strong></div>
    <div className={styles.comparisonRows}>{signals.map((item) => {
      const change = priceChange(item)
      const evidenceCount = item.bullCase.length + item.bearCase.length + item.riskFlags.length
      return <div key={item.symbol}><b>{item.symbol}</b><span>{change === null ? 'Price unavailable' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}% price`}</span><small>{evidenceCount} evidence points</small></div>
    })}</div>
    <p>Price changes use each company’s returned history. Evidence counts are not scores.</p>
  </section>
}

function PriceJourney({ signal, compact = false, title = 'Price journey' }: { signal: SignalRow; compact?: boolean; title?: string }) {
  const rows = signal.priceHistory || []
  if (rows.length < 2) return <div className={styles.chartEmpty}>Price journey unavailable because reliable history was not returned.</div>
  const width = 720
  const height = 210
  const values = rows.map((row) => row.close)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || 1
  const points = rows.map((row, index) => `${(index / (rows.length - 1)) * width},${height - ((row.close - min) / spread) * (height - 24) - 12}`).join(' ')
  const change = (values.at(-1)! / values[0] - 1) * 100
  return <figure className={`${styles.priceJourney} ${compact ? styles.compactPriceJourney : ''}`}><figcaption><div><span>{title}</span><strong>{rows.length} trading days</strong></div><b className={change >= 0 ? styles.positiveChange : styles.negativeChange}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</b></figcaption><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${signal.symbol} price line over ${rows.length} trading days`} preserveAspectRatio="none"><defs><linearGradient id={`fill-${signal.symbol}-${compact ? 'compact' : 'full'}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2e6d57" stopOpacity=".28"/><stop offset="1" stopColor="#2e6d57" stopOpacity="0"/></linearGradient></defs><polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#fill-${signal.symbol}-${compact ? 'compact' : 'full'})`}/><polyline points={points} fill="none" stroke="#245d4b" strokeWidth="4" vectorEffect="non-scaling-stroke"/></svg>{!compact && <p>{change >= 0 ? 'Price has risen' : 'Price has fallen'} over the period. This describes the path; it does not predict what happens next.</p>}</figure>
}

function EvidenceBalance({ signal }: { signal: SignalRow }) {
  const favorable = signal.bullCase.length
  const caution = signal.bearCase.length + signal.riskFlags.length
  const uncertain = signal.dataQuality === 'ok' ? 0 : 1
  const total = Math.max(1, favorable + caution + uncertain)
  return <section className={styles.evidenceBalance}><div><span>Evidence balance</span><strong>{favorable} favorable · {caution} caution · {uncertain} uncertain</strong></div><div className={styles.balanceBar} aria-label="Evidence balance"><i className={styles.favorableBar} style={{ width: `${favorable / total * 100}%` }}/><i className={styles.cautionBar} style={{ width: `${caution / total * 100}%` }}/><i className={styles.uncertainBar} style={{ width: `${uncertain / total * 100}%` }}/></div><p>Counts summarize the displayed evidence items; they are not probabilities.</p></section>
}

function DeepResearchBrief({ signal }: { signal: SignalRow }) {
  const report = signal.deepAnalysis!
  return <div className={styles.deepBrief}>
    <p className={styles.askedQuestion}>“{report.question}”</p>
    <p className={styles.answerText}>{report.directAnswer}</p>
    <section className={styles.distinctiveBlock}><span>What matters now</span><p>{report.distinctiveNow}</p></section>
    <div className={styles.debateGrid}>
      <section><span className={styles.debateLabel}>Strongest evidence</span><ul>{report.strongestEvidence.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><span className={styles.debateLabel}>Strongest counterargument</span><ul>{report.strongestCounterargument.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>
    <section className={styles.changeBlock}><span>What would change this view</span><ul>{report.changeConditions.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <section className={styles.sourceShelf}><span>Sources checked</span><div>{report.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}{source.publishedAt ? ` · ${source.publishedAt}` : ''}</a>)}</div></section>
  </div>
}

function InfoTip({ label, text }: { label: string; text: string }) {
  return <span className={styles.infoTip} tabIndex={0} aria-label={`${label}: ${text}`}>i<span role="tooltip">{text}</span></span>
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
