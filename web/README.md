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

## Validation

```bash
npm run build
npm run lint
```

## Data

The default analysis uses Yahoo's public chart endpoint and requires no API key.
Paid/hosted data adapters can be added later behind the same signal shape.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
