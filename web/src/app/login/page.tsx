'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BetaAccess } from '../BetaAccess'
import styles from '../page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const ignore = useCallback(() => undefined, [])
  useEffect(() => {
    if (!token) return
    const next = new URLSearchParams(window.location.search).get('next')
    router.replace(next?.startsWith('/') && !next.startsWith('//') ? next : '/desk')
  }, [router, token])
  return <main className={styles.loginPage}><section><p className={styles.kicker}>Private alpha</p><h1>Sign in to continue.</h1><p>Your question is saved. We’ll return you to the research desk after sign-in.</p><BetaAccess onToken={setToken} onLoadWatchlist={ignore} onPickSymbol={ignore} showOnboarding={false} /></section></main>
}
