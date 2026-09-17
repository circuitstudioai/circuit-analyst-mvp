import Link from 'next/link'

export function SiteFooter() {
  return <footer className="site-footer">
    <div>
      <strong>Circuit Market Desk</strong>
      <span>Educational research support—not personalized investment advice.</span>
    </div>
    <nav aria-label="Legal and support">
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      <a href="mailto:support@circuitstudio.ai">Support</a>
    </nav>
  </footer>
}
