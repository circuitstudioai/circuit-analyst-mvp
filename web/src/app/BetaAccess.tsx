'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { getBrowserSupabase } from '@/lib/browserSupabase'
import styles from './page.module.css'

type UniverseSymbol = { symbol: string; company_name: string; rank: number }

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
  const [message, setMessage] = useState('')
  const [universe, setUniverse] = useState<UniverseSymbol[]>([])
  const [usage, setUsage] = useState<{ analysis_count?: number; symbol_count?: number } | null>(null)
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
      })
      .catch(() => undefined)
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

  async function signOut() {
    await getBrowserSupabase()?.auth.signOut()
    setUsage(null)
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
        <form className={styles.authForm} onSubmit={requestMagicLink}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            aria-label="Email address"
          />
          <button type="submit">Email magic link</button>
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

      <div className={styles.universeRail}>
        <span>Top universe</span>
        {universe.map((item) => (
          <button key={item.symbol} type="button" title={item.company_name} onClick={() => onPickSymbol(item.symbol)}>
            <small>{item.rank}</small>{item.symbol}
          </button>
        ))}
      </div>
    </div>
  )
}
