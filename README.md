# Circuit Analyst MVP

Lightweight AI trading analyst copilot for small teams.

## Run
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

## Endpoints
- `GET /health`
- `GET /analyze`
- `GET /report`

## Notes
- Educational / decision-support only.
- Not investment advice.
