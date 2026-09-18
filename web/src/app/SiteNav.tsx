'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Session } from '@supabase/supabase-js'
import { getBrowserSupabase } from '@/lib/browserSupabase'

const links = [{ href: '/', label: 'Home' }, { href: '/desk', label: 'Research desk' }, { href: '/learn', label: 'How it works' }]

export function SiteNav() {
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  return <header className="site-nav">
    <Link href="/" className="site-brand" aria-label="Market Desk home"><span>CD</span><strong>Market Desk</strong></Link>
    <nav aria-label="Primary navigation">{links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</Link>)}</nav>
    {session ? <details className="site-account"><summary aria-label="Account menu">{session.user.email?.slice(0, 1).toUpperCase() || 'A'}</summary><div><span>{session.user.email}</span><button type="button" onClick={() => void getBrowserSupabase()?.auth.signOut()}>Sign out</button></div></details> : <Link href="/login" className="site-signin">Sign in</Link>}
  </header>
}
