import Link from 'next/link'
import { LandingCanvas } from './LandingCanvas'
import styles from './page.module.css'

export default function LandingPage() {
  return <main className={styles.landing}>
    <section className={styles.landingHero}>
      <div className={styles.heroCopy}>
        <p className={styles.kicker}>Circuit Market Desk</p>
        <h1>See how the evidence <em>changes</em> the story.</h1>
        <p>Market behavior tells you what moved. Company evidence tells you why. Market Desk brings both together—and shows what could still break.</p>
        <div className={styles.landingActions}><Link href="/desk">Research a company <span aria-hidden="true">→</span></Link><Link href="#example">Explore the example</Link></div>
        <div className={styles.heroFootnote}><span>Built for individual investors</span><span>No black-box score</span><span>Sources stay visible</span></div>
      </div>
      <div className={styles.heroNote} aria-label="Research note">
        <span>Desk note · 09/25</span>
        <p>“A stock tip tells you what to buy. Research tells you what must be true.”</p>
      </div>
    </section>
    <div id="example" className={styles.canvasAnchor}><LandingCanvas /></div>
    <section className={styles.storySection}>
      <div className={styles.storyIntro}>
        <p className={styles.kicker}>One question, reviewed from every side</p>
        <h2>Not another stock score.<br/>A case you can inspect.</h2>
      </div>
      <div className={styles.storyFlow}>
        <article><span>Market behavior</span><strong>What is the price already saying?</strong><p>See trend, volatility, relative strength, and the events that changed the path.</p><b>01</b></article>
        <article><span>Company evidence</span><strong>What supports—or challenges—the move?</strong><p>Connect filings, earnings commentary, and operating results to the market story.</p><b>02</b></article>
        <article><span>Decision context</span><strong>What must happen next?</strong><p>Leave with a base case, the strongest challenge, and a dated checkpoint to revisit.</p><b>03</b></article>
      </div>
    </section>
    <section className={styles.decisionSection}>
      <div className={styles.decisionQuote}><span>The useful answer is rarely “buy” or “sell.”</span><h2>It’s knowing what you believe, what the evidence says, and what would change your mind.</h2></div>
      <div className={styles.decisionCard}>
        <span>Today’s decision brief</span>
        <strong>Quality improving.<br/>Valuation less forgiving.</strong>
        <p><b>What changed</b> Gross margin expanded for a second quarter.</p>
        <p><b>What could break</b> A top customer now represents 28% of revenue.</p>
        <p><b>Revisit when</b> Q3 results arrive October 29.</p>
      </div>
    </section>
    <section className={styles.landingCta}>
      <p className={styles.kicker}>Your turn at the desk</p>
      <h2>Bring a ticker.<br/><em>Leave with a thesis.</em></h2>
      <p>Ask the question you actually care about. Market Desk will show its work.</p>
      <Link href="/desk">Start researching <span aria-hidden="true">→</span></Link>
    </section>
  </main>
}
