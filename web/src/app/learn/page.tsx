import Link from 'next/link'
import styles from '../page.module.css'

export default function LearnPage() {
  return <main className={styles.learnPage}>
    <header><p className={styles.kicker}>How it works</p><h1>A careful research process, made visible.</h1><p>Market Desk separates evidence, interpretation, and uncertainty so you can understand a company without pretending the future is certain.</p></header>
    <section className={styles.learnGrid}>
      <article><span>Market reader</span><h2>What has the price been doing?</h2><p>We compare recent price behavior with its longer history and the broader market.</p></article>
      <article><span>Evidence analyst</span><h2>What facts support the view?</h2><p>Sources and dates stay attached to evidence. Missing data remains visibly missing.</p></article>
      <article><span>Risk reviewer</span><h2>What could prove it wrong?</h2><p>The positive case is challenged with risks, conflicting signals, and a clear change condition.</p></article>
      <article><span>Decision editor</span><h2>What does it mean?</h2><p>The result becomes a plain-language research action—not a promise or personalized trading instruction.</p></article>
    </section>
    <Link className={styles.learnCta} href="/desk">Try the research desk</Link>
  </main>
}
