# PRD — Circuit Market Desk (MVP)

## Product Goal
Help small investment teams and serious traders aggregate fragmented AI-finance outputs into one explainable daily decision workspace.

## Positioning
AI analyst workstation (decision support), not autonomous trading.

## Out of Scope (MVP)
- Live trade execution
- Broker integrations
- Backtesting/PnL claims in user-facing app
- Portfolio rebalancing automation
- Social/community features

## Target Users
1. Solo active trader (morning brief + watchlist workflow)
2. Small research/advisory team (repeatable analyst process)
3. Portfolio/demo audience for Circuit Studio AI (proof of orchestration + explainability)

## Core Value
- One watchlist, many engines
- One normalized schema
- One consensus/disagreement view with rationale and freshness

## Primary User Flow
1. User opens app and sets watchlist
2. System runs engine pipeline (scheduled or on demand)
3. Engine outputs are normalized
4. Consensus is computed
5. User reviews dashboard/ticker page/daily brief
6. User takes next research action

## MVP Features
1. Watchlist management (single-tenant demo mode)
2. Engine orchestration (M2-lite: deterministic + adapter ingest)
3. Normalized schema storage
4. Consensus scoring v1 (agreement, confidence, freshness, conflict)
5. Dashboard + ticker detail + daily brief page
6. Telegram + email-ready notification pipeline (Telegram first)

## Success Metrics (MVP)
- Watchlist creation/use rate
- Daily brief open/view rate
- Run completion rate
- Time from run start to brief availability
- Ticker drill-down rate from brief/dashboard
- User trust feedback: “useful for further research?”
