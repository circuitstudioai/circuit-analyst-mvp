import Link from 'next/link'
import { LandingCanvas } from './LandingCanvas'
import styles from './page.module.css'
import { isMarketDeskVnextRouteAvailable, marketDeskVnextRollout } from '@/lib/marketDeskRollout'

function ResearchLanding() {
  return <main className={styles.landingLegacy}>
    <section className={styles.landingLegacyHero}>
      <p className={styles.kicker}>Circuit Market Desk</p>
      <h1>See how the evidence changes the story.</h1>
      <p>A calm research assistant that checks market behavior, company evidence, and risk—then explains the result in plain English.</p>
      <div className={styles.landingActions}><Link href="/desk">Start research</Link><Link href="/learn">See how it works</Link></div>
    </section>
    <section className={styles.landingLegacySteps}>
      <article><span>01</span><strong>Ask about a company</strong><p>Search by company name or ticker. Start with one question.</p></article>
      <article><span>02</span><strong>Watch the review happen</strong><p>Market, evidence, and risk checks show honest progress.</p></article>
      <article><span>03</span><strong>Understand the decision</strong><p>Get a clear outlook, challenge, price journey, and next checkpoint.</p></article>
    </section>
  </main>
}

function LivingThesisLanding() {
  return <main className={styles.landing}>
    <section className={styles.landingHero}>
      <div className={styles.heroCopy}>
        <p className={styles.kicker}>Market Desk · Living Thesis</p>
        <h1>Know what <em>changed</em> before the story gets away from you.</h1>
        <p>Market Desk monitors the investment cases you care about, surfaces only material evidence, and shows exactly which assumption moved.</p>
        <div className={styles.landingActions}><Link href="/market-desk">Review what changed <span aria-hidden="true">→</span></Link><Link href="#example">See the morning brief</Link></div>
        <div className={styles.heroFootnote}><span>Change inbox</span><span>Living theses</span><span>Evidence lineage</span></div>
      </div>
      <div className={styles.heroNote} aria-label="Desk principle">
        <span>Desk principle · 01</span>
        <p>“Don’t send me more news. Tell me which assumption deserves another look.”</p>
      </div>
    </section>
    <div id="example" className={styles.canvasAnchor}><LandingCanvas /></div>
    <section className={styles.storySection}>
      <div className={styles.storyIntro}>
        <p className={styles.kicker}>A continuous research loop</p>
        <h2>From noisy update<br/>to a decision you can defend.</h2>
      </div>
      <div className={styles.storyFlow}>
        <article><span>Change inbox</span><strong>See what deserves attention.</strong><p>Routine updates stay quiet. Thesis changes, pressure, and disagreement rise to the top.</p><b>01</b></article>
        <article><span>Decision room</span><strong>Understand why it matters.</strong><p>Trace the evidence to the affected claim, then inspect the strongest case on either side.</p><b>02</b></article>
        <article><span>Your judgment</span><strong>Choose the next proof.</strong><p>Keep or update your view, investigate the change, or define the condition worth watching.</p><b>03</b></article>
      </div>
    </section>
    <section className={styles.decisionSection}>
      <div className={styles.decisionQuote}><span>A thesis should move when the evidence does</span><h2>Your original reasoning stays visible—even after the facts change.</h2></div>
      <div className={styles.decisionCard}>
        <span>Living thesis · NVDA · v4</span>
        <strong>Demand intact.<br/>Policy risk rising.</strong>
        <p><b>What changed</b> Export constraints widened beyond the prior base case.</p>
        <p><b>Affected claim</b> Durable data-center growth with manageable policy friction.</p>
        <p><b>Next proof</b> Revised regional mix and compliant product demand.</p>
      </div>
    </section>
    <section className={styles.landingCta}>
      <p className={styles.kicker}>Open the morning brief</p>
      <h2>Less noise.<br/><em>Better questions.</em></h2>
      <p>Start with the changes most likely to move an investment case.</p>
      <Link href="/market-desk">Enter Market Desk <span aria-hidden="true">→</span></Link>
    </section>
  </main>
}

export default function LandingPage() {
  return isMarketDeskVnextRouteAvailable(marketDeskVnextRollout()) ? <LivingThesisLanding /> : <ResearchLanding />
}
