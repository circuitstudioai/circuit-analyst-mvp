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
        <p className={styles.kicker}>Circuit Market Desk</p>
        <h1>See which company updates could change your <em>investment view.</em></h1>
        <p>Market Desk reviews filings, earnings calls, market moves, and material news for the companies you follow. It shows what matters, which part of your research may need another look, and what to check next.</p>
        <div className={styles.landingActions}><Link href="/market-desk">Review important changes <span aria-hidden="true">→</span></Link><Link href="#example">See an example</Link></div>
        <div className={styles.heroFootnote}><span>Follow 5–25 companies</span><span>Keep your research current</span></div>
      </div>
      <div className={styles.heroNote} aria-label="Desk principle">
        <span>Desk principle · 01</span>
        <p>Start with the updates most likely to affect your research—not every headline published overnight.</p>
      </div>
    </section>
    <div id="example" className={styles.canvasAnchor}><LandingCanvas /></div>
    <section className={styles.storySection}>
      <div className={styles.storyIntro}>
        <p className={styles.kicker}>Keep up without starting over</p>
        <h2>Focus on the updates that could change your company research.</h2>
      </div>
      <div className={styles.storyFlow}>
        <article><span>Important changes</span><strong>See what deserves attention.</strong><p>Routine news stays out of the way. You see the updates most likely to affect a company you follow.</p><b>01</b></article>
        <article><span>Why it matters</span><strong>Know what may need another look.</strong><p>Each update points to the part of your research it supports, weakens, or leaves unchanged.</p><b>02</b></article>
        <article><span>What to watch next</span><strong>Know what could change the view.</strong><p>See the next result, event, or risk that could strengthen or weaken your research.</p><b>03</b></article>
      </div>
    </section>
    <section className={styles.decisionSection}>
      <div className={styles.decisionQuote}><span>Your reasoning stays visible</span><h2>See what you believed before the facts changed.</h2></div>
      <div className={styles.decisionCard}>
        <span>NVDA company research · Version 4</span>
        <strong>Demand remains strong.<br/>Export risk has increased.</strong>
        <p><b>What changed</b> Export constraints widened beyond the prior base case.</p>
        <p><b>Part of the research affected</b> Data-center growth can continue without a large hit from export policy.</p>
        <p><b>What to check next</b> Regional sales mix and demand for compliant products.</p>
      </div>
    </section>
    <section className={styles.landingCta}>
      <p className={styles.kicker}>Review your companies</p>
      <h2>Spend your time on the <em>changes that matter.</em></h2>
      <p>Open your morning review and start with the company research most likely to need attention.</p>
      <Link href="/market-desk">Open Market Desk <span aria-hidden="true">→</span></Link>
    </section>
  </main>
}

export default function LandingPage() {
  return isMarketDeskVnextRouteAvailable(marketDeskVnextRollout()) ? <LivingThesisLanding /> : <ResearchLanding />
}
