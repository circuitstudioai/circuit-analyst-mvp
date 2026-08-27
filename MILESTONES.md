# Circuit Analyst MVP — Milestones

## Goal
Ship a working public MVP for validation + virality, deployed on Vercel, with Supabase persistence and Gemini-powered explanation layer.

## Milestone 0 — Foundation (Done)
- [x] Initial concept + spec (`SPEC.md`)
- [x] Basic deterministic signal engine prototype

## Milestone 1 — Productized Web MVP (Done)
- [x] Create Next.js app (`web/`) with clean landing/dashboard UX
- [x] Watchlist input and one-click analyze
- [x] Decision cards: Buy/Hold/Sell + confidence + score + price
- [x] "Why different" messaging section

## Milestone 2 — Data + Scoring Engine
- [x] Market data fetch via Yahoo chart endpoint (server-side)
- [x] Deterministic signal scoring (trend + momentum + volatility + regime)
- [x] Regime score visible in UI
- [x] Daily diff support scaffold (latest vs prior run)

## Milestone 3 — Gemini AI Layer (Done w/ fallback)
- [x] Integrate Gemini API for concise explanation per symbol
- [x] Fallback explanations when Gemini key unavailable
- [x] Confidence-aware explanation tone

## Milestone 4 — Supabase Integration (Done)
- [x] Add Supabase client wiring (server)
- [x] Persist analysis runs and signal rows
- [x] Add SQL schema + setup docs
- [x] Render recent runs from Supabase

## Milestone 5 — Deploy & Validate (Done)
- [x] Vercel project deployment
- [x] Environment variables configured (Vercel + Supabase + Gemini)
- [x] Health check + smoke test
- [x] Shareable URL + launch checklist

## Milestone 6 — Viral Hooks (Post-Deploy fast follow)
- [x] Share-ready report block
- [x] Daily "Top setups" summary card
- [x] Public demo watchlist preset
- [x] Built-by-Circuit signature branding

## Milestone 7 — Authenticated Beta (In progress)
- [x] Supabase magic-link access and per-user RLS
- [x] 100-symbol pilot universe and user watchlists
- [x] Per-user quotas, run ledger, and usefulness feedback
- [x] Live company/symbol search with on-demand analysis
- [x] Production beta smoke harness
- [x] No synthetic-price decisions in the live path
- [x] Weekday scheduled refresh verified in production
- [ ] First 10 external beta users invited

## Deliverables
1. Live app URL (Vercel): https://circuit-market-desk.vercel.app
2. Setup docs for Supabase schema + env vars
3. Working Analyze flow (persistence auto-enabled when Supabase env vars are set)
4. Gemini explanation in dashboard (auto-enabled when GEMINI_API_KEY is set)

## Risks / Blockers
- Weekday refresh is configured for 12:00 UTC; monitor its first unattended runs.
- Yahoo public chart/search endpoints are suitable for beta validation, not a commercial data SLA.
- Early-user activation, retention, and usefulness metrics still need real beta traffic.

If any blocker occurs, pause only for credentials/approval and continue immediately after.
