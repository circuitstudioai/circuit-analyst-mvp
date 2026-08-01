# Circuit Market Desk

No-login public AI stock analyst demo for Circuit Studio AI.

## Live architecture (MVP)
- **Vercel**: hosts the Next.js app (`/web`)
- **Supabase**: optionally stores analysis runs/signals, consensus, saved reports, provider usage, and future user watchlists
- **Gemini**: optionally generates concise explanation notes with server-side cache/rate limiting
- **Yahoo public chart API**: default no-key market data path
- **finance-test-harness**: exports PEAD event-study evidence for research-backed ticker badges

## Local run (web app)
```bash
cd web
npm install
npm run dev
```

Open: `http://localhost:3000`

No environment variables are required for the default public-data analysis.
Gemini and Supabase are optional enhancements. The first screen is the usable
demo; auth, credits, and billing are intentionally absent from the public path.

## Key routes
- `POST /api/analyze` → compute accountable watchlist signals + optional Gemini explanations + optional Supabase save
- `GET /api/runs` → recent run history from Supabase
- `POST /api/engines/ingest` → ingest external engine outputs
- `POST /api/consensus` → compute consensus from ingested engine outputs
- `GET /api/brief/latest` → latest stored daily brief

## What the app returns
Each watchlist symbol gets:
- BUY / HOLD / SELL / ABSTAIN-style decision support
- confidence and score
- thesis
- risk flags
- invalidation condition
- suggested next action
- data-quality status
- source metadata and evidence badges
- bull case, bear case, catalysts, and AI workflow trace

The default engine uses 1 year of daily closes, MA20/MA100 trend, 20-day
momentum, realized-volatility penalty, and a SPY/QQQ regime bias.

## Research-backed signal bridge
The public fixture at `web/public/research/pead_yahoo_evidence.json` is generated
from `finance-test-harness`:
```bash
cd ../finance-test-harness
python -m src.harness.run --config config/default.yaml
python -m src.harness.export_app_evidence \
  --output ../circuit-analyst-mvp/web/public/research/pead_yahoo_evidence.json
```

This is the Phase 3 bridge: normal users see evidence badges in Circuit Market
Desk without touching the CLI harness.

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

The schema includes the current public-demo tables plus SaaS-ready tables for
profiles, saved watchlists, saved reports, and provider-usage tracking.

## Positioning
Most AI stock tools generate opinions. **Circuit Market Desk generates accountable decisions.**

## Disclaimer
Educational / decision-support only. Not investment advice.
