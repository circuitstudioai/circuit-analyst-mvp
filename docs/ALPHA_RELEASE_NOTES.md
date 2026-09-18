# Circuit Analyst private alpha

Production: `https://circuit-analyst.vercel.app`

## What is included

- Start research with a natural-language question instead of a required ticker or watchlist.
- Resolve supported company names and symbols, with choices when a name is ambiguous.
- Continue research in persistent conversations with saved runs and follow-up questions.
- Show question-specific price, risk, valuation, or comparison evidence when the underlying data supports it.
- Keep sources, freshness, uncertainty, and recovery states visible.
- Use a single sign-in handoff that preserves the question a user typed.

## Alpha limits

- Access is restricted to approved email addresses.
- Research is educational decision support, not personalized financial advice or trade execution.
- Valuation evidence appears only when the research result contains supported valuation data.
- Consensus-estimate revisions, options payoff/volatility views, and richer peer charts are deferred until their data contracts are production-ready.
- Market-data or research-provider failures may produce a clearly labelled degraded result; repeated degradation pauses new invitations.

## Release evidence

- Authenticated production smoke: passed.
- Live finance evaluation: 8/8 passed.
- Unit tests, lint, and production build: required in CI before release.
