# Circuit Analyst MVP

Lightweight AI trading analyst copilot for small teams.

## Live architecture (MVP)
- **Vercel**: hosts the Next.js app (`/web`)
- **Supabase**: stores analysis runs/signals
- **Gemini**: generates concise explanation notes (optional fallback-safe)

## Local run (web app)
```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Open: `http://localhost:3000`

## Key routes
- `POST /api/analyze` → compute signals + (optional) Gemini explanations + (optional) save to Supabase
- `GET /api/runs` → recent run history from Supabase

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
