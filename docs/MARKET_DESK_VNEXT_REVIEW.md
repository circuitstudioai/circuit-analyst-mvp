# Market Desk vNext — Milestone 3 review guide

## What this build proves

This is a production-shaped, controlled-fixture prototype of the Change Inbox, Living Thesis, and Decision Room product loop. All five companies use the same runtime-validated contracts, fixture repository, ranking and diff policies, and shared interface components.

The prototype does not run unattended research, monitor live sources, persist judgments to Supabase, or send notifications. Source links and publication metadata are included to test evidence navigation; the fixture wording is a controlled product artifact and should not be treated as current investment research.

## Five-minute founder review

1. Open `/market-desk`. Confirm that the first screen prioritizes potentially belief-changing items rather than a chronological news feed.
2. Open **NVDA — The margin bridge now carries more weight**. Identify the previous assumption, new evidence, bull/bear interpretations, scenario object, and source-to-thesis trail.
3. Enter a natural-language watch condition and save **Watch this assumption**. Confirm that the UI labels monitoring as inactive.
4. Return to the inbox. Open the **COST** item and confirm it explicitly records new evidence with no thesis change.
5. Open **JPM** and confirm the Decision Room preserves operating-versus-risk disagreement rather than forcing consensus.
6. Open the **HIMS** Living Thesis and confirm the system visibly abstains where category economics are missing.
7. Open **Decision Lab** for NVDA, JPM, and HIMS. Confirm that Buy/Hold/Sell appears only as a named educational model artifact with horizon, assumptions, invalidation, freshness, and evaluation status.
8. Use **Ask the desk** or the top prototype link to confirm the existing question-first `/desk` experience remains available.
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
- Mandate changes, judgments, and watch conditions are browser-session state and are not persisted.
- “Ask the desk” opens the existing question-first system with company context; the active event/evidence bundle is not yet injected into the live agent prompt.
- No scheduled jobs, alerts, arbitrary ticker entry, portfolio advice, execution, or brokerage connections are included.
- No live claims should be made from this prototype. Live evidence collection, durable storage, idempotent updates, operational telemetry, and notification controls remain Milestone 5 work, gated by user validation.
- A formal securities-counsel review remains required before broad release of direct recommendation language, personalization, alerts, or monetization.

## Milestone 3 acceptance commands

```sh
npm --prefix web test
npm --prefix web run lint
npm --prefix web run build
git diff --check
```
