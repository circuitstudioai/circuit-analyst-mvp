# Question-first analyst workspace

## Product outcome

The desk starts with a research question, identifies the public companies in that
question, and presents the answer as a conversation with supporting evidence. A
watchlist remains useful after research begins, but it is not required to start.

The visual direction is editorial and research-led: the conversation is the main
surface, recent work is easy to resume, and the right rail changes to explain the
active question. Charts are evidence, not decoration.

## Alpha scope

1. One primary composer accepts natural-language questions.
2. The server resolves up to two supported equity or ETF symbols from names or
   tickers. It asks the user to choose when a name has multiple plausible matches.
3. New users can begin without configuring a watchlist. Returning users can open
   saved research from the conversation rail.
4. The workspace uses three regions on wide screens and one readable stream on
   small screens: recent research, conversation, and contextual evidence.
5. The evidence rail selects an honest view from data already returned by the
   analysis: price path, evidence balance, freshness, and cited sources.
6. Loading, ambiguity, unavailable-data, partial-research, error, signed-out,
   new-user, and returning-user states use plain language and preserve recovery.

## Request contract

The browser submits `question` as the primary input. It may include `watchlist`
when a continuing thread already has resolved symbols. For a new question without
symbols, `POST /api/analysis-jobs` resolves the question first and returns either:

- `202` with a queued job and the resolved symbols; or
- `409` with structured clarification choices when the company is ambiguous; or
- `422` when no supported public company can be identified.

Resolution is deterministic and independently testable. External symbol search is
used only at the provider boundary. The analysis engine continues to receive the
existing normalized `watchlist`, which keeps market, persistence, quota, and deep
research behavior unchanged.

## Contextual visuals

- `overview`, `change`, and `earnings` questions lead with price context when
  reliable price history exists.
- `risk` questions lead with the evidence balance and challenge items.
- `valuation` questions show available valuation evidence, but never invent a
  multiple, fair value, or consensus estimate.
- `comparison` questions show comparable evidence counts and price changes for
  the resolved companies.
- Sources and freshness remain visible for every research mode.

Consensus estimate revisions, earnings overlays, implied volatility, and options
payoff charts are deferred until their underlying data contracts exist.

## Copy standard

Use short labels, familiar finance terms, and direct descriptions of system state.
Avoid slogans, rhetorical contrasts, anthropomorphism, and claims that exceed the
available data. Every error should say what happened and what the user can do next.

## Acceptance checks

- Questions using ticker symbols, common company names, two-company comparisons,
  ambiguous names, and unsupported names have deterministic tests.
- Existing authenticated research, conversation, feedback, and saved-run flows
  continue to work.
- The new and returning-user journeys are usable at desktop and mobile widths.
- Relevant unit tests, the finance evaluation, lint, and production build pass.
- An authenticated Preview smoke is completed before review.
