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
- [ ] Market data fetch via Yahoo chart endpoint (server-side)
- [ ] Deterministic signal scoring (trend + momentum + volatility + regime)
- [ ] Regime score visible in UI
- [ ] Daily diff support scaffold (latest vs prior run)

## Milestone 3 — Gemini AI Layer (Done w/ fallback)
- [x] Integrate Gemini API for concise explanation per symbol
- [x] Fallback explanations when Gemini key unavailable
- [x] Confidence-aware explanation tone

## Milestone 4 — Supabase Integration (Partially done)
- [x] Add Supabase client wiring (server)
- [x] Persist analysis runs and signal rows
- [x] Add SQL schema + setup docs
- [ ] Render recent runs from Supabase

## Milestone 5 — Deploy & Validate (Done)
- [x] Vercel project deployment
- [ ] Environment variables configured (Vercel + Supabase + Gemini)
- [x] Health check + smoke test
- [x] Shareable URL + launch checklist

## Milestone 6 — Viral Hooks (Post-Deploy fast follow)
- [ ] Share-ready report block
- [ ] Daily "Top setups" summary card
- [ ] Public demo watchlist preset
- [ ] Built-by-Circuit signature branding

## Deliverables
1. Live app URL (Vercel): https://web-lime-kappa-15.vercel.app
2. Setup docs for Supabase schema + env vars
3. Working Analyze flow (persistence auto-enabled when Supabase env vars are set)
4. Gemini explanation in dashboard (auto-enabled when GEMINI_API_KEY is set)

## Risks / Blockers
- Vercel auth or deployment permissions
- Supabase project credentials
- Gemini API key availability

If any blocker occurs, pause only for credentials/approval and continue immediately after.
