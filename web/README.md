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

- `GEMINI_API_KEY`: adds concise analyst notes to each signal.
- `GEMINI_MODEL`: overrides the Gemini model.
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: persist runs/signals.
- `CIRCUIT_JOB_SECRET` or `CRON_SECRET`: protects batch write endpoints.

## Validation

```bash
npm run build
npm run lint
```

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
