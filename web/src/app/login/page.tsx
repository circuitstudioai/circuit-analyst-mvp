'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BetaAccess } from '../BetaAccess'
import styles from '../page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const ignore = useCallback(() => undefined, [])
  useEffect(() => { if (token) router.replace('/desk') }, [router, token])
  return <main className={styles.loginPage}><section><p className={styles.kicker}>Private beta</p><h1>Welcome to Market Desk.</h1><p>Sign in securely to save your watchlist, run research, and revisit prior work.</p><BetaAccess onToken={setToken} onLoadWatchlist={ignore} onPickSymbol={ignore} /></section></main>
}
