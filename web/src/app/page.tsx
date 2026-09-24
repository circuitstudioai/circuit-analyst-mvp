import Link from 'next/link'
import styles from './page.module.css'
import { isMarketDeskVnextPromoted, marketDeskVnextRollout } from '@/lib/marketDeskRollout'

export default function LandingPage() {
  const vnextPromoted = isMarketDeskVnextPromoted(marketDeskVnextRollout())
  return <main className={styles.landing}>
    <section className={styles.landingHero}>
      <p className={styles.kicker}>Circuit Market Desk</p>
      <h1>See how the evidence changes the story.</h1>
      <p>{vnextPromoted ? 'Monitor the investment case for every company you care about, investigate material changes, and keep your judgment attached to the evidence.' : 'A calm research assistant that checks market behavior, company evidence, and risk—then explains the result in plain English.'}</p>
      <div className={styles.landingActions}>{vnextPromoted && <Link href="/market-desk">Review what changed</Link>}<Link href="/desk">Start research</Link>{!vnextPromoted && <Link href="/learn">See how it works</Link>}</div>
    </section>
    <section className={styles.landingSteps}>
      {vnextPromoted ? <>
        <article><span>01</span><strong>Monitor the thesis</strong><p>See only the evidence that may change an assumption you care about.</p></article>
        <article><span>02</span><strong>Open a decision room</strong><p>Trace what changed, why it matters, and the strongest case on each side.</p></article>
        <article><span>03</span><strong>Research and decide</strong><p>Investigate the change, record your judgment, and define the next proof.</p></article>
      </> : <>
        <article><span>01</span><strong>Ask about a company</strong><p>Search by company name or ticker. Start with one question.</p></article>
        <article><span>02</span><strong>Watch the review happen</strong><p>Market, evidence, and risk checks show honest progress.</p></article>
        <article><span>03</span><strong>Understand the decision</strong><p>Get a clear outlook, challenge, price journey, and next checkpoint.</p></article>
      </>}
    </section>
  </main>
}
