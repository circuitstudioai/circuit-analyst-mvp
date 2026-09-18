# Circuit Market Desk web app

Next.js app for public watchlist analysis. It is designed as educational
decision-support: clear signals, evidence, risks, invalidation, and next
actions. It does not provide personalized financial advice or execute trades.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Optional integrations

- `GEMINI_API_KEY`: enables question-aware deep research.
- `GEMINI_DEEP_MODEL`: optional primary grounded-research model (defaults to `gemini-3.6-flash`).
- `GEMINI_FALLBACK_MODEL`: optional secondary Gemini model used after bounded retries on quota, timeout, network, or provider failures.
- `GEMINI_MODEL`: overrides the Gemini model (defaults to stable `gemini-3.5-flash`).
- `OPEN_SIGNUP_ENABLED`: set to `true` to let any email-verified user access the product. Removing it or setting it to `false` is the production signup kill switch.
- `ALPHA_ALLOWED_EMAILS`: optional comma/whitespace-separated access list used while open signup is paused; admins always retain access.
- `PUBLIC_APP_URL`: permanent origin used in magic-link redirects (production: `https://circuit-analyst.vercel.app`).
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: persist runs/signals.
- `CIRCUIT_JOB_SECRET` or `CRON_SECRET`: protects batch write endpoints.

## Analyst harness checkpoints

Apply `supabase.sql` before deploying checkpointed analysis. Deep research is
owned by a three-stage harness (`research`, `challenge`, `synthesis`) that saves
each completed output in `analysis_stages`. A partial run can be resumed by its
owner through the same analyze endpoint with `resumeRunId`; the server restores
the original ticker and question, skips completed stages, and retries only the
unfinished work without claiming new daily quota.

The checkpoint boundary intentionally contains ordering, recovery, and storage
policy. Gemini prompts remain domain workers inside that boundary, and the desk
only consumes the resulting stage trace and final research outcome.

## Research conversations

Authenticated analysis creates or continues an owned `research_thread` and
stores role-labelled messages. The research harness receives only the latest
bounded transcript, treats prior claims as context rather than evidence, and
must re-verify new factual claims. The desk can reopen a thread, display its
transcript, and submit natural follow-up questions while preserving the active
ticker scope.

`GET /api/conversations` lists the current user's threads. Supplying a
`threadId` query parameter returns that owned thread's messages.

The desk presents this state as a responsive analyst workspace: saved threads
on the left, the continuing analyst dialogue in the center, and a contextual
evidence rail on the right. The evidence rail follows the active company and
surfaces source freshness, confidence, price context, and clickable evidence;
on smaller screens the rails become stacked, touch-friendly sections.

## Background analysis progress

The desk queues authenticated research through `POST /api/analysis-jobs` and
polls `GET /api/analysis-jobs?id=...`. The initial response is immediate; the
job then exposes its real market-data, evidence, research, challenge,
synthesis, and verification state from durable database checkpoints. Terminal
jobs retain the full result payload so refreshing the progress request does not
rerun research or consume quota again.

The route uses Next.js `after` with a five-minute `maxDuration`. Apply the latest
Supabase migration before deployment so queued work can be owned and read only
by the authenticated user that started it.

## Validation

```bash
npm run eval:finance
npm run eval:finance:live
npm run build
npm run lint
```

`npm run eval:finance` runs the versioned finance-domain acceptance set in
`src/evals/finance-domain.v1.json`. The deterministic scorer rejects technical
fallbacks, wrong intent or scope, weak sourcing, one-sided answers, missing
change conditions, direct trade instructions, and uncalibrated certainty. New
model or prompt versions should pass this gate before replacing the production
research path.

`npm run eval:finance:live` runs all eight cases through a deployed app and its
real Gemini configuration. Set `LIVE_EVAL_BASE_URL` plus the Supabase variables,
then redirect the JSON output to a dated baseline file. The runner creates a
temporary admin evaluator per case and removes it afterward.

## Early-access operations

Open signup is controlled by `OPEN_SIGNUP_ENABLED`; email verification is still
required, and `ALPHA_ALLOWED_EMAILS` remains available for controlled access when
the kill switch is off. Magic-link requests and background-job creation are
database-throttled before provider work begins. The migration `20260916183000_alpha_release.sql`
creates the September 17–30 supervised cohort with five initial seats and closes
the expiring beta cohort. Newly onboarded invitees join the newest current cohort.

Run the authenticated production journey with `npm run smoke:beta`. It now covers
sign-in, onboarding, background job polling, a cited answer, a conversational
follow-up, conversation reload, and feedback. The temporary smoke user is deleted.

Admins can inspect provider consumption and degraded analysis rate with:

```text
GET /api/admin/ops?hours=24
```

During the alpha, review that endpoint and `/api/admin/validation?cohort=alpha-2026-09`
once each business day. Treat any provider authentication failure, error rate over
20%, or unexpected cost increase as a release incident. The daily review owner is
the Circuit Studio product owner; user-facing issues go to support@circuitstudio.ai.

## Two-week beta validation layer

Apply Supabase migrations before deploying this release. The validation layer
adds a four-question onboarding flow, named beta cohorts, an allow-listed
product event stream, richer report feedback, and activation tracking.

Activation requires all four events: onboarding completed, watchlist saved,
analysis completed, and report opened. The primary usefulness event is
`decision_brief_used`, emitted by an explicit helpful rating or copying a full
report. Daily sessions support repeat-use measurement without a third-party
analytics SDK.

Admins can retrieve the cohort scorecard at:

```text
GET /api/admin/validation?cohort=beta-2026-09
```

The scorecard reports activated testers, completed cycles, three-day users,
two-week returners, helpful-rating rate, loss reaction, and willingness to pay.
External testers should be placed in the named cohort; internal accounts should
retain the `admin` role or be removed from cohort membership before launch.

## Data

The default analysis uses Yahoo's public chart endpoint and requires no API key.
Paid/hosted data adapters can be added later behind the same signal shape.

Market data now sits behind `src/lib/marketData.ts`, so Yahoo can be swapped for
a paid provider without changing the analysis API. If Yahoo is unavailable, the
engine marks the price-fetch pipeline step as `fallback` and uses deterministic
series only to keep the demo responsive.

## Batch refresh

The protected refresh endpoint is the first scheduled-job spine:

```bash
curl -X POST "$APP_URL/api/jobs/refresh" \
  -H "authorization: Bearer $CIRCUIT_JOB_SECRET" \
  -H "content-type: application/json" \
  -d '{"watchlist":["AMD","SOFI","HOOD"]}'
```

It runs the server-side analyst engine, optionally enriches with Gemini, saves
the run to Supabase when configured, emits `circuit_rule_engine` rows into
`engine_outputs`, and writes consensus rows. `/api/engines/ingest` and
`/api/consensus` use the same bearer-secret guard for external harness jobs.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
