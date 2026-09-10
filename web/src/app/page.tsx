import Link from 'next/link'
import styles from './page.module.css'

export default function LandingPage() {
  return <main className={styles.landing}>
    <section className={styles.landingHero}>
      <p className={styles.kicker}>Circuit Market Desk</p>
      <h1>See how the evidence changes the story.</h1>
      <p>A calm research assistant that checks market behavior, company evidence, and risk—then explains the result in plain English.</p>
      <div className={styles.landingActions}><Link href="/desk">Open the research desk</Link><Link href="/learn">See how it works</Link></div>
    </section>
    <section className={styles.landingSteps}>
      <article><span>01</span><strong>Ask about a company</strong><p>Search by company name or ticker. Start with one question.</p></article>
      <article><span>02</span><strong>Watch the review happen</strong><p>Market, evidence, and risk checks show honest progress.</p></article>
      <article><span>03</span><strong>Understand the decision</strong><p>Get a clear outlook, challenge, price journey, and next checkpoint.</p></article>
    </section>
  </main>
}
