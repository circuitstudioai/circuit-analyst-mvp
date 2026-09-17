export default function PrivacyPage() {
  return <main className="trust-page">
    <p className="trust-kicker">Private alpha · Effective September 16, 2026</p>
    <h1>Privacy, in plain English.</h1>
    <p className="trust-lede">We collect only what is needed to operate and improve the research desk during the supervised alpha.</p>
    <section><h2>What we collect</h2><p>Your account email, onboarding answers, watchlists, research questions and results, product activity, and feedback. We also record limited provider usage and errors so we can keep the service reliable.</p></section>
    <section><h2>How we use it</h2><p>To authenticate you, produce and retain your research, enforce limits, diagnose failures, and evaluate whether the alpha is useful. We do not sell your personal information or use it to execute trades.</p></section>
    <section><h2>Third-party processing</h2><p>Supabase supports authentication and storage, Vercel hosts the application, Google Gemini supports AI research, and market-data providers supply public market information. Their handling is governed by their own terms.</p></section>
    <section><h2>Your choices</h2><p>Do not submit brokerage credentials, account numbers, or other sensitive financial information. Email <a href="mailto:support@circuitstudio.ai">support@circuitstudio.ai</a> to request access, correction, or deletion of your alpha data.</p></section>
  </main>
}
