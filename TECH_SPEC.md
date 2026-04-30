# TECH SPEC — Circuit Market Desk MVP

## Architecture
- Frontend/API: Next.js (Vercel)
- DB: Supabase Postgres
- AI layer: Gemini (optional enhancement)
- Data baseline: Yahoo chart endpoint (M2-lite), OpenBB integration (next)
- External engines (Track A): TradingAgents + daily_stock_analysis adapters

## Core Modules
1. Data layer
2. Engine adapters
3. Orchestrator
4. Normalizer
5. Consensus scorer
6. UI/dashboard/brief
7. Notification dispatcher

## Normalized Schema
```json
{
  "ticker": "AMD",
  "market": "US",
  "run_timestamp": "2026-04-27T00:00:00Z",
  "engine_name": "tradingagents",
  "direction": "bullish|neutral|bearish",
  "confidence": 0,
  "time_horizon": "swing",
  "thesis_summary": "...",
  "bull_case": ["..."],
  "bear_case": ["..."],
  "risk_flags": ["..."],
  "catalysts": ["..."],
  "suggested_next_action": "...",
  "raw_payload_ref": "..."
}
```

## Consensus v1
- Agreement score: % engines aligned on direction
- Confidence score: weighted avg confidence
- Freshness score: decay by age
- Conflict flag: true if high-confidence disagreement exists

## API Endpoints
- `POST /api/analyze` run and return analysis for watchlist
- `GET /api/runs` recent runs
- `GET /api/brief/latest` latest daily brief
- `POST /api/engines/ingest` ingest normalized engine outputs

## Supabase Tables
- `analysis_runs`
- `signals` (legacy app signal output)
- `engine_outputs`
- `consensus_signals`
- `daily_briefs`

## Performance Targets
- Cached ticker/dashboard load < 10s
- Fresh run path < 60–120s depending on adapters

## Reliability
- Adapter failures should degrade gracefully
- Persist partial success + status metadata

## Compliance Posture
- Educational/research tool only
- No guaranteed returns language
