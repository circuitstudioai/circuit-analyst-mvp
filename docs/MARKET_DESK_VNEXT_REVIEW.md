# Market Desk vNext — Milestone 3 review guide

## What this build proves

This is a production-shaped, controlled-fixture prototype of the Change Inbox, Living Thesis, and Decision Room product loop. All five companies use the same runtime-validated contracts, fixture repository, ranking and diff policies, and shared interface components.

The prototype does not run unattended research, monitor live sources, persist judgments to Supabase, or send notifications. Source links and publication metadata are included to test evidence navigation; the fixture wording is a controlled product artifact and should not be treated as current investment research.

## Five-minute founder review

1. Open `/market-desk`. Confirm that the first screen prioritizes potentially belief-changing items rather than a chronological news feed.
2. Open **NVDA — The margin bridge now carries more weight**. Identify the previous assumption, new evidence, bull/bear interpretations, scenario object, and source-to-thesis trail.
3. Enter a natural-language watch condition and save **Watch this assumption**. Confirm that the UI labels monitoring as inactive. Refresh the page and confirm the same condition is still visible. It lasts for this browser tab only.
4. Return to the inbox. Open the **COST** item and confirm it explicitly records new evidence with no thesis change.
5. Open **JPM** and confirm the Decision Room preserves operating-versus-risk disagreement rather than forcing consensus.
6. Open the **HIMS** Living Thesis and confirm the system visibly abstains where category economics are missing.
7. Open **Decision Lab** for NVDA, JPM, and HIMS. Confirm that Buy/Hold/Sell appears only as a named educational model artifact with horizon, assumptions, invalidation, freshness, and evaluation status.
8. Use **Research this change** and confirm `/desk` opens with the company, active event, affected claim, and research question prefilled.
9. Narrow the browser to a phone-width viewport and repeat the inbox → room → judgment path using keyboard navigation.

## Required integrity states represented

- Material thesis pressure: NVDA and XOM.
- New evidence with no thesis change: COST.
- Meaningful model/analyst disagreement: JPM.
- Insufficient evidence and abstention: HIMS.
- Stale evidence: XOM.
- Partial evidence: JPM.
- Failed retrieval/recovery boundary: HIMS.
- Separate user judgment and simulated watch condition: every Decision Room.

## Automated evidence

- Runtime contract validation for all five companies.
- Evidence-lineage audit for every factual thesis claim and research event.
- Deterministic thesis-version diff and materiality ranking tests.
- Generic decision-object selection tests across event types.
- Decision-language boundary tests and required model-decision metadata.
- Full existing unit/regression suite, lint, TypeScript production build, and route smoke checks.

## Known limitations and live-data boundary

- All research content and events are deterministic controlled fixtures as of the displayed fixture cutoff.
- Mandate changes, judgments, and the watch-condition text are stored in `sessionStorage` for the current browser tab. They survive refresh and in-tab navigation. They are not stored on the account, and they disappear when the tab closes.
- Company, change, thesis version, and evidence selection are restored from the `/market-desk` URL. The current thesis version is the default; earlier versions are selectable on the company view.
- The research chart loads adjusted price and volume for the five pilot companies. If the provider fails, the desk shows a failed or missing state and still lists evidence-linked markers. Chart notes saved from the page stay in this browser tab and are omitted from the URL.
- Account persistence for judgments and annotations, plus cycle runs, evidence, and markers, is server-only. Browser clients have no table policies.
- `POST /api/market-desk/cycle` runs one NVDA primary-filing evidence pass, restores the prior persisted thesis, and deduplicates by idempotency key. The latest persisted cycle is shown separately from fixture thesis content in the NVDA view. `POST /api/market-desk/monitoring` refuses activation. Alerts are not sent.
- Milestone 4 moderated sessions have not been run. The protocol is `docs/MARKET_DESK_USER_VALIDATION.md`. User-selected watchlists stay closed until the gates in that live slice are actually met.
- The global navigation remains Home / Monitor / Research / How it works when the rollout is promoted. A separate signed-in information architecture is not included.
- “Research this change” prefills the existing question-first system with the company, active event, affected claim, and why-it-matters context. The source evidence bundle is not yet passed as trusted research input, and the resulting answer does not write back to the fixture thesis.
- No scheduled jobs, alerts, arbitrary ticker entry, portfolio advice, execution, or brokerage connections are included.
- The only live research claim is the separately labeled NVDA cycle. The five-company thesis UI remains fixture-backed. Scheduled execution, broader source coverage, operational telemetry, and notification controls remain Milestone 5 work, gated by user validation.
- A formal securities-counsel review remains required before broad release of direct recommendation language, personalization, alerts, or monetization.

## Milestone 3 acceptance commands

```sh
npm --prefix web test
npm --prefix web run lint
npm --prefix web run build
git diff --check
```

## Rollout control

`MARKET_DESK_VNEXT_ROLLOUT` is the single rollout control:

- `off`: `/market-desk` returns 404 and the current Research journey remains the only promoted product.
- `preview`: `/market-desk` is available by direct link, with no homepage or primary-navigation promotion.
- `on`: Monitor appears in primary navigation and the homepage presents the Monitor → Decision Room → Research journey.

Vercel Preview and local development default to `preview`. Production defaults to
`off`, so merging the branch cannot expose the prototype unless the production
environment is explicitly changed and redeployed. Returning the variable to
`off` is the rollout kill switch.
