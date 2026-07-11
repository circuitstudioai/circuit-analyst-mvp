# Circuit Analyst MVP

Lightweight AI trading analyst copilot for small teams.

## Live architecture (MVP)
- **Vercel**: hosts the Next.js app (`/web`)
- **Supabase**: stores analysis runs/signals
- **Gemini**: generates concise explanation notes (optional fallback-safe)
- **Yahoo public chart API**: default no-key market data path

## Local run (web app)
```bash
cd web
npm install
npm run dev
```

Open: `http://localhost:3000`

No environment variables are required for the default public-data analysis.
Gemini and Supabase are optional enhancements.

## Key routes
- `POST /api/analyze` → compute accountable watchlist signals + optional Gemini explanations + optional Supabase save
- `GET /api/runs` → recent run history from Supabase

## What the app returns
Each watchlist symbol gets:
- BUY / HOLD / SELL / ABSTAIN-style decision support
- confidence and score
- thesis
- risk flags
- invalidation condition
- suggested next action
- data-quality status
- source metadata

The default engine uses 1 year of daily closes, MA20/MA100 trend, 20-day
momentum, realized-volatility penalty, and a SPY/QQQ regime bias.

## Deploy (Vercel)
1. Import `circuitstudioai/circuit-analyst-mvp` in Vercel.
2. Set root directory to `web`.
3. Add env vars:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (optional)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy.

## Supabase setup
Run SQL in `web/supabase.sql`.

## Positioning
Most AI stock tools generate opinions. **Circuit Analyst generates accountable decisions.**

## Disclaimer
Educational / decision-support only. Not investment advice.
