from fastapi import FastAPI
from pathlib import Path
import yaml
import pandas as pd
import yfinance as yf
from datetime import datetime

app = FastAPI(title="Circuit Analyst MVP")
ROOT = Path(__file__).resolve().parents[1]


def load_cfg():
    return yaml.safe_load((ROOT / "config" / "watchlist.yaml").read_text())


def fetch_prices(symbols, period="1y"):
    data = yf.download(symbols, period=period, interval="1d", auto_adjust=False, progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        close = data["Close"].copy()
    else:
        close = data[["Close"]].rename(columns={"Close": symbols[0]})
    return close.dropna(how="all").ffill()


def score_symbol(series: pd.Series, regime_bias=0.0):
    s = series.dropna()
    if len(s) < 110:
        return 0.0, "insufficient_data"
    ma20 = s.rolling(20).mean().iloc[-1]
    ma100 = s.rolling(100).mean().iloc[-1]
    mom20 = s.iloc[-1] / s.iloc[-21] - 1
    vol20 = s.pct_change().rolling(20).std().iloc[-1]

    trend = 0.5 if ma20 > ma100 else -0.5
    momentum = max(min(mom20 * 2.0, 0.5), -0.5)
    risk_penalty = max(min(vol20 * 2.5, 0.3), 0.0)

    score = trend + momentum + regime_bias - risk_penalty
    score = max(min(score, 1.0), -1.0)

    if score >= 0.35:
        decision = "BUY"
    elif score <= -0.35:
        decision = "SELL"
    else:
        decision = "HOLD"

    confidence = round(min(0.95, 0.4 + abs(score)), 2)
    return round(score, 3), decision, confidence


def run_analysis():
    cfg = load_cfg()
    symbols = cfg["symbols"]
    benchmarks = cfg.get("benchmarks", ["SPY", "QQQ"])

    px = fetch_prices(symbols + benchmarks)

    regime_series = px[benchmarks].mean(axis=1).dropna()
    regime_score, _, _ = score_symbol(regime_series, 0.0)
    regime_bias = 0.1 if regime_score > 0 else -0.1

    rows = []
    for sym in symbols:
        score, decision, confidence = score_symbol(px[sym], regime_bias)
        rows.append({
            "symbol": sym,
            "decision": decision,
            "confidence": confidence,
            "score": score,
            "last_price": round(float(px[sym].dropna().iloc[-1]), 2),
        })

    df = pd.DataFrame(rows).sort_values(["decision", "confidence"], ascending=[True, False])
    return {
        "as_of": datetime.utcnow().isoformat() + "Z",
        "regime_score": regime_score,
        "signals": df.to_dict(orient="records"),
    }


def write_report(payload):
    out = ROOT / "outputs" / "daily_report.md"
    lines = [
        "# Circuit Analyst Daily Report",
        f"Generated: {payload['as_of']}",
        f"Regime score: {payload['regime_score']}",
        "",
        "| Symbol | Decision | Confidence | Score | Last Price |",
        "|---|---|---:|---:|---:|",
    ]
    for r in payload["signals"]:
        lines.append(f"| {r['symbol']} | {r['decision']} | {r['confidence']} | {r['score']} | {r['last_price']} |")
    out.write_text("\n".join(lines))
    return out


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/analyze")
def analyze():
    payload = run_analysis()
    write_report(payload)
    return payload


@app.get("/report")
def report():
    p = ROOT / "outputs" / "daily_report.md"
    if not p.exists():
        payload = run_analysis()
        write_report(payload)
    return {"path": str(p), "content": p.read_text()}
