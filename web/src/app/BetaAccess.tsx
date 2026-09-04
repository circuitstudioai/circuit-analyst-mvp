'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { getBrowserSupabase } from '@/lib/browserSupabase'
import styles from './page.module.css'

type UniverseSymbol = { symbol: string; company_name: string; rank: number }
type Onboarding = {
  experienceLevel: 'beginner' | 'self_directed' | 'active'
  watchlistSize: '1_5' | '6_15' | '16_30' | '31_plus'
  investingHorizon: 'days' | 'weeks' | 'months' | 'years'
  primaryJob: 'screen_ideas' | 'monitor_watchlist' | 'validate_decision' | 'manage_risk'
}

const onboardingDefaults: Onboarding = {
  experienceLevel: 'self_directed',
  watchlistSize: '6_15',
  investingHorizon: 'weeks',
  primaryJob: 'monitor_watchlist',
}

export function BetaAccess({
  onToken,
  onLoadWatchlist,
  onPickSymbol,
}: {
  onToken: (token: string | null) => void
  onLoadWatchlist: (symbols: string[]) => void
  onPickSymbol: (symbol: string) => void
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'magic_link' | 'presenter'>('magic_link')
  const [message, setMessage] = useState('')
  const [universe, setUniverse] = useState<UniverseSymbol[]>([])
  const [usage, setUsage] = useState<{ analysis_count?: number; symbol_count?: number } | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [onboarding, setOnboarding] = useState<Onboarding>(onboardingDefaults)
  const [onboardingState, setOnboardingState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [cohort, setCohort] = useState<{
    exit_feedback_completed_at?: string | null
    beta_cohorts?: { name?: string; ends_on?: string } | null
  } | null>(null)
  const [exitSurvey, setExitSurvey] = useState({
    lossReaction: 'somewhat_disappointed',
    willingnessToPay: 'maybe',
  })
  const [exitSurveyState, setExitSurveyState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [authConfigured] = useState(() => Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ))

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    onToken(session?.access_token || null)
    if (!session?.access_token) return
    fetch('/api/me', { headers: { authorization: `Bearer ${session.access_token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data) return
        if (Array.isArray(data.watchlist) && data.watchlist.length) onLoadWatchlist(data.watchlist)
        setUsage(data.usage)
        setNeedsOnboarding(!data.profile?.onboarding_completed_at)
        setCohort(data.cohort || null)
      })
      .catch(() => undefined)

    const sessionKey = `market-desk-session-${new Date().toISOString().slice(0, 10)}`
    if (!window.localStorage.getItem(sessionKey)) {
      window.localStorage.setItem(sessionKey, '1')
      void fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ eventName: 'session_started' }),
      })
    }
  }, [session, onLoadWatchlist, onToken])

  useEffect(() => {
    fetch('/api/universe')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setUniverse(Array.isArray(data?.symbols) ? data.symbols.slice(0, 12) : []))
      .catch(() => setUniverse([]))
  }, [])

  async function requestMagicLink(event: FormEvent) {
    event.preventDefault()
    const supabase = getBrowserSupabase()
    if (!supabase || !email.trim()) return
    setMessage('Sending secure link…')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setMessage(error ? error.message : 'Check your inbox for the beta sign-in link.')
  }

  async function signInPresenter(event: FormEvent) {
    event.preventDefault()
    const supabase = getBrowserSupabase()
    if (!supabase || !email.trim() || !password) return
    setMessage('Signing in…')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setMessage(error ? error.message : '')
  }

  async function signOut() {
    await getBrowserSupabase()?.auth.signOut()
    setUsage(null)
  }

  async function saveOnboarding(event: FormEvent) {
    event.preventDefault()
    if (!session?.access_token) return
    setOnboardingState('saving')
    const response = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(onboarding),
    })
    if (!response.ok) {
      setOnboardingState('error')
      return
    }
    setNeedsOnboarding(false)
    setOnboardingState('idle')
  }

  async function saveExitSurvey(event: FormEvent) {
    event.preventDefault()
    if (!session?.access_token) return
    setExitSurveyState('saving')
    const response = await fetch('/api/validation/exit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(exitSurvey),
    })
    setExitSurveyState(response.ok ? 'saved' : 'error')
    if (response.ok) setCohort((current) => current ? { ...current, exit_feedback_completed_at: new Date().toISOString() } : current)
  }

  return (
    <div className={styles.betaAccess}>
      <div className={styles.betaHeader}>
        <div>
          <span className={styles.betaEyebrow}>Private beta · 50 seats</span>
          <strong>{session?.user.email || 'Sign in to run the desk'}</strong>
        </div>
        {session && <button type="button" className={styles.textButton} onClick={signOut}>Sign out</button>}
      </div>

      {!session ? (
        <form className={`${styles.authForm} ${authMode === 'presenter' ? styles.presenterAuthForm : ''}`} onSubmit={authMode === 'presenter' ? signInPresenter : requestMagicLink}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            aria-label="Email address"
          />
          {authMode === 'presenter' && (
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Demo password"
              aria-label="Demo password"
            />
          )}
          <button type="submit">{authMode === 'presenter' ? 'Sign in' : 'Email magic link'}</button>
          <button
            type="button"
            className={styles.authModeButton}
            onClick={() => { setAuthMode(authMode === 'magic_link' ? 'presenter' : 'magic_link'); setMessage('') }}
          >
            {authMode === 'magic_link' ? 'Presenter login' : 'Use magic link'}
          </button>
        </form>
      ) : (
        <div className={styles.quotaStrip}>
          <span>{usage?.analysis_count || 0}/3 runs today</span>
          <span>{usage?.symbol_count || 0}/24 symbols</span>
          <span>UTC reset</span>
        </div>
      )}
      {(message || !authConfigured) && (
        <p className={styles.authMessage}>{message || 'Beta authentication is being configured.'}</p>
      )}

      {session && cohort?.beta_cohorts && (
        <div className={styles.cohortStrip}>
          <span>Validation cohort</span>
          <strong>{cohort.beta_cohorts.name}</strong>
          {cohort.beta_cohorts.ends_on && <small>Cycle ends {new Date(`${cohort.beta_cohorts.ends_on}T00:00:00`).toLocaleDateString()}</small>}
        </div>
      )}

      <div className={styles.universeRail}>
        <span>Top universe</span>
        {universe.map((item) => (
          <button key={item.symbol} type="button" title={item.company_name} onClick={() => onPickSymbol(item.symbol)}>
            <small>{item.rank}</small>{item.symbol}
          </button>
        ))}
      </div>

      {session && needsOnboarding && (
        <div className={styles.onboardingBackdrop} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <form className={styles.onboardingCard} onSubmit={saveOnboarding}>
            <span className={styles.betaEyebrow}>Two-minute setup · 1 of 1</span>
            <h2 id="onboarding-title">Shape your decision desk.</h2>
            <p>Four quick choices help us measure whether Market Desk is genuinely useful—not just interesting.</p>

            <label>
              Your investing experience
              <select value={onboarding.experienceLevel} onChange={(event) => setOnboarding({ ...onboarding, experienceLevel: event.target.value as Onboarding['experienceLevel'] })}>
                <option value="beginner">Getting started</option>
                <option value="self_directed">Self-directed investor</option>
                <option value="active">Active investor</option>
              </select>
            </label>
            <label>
              Typical watchlist size
              <select value={onboarding.watchlistSize} onChange={(event) => setOnboarding({ ...onboarding, watchlistSize: event.target.value as Onboarding['watchlistSize'] })}>
                <option value="1_5">1–5 stocks</option>
                <option value="6_15">6–15 stocks</option>
                <option value="16_30">16–30 stocks</option>
                <option value="31_plus">31+ stocks</option>
              </select>
            </label>
            <label>
              Typical decision horizon
              <select value={onboarding.investingHorizon} onChange={(event) => setOnboarding({ ...onboarding, investingHorizon: event.target.value as Onboarding['investingHorizon'] })}>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </label>
            <label>
              Main job for Market Desk
              <select value={onboarding.primaryJob} onChange={(event) => setOnboarding({ ...onboarding, primaryJob: event.target.value as Onboarding['primaryJob'] })}>
                <option value="monitor_watchlist">Monitor my watchlist</option>
                <option value="validate_decision">Validate a decision</option>
                <option value="screen_ideas">Screen new ideas</option>
                <option value="manage_risk">Manage risk</option>
              </select>
            </label>
            <button type="submit" disabled={onboardingState === 'saving'}>
              {onboardingState === 'saving' ? 'Saving…' : 'Build my desk'}
            </button>
            {onboardingState === 'error' && <p className={styles.onboardingError}>Could not save your setup. Please try again.</p>}
          </form>
        </div>
      )}
      {session && !needsOnboarding && cohort?.beta_cohorts?.ends_on
        && new Date() > new Date(`${cohort.beta_cohorts.ends_on}T23:59:59`)
        && !cohort.exit_feedback_completed_at && exitSurveyState !== 'saved' && (
        <div className={styles.onboardingBackdrop} role="dialog" aria-modal="true" aria-labelledby="exit-survey-title">
          <form className={styles.onboardingCard} onSubmit={saveExitSurvey}>
            <span className={styles.betaEyebrow}>Two-week checkpoint</span>
            <h2 id="exit-survey-title">One honest verdict.</h2>
            <p>Your answer decides what we build next. This is product research, not a marketing survey.</p>
            <label>
              How would you feel if Market Desk disappeared?
              <select value={exitSurvey.lossReaction} onChange={(event) => setExitSurvey({ ...exitSurvey, lossReaction: event.target.value })}>
                <option value="not_disappointed">Not disappointed</option>
                <option value="somewhat_disappointed">Somewhat disappointed</option>
                <option value="very_disappointed">Very disappointed</option>
              </select>
            </label>
            <label>
              Would you pay for continued access?
              <select value={exitSurvey.willingnessToPay} onChange={(event) => setExitSurvey({ ...exitSurvey, willingnessToPay: event.target.value })}>
                <option value="no">No</option>
                <option value="maybe">Maybe</option>
                <option value="yes_10_20">Yes, $10–20/month</option>
                <option value="yes_20_plus">Yes, more than $20/month</option>
              </select>
            </label>
            <button type="submit" disabled={exitSurveyState === 'saving'}>{exitSurveyState === 'saving' ? 'Saving…' : 'Complete beta cycle'}</button>
            {exitSurveyState === 'error' && <p className={styles.onboardingError}>Could not save your response. Please try again.</p>}
          </form>
        </div>
      )}
    </div>
  )
}
