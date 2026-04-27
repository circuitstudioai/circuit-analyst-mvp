# Circuit Analyst MVP (Ship Fast Spec)

## Goal
Build a lightweight AI trading analyst tool to showcase AI product-building skills for Circuit Studio AI.

## Positioning
"AI Trading Analyst Copilot for small teams" (decision support, not auto-trading).

## Success Criteria (MVP)
1. User can set a watchlist.
2. System generates daily Buy/Hold/Sell cards with confidence + rationale.
3. Output is available in web API + markdown report.
4. Basic scorecard exists (signal distribution + benchmark snapshot).
5. Can run locally with one command.

## Non-Goals (MVP)
- No broker integration.
- No auto order execution.
- No promises of alpha.
- No heavy auth/multitenancy.

## Core Features
1. Watchlist config (`config/watchlist.yaml`)
2. Data fetch (yfinance)
3. Rule-based signal engine (fast, deterministic)
4. AI-ready explanation layer (templated first; LLM plug-in later)
5. Daily report generation (`outputs/daily_report.md`)
6. FastAPI endpoints:
   - `GET /health`
   - `GET /analyze`
   - `GET /report`

## Decision Model (MVP v0)
Per symbol:
- Technical trend score (MA20/MA100, momentum)
- Volatility risk penalty
- Regime overlay (SPY/QQQ trend)
- Decision mapping:
  - score >= 0.35 => BUY
  - score <= -0.35 => SELL
  - otherwise HOLD

Confidence:
- `min(0.95, 0.4 + abs(score))`

## Stack
- Python 3.11+
- FastAPI + Uvicorn
- pandas + yfinance + pyyaml

## Ship Plan
### Day 1
- Scaffold project + signal engine + API + markdown report.

### Day 2
- Add simple frontend (optional Streamlit) and polish outputs.

### Day 3
- Branding, screenshots, Loom demo, public README.

## Risks
- Data source reliability / rate limits.
- Overfitting narrative; keep deterministic baseline.

## Next After MVP
- Plug TradingAgents and daily_stock_analysis adapters as optional engines.
- Add Telegram daily push.
- Add backtest page.
