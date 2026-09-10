'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [{ href: '/', label: 'Home' }, { href: '/desk', label: 'Research desk' }, { href: '/learn', label: 'How it works' }]

export function SiteNav() {
  const pathname = usePathname()
  return <header className="site-nav">
    <Link href="/" className="site-brand" aria-label="Market Desk home"><span>CD</span><strong>Market Desk</strong></Link>
    <nav aria-label="Primary navigation">{links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</Link>)}</nav>
    <Link href="/login" className="site-signin">Sign in</Link>
  </header>
}
