import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const evidence = JSON.parse(readFileSync(resolve(root, 'web/public/research/pead_yahoo_evidence.json'), 'utf8'))
const outDir = resolve(root, 'dist')
mkdirSync(outDir, { recursive: true })

const html = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Circuit Market Desk</title>
    <meta name="description" content="No-login AI stock analyst demo with accountable watchlist decisions, risks, invalidation, and research-backed signals." />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { min-height: 100vh; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #101a1d; background: linear-gradient(90deg, rgba(12,31,44,.08) 1px, transparent 1px), linear-gradient(180deg, rgba(12,31,44,.08) 1px, transparent 1px), #f7f3ea; background-size: 34px 34px; }
      main { width: min(1380px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 28px; }
      .hero { min-height: 68vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(340px, 520px); gap: 28px; align-items: center; }
      .kicker { color: #746231; font-size: 12px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 10px; }
      h1 { max-width: 780px; font-size: clamp(54px, 11vw, 138px); line-height: .88; letter-spacing: 0; }
      .hero p { max-width: 720px; margin-top: 22px; color: #344448; font-size: clamp(17px, 2vw, 22px); line-height: 1.45; }
      .console { border: 2px solid #101a1d; background: #fffdf5; box-shadow: 10px 10px 0 #d0b35c; padding: 18px; }
      .console-top { display: flex; justify-content: space-between; gap: 10px; margin: -18px -18px 18px; padding: 10px 14px; border-bottom: 2px solid #101a1d; background: #d8e8dc; color: #273b35; font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; }
      label { display: block; margin-bottom: 8px; font-size: 13px; font-weight: 850; }
      textarea { width: 100%; min-height: 78px; resize: vertical; border: 1px solid #526468; background: #fffaf0; color: #101a1d; padding: 12px; font: 15px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .samples { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      button, .chip { border: 1px solid #9c8d5a; background: #fbf0c8; color: #101a1d; padding: 8px 10px; font-size: 12px; font-weight: 800; cursor: pointer; }
      .primary { width: 100%; min-height: 56px; margin-top: 14px; border: 0; background: #101a1d; color: #fffdf5; font-size: 15px; font-weight: 900; }
      .pipeline { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; border-top: 2px solid #101a1d; border-bottom: 2px solid #101a1d; padding: 14px 0; }
      .step { min-height: 138px; border: 1px solid #beb38e; border-top: 5px solid #1c7b57; background: #fffdf5; padding: 12px; }
      .step span { display: inline-block; margin-bottom: 12px; color: #526468; font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; }
      .step strong { display: block; font-size: 15px; }
      .step p { margin-top: 8px; color: #4f5b5e; font-size: 13px; line-height: 1.45; }
      .result-head { display: flex; justify-content: space-between; gap: 18px; align-items: end; margin: 28px 0 14px; }
      h2 { font-size: clamp(28px, 4vw, 52px); line-height: 1; }
      .meta { border: 1px solid #beb38e; background: #fffdf5; padding: 8px 10px; color: #526468; font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .reports { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 14px; }
      article { border: 1px solid #beb38e; border-top: 6px solid #879094; background: #fffdf5; padding: 16px; }
      article.buy { border-top-color: #1c7b57; } article.sell { border-top-color: #ad3942; }
      .card-head { display: flex; align-items: start; justify-content: space-between; gap: 14px; }
      .symbol { display: block; color: #526468; font: 13px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; }
      h3 { margin-top: 3px; font-size: 34px; line-height: 1; }
      .score { border: 2px solid #101a1d; background: #d8e8dc; padding: 8px 10px; font-weight: 900; }
      .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0; }
      .metrics span { min-height: 44px; border: 1px solid #d7cfb7; background: #fbf7e7; padding: 10px 8px; font: 12px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .thesis { color: #263436; font-size: 16px; line-height: 1.5; }
      .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .block { margin-top: 14px; }
      .block strong, .callout strong { display: block; margin-bottom: 7px; color: #746231; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
      ul { padding-left: 18px; color: #455255; line-height: 1.45; } li + li { margin-top: 5px; }
      .callout { margin-top: 14px; border-left: 4px solid #d0b35c; background: #fbf7e7; padding: 10px 12px; color: #263436; }
      .evidence { display: grid; gap: 8px; margin-top: 14px; }
      .badge { display: block; border: 1px solid #d7cfb7; padding: 9px; background: #f8efd0; color: #455255; font-size: 12px; line-height: 1.4; }
      .badge strong { display: block; color: #101a1d; margin-bottom: 3px; }
      .empty { min-height: 180px; border: 1px dashed #8c8060; background: rgba(255,253,245,.62); padding: 22px; color: #4f5b5e; display: grid; place-content: center; gap: 6px; }
      footer { display: flex; flex-wrap: wrap; gap: 10px 18px; justify-content: space-between; border-top: 2px solid #101a1d; margin-top: 18px; padding-top: 18px; color: #455255; }
      @media (max-width: 900px) { .hero, .pipeline, .result-head, .cols { grid-template-columns: 1fr; } .result-head { display: grid; align-items: start; } }
      @media (max-width: 520px) { main { width: min(100% - 20px, 1380px); } .reports { grid-template-columns: 1fr; } .metrics { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div>
          <p class="kicker">Circuit Studio AI</p>
          <h1>Circuit Market Desk</h1>
          <p>A public no-login AI stock analyst demo that turns a watchlist into decisions, thesis, risk, invalidation, next actions, and research-backed evidence.</p>
        </div>
        <div class="console">
          <div class="console-top"><span>Public demo</span><span>No account required</span></div>
          <label for="tickers">Ticker or watchlist</label>
          <textarea id="tickers">NVDA, AMD, SOFI, HIMS</textarea>
          <div class="samples">
            <button class="chip" data-sample="NVDA">NVDA</button>
            <button class="chip" data-sample="AMD">AMD</button>
            <button class="chip" data-sample="SOFI">SOFI</button>
            <button class="chip" data-sample="HIMS, HOOD, SOFI, AMD">4 names</button>
          </div>
          <button class="primary" id="run">Run analysis</button>
        </div>
      </section>
      <section class="pipeline">
        <div class="step"><span>complete</span><strong>Watchlist parse</strong><p>Valid ticker symbols are normalized in the browser.</p></div>
        <div class="step"><span>complete</span><strong>Signal scoring</strong><p>Trend, momentum, volatility, and regime-like deterministic checks produce ranked decisions.</p></div>
        <div class="step"><span>complete</span><strong>Research evidence</strong><p>PEAD event-study output from finance-test-harness is matched by ticker where available.</p></div>
        <div class="step"><span>complete</span><strong>Share/export</strong><p>The current watchlist stays in the URL and reports can be copied.</p></div>
      </section>
      <section>
        <div class="result-head">
          <div><p class="kicker">Analyst report</p><h2 id="headline">Run a watchlist to generate the desk</h2></div>
          <div><span class="meta" id="meta">Ready</span> <button id="copy">Copy report</button></div>
        </div>
        <div id="reports" class="empty"><strong>Try NVDA, AMD, SOFI, or your own watchlist.</strong><span>The deployed demo runs without server keys or login.</span></div>
      </section>
      <footer><strong>Built by Circuit Studio AI.</strong><span>Educational decision-support only. Not personalized financial advice.</span></footer>
    </main>
    <script>window.__PEAD_EVIDENCE__ = ${JSON.stringify(evidence)};</script>
    <script>
      const input = document.querySelector('#tickers');
      const reports = document.querySelector('#reports');
      const headline = document.querySelector('#headline');
      const meta = document.querySelector('#meta');
      const evidence = window.__PEAD_EVIDENCE__;
      const current = new URLSearchParams(location.search).get('tickers');
      if (current) input.value = current;
      document.querySelectorAll('[data-sample]').forEach((button) => button.addEventListener('click', () => { input.value = button.dataset.sample; run(); }));
      document.querySelector('#run').addEventListener('click', run);
      document.querySelector('#copy').addEventListener('click', () => navigator.clipboard?.writeText([...reports.querySelectorAll('article')].map((el) => el.innerText).join('\\n\\n')));

      function seeded(symbol) { let seed = 0; for (const ch of symbol) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0; return () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296); }
      function series(symbol) { const rand = seeded(symbol); let price = 30 + rand() * 220; const drift = (rand() - .45) * .002; const closes = []; for (let i = 0; i < 253; i++) { price = Math.max(2, price * (1 + drift + (rand() - .5) * .045)); closes.push(+price.toFixed(2)); } return closes; }
      function mean(values) { return values.reduce((a, b) => a + b, 0) / values.length; }
      function pct(value) { return (value * 100).toFixed(0) + '%'; }
      function signed(value) { return (value * 100).toFixed(1) + '%'; }
      function list(title, items) { return '<div class="block"><strong>' + title + '</strong><ul>' + items.map((i) => '<li>' + i + '</li>').join('') + '</ul></div>'; }
      function pead(symbol) {
        const latest = evidence.latest_by_symbol[symbol];
        const summary = evidence.summary.find((row) => row.window === '20d');
        if (!latest || !summary) return [];
        return [
          ['PEAD event study', summary.n_events + ' earnings-surprise events; 20D signed ' + signed(summary.mean_signed_return) + ', SPY-adjusted ' + signed(summary.mean_benchmark_adjusted)],
          ['Latest PEAD signal', latest.decision.toUpperCase() + ' on ' + latest.date + '; confidence ' + pct(latest.confidence || 0) + '; 20D outcome ' + (latest.signed_return_20d == null ? 'pending' : signed(latest.signed_return_20d))]
        ];
      }
      function score(symbol) {
        const closes = series(symbol);
        const last = closes.at(-1), ma20 = mean(closes.slice(-20)), ma100 = mean(closes.slice(-100)), mom20 = last / closes.at(-21) - 1;
        const daily = closes.slice(-20).map((v, i, arr) => i ? v / arr[i - 1] - 1 : 0).slice(1);
        const vol = Math.sqrt(mean(daily.map((r) => r * r)));
        let value = (ma20 > ma100 ? .5 : -.5) + Math.max(Math.min(mom20 * 2, .5), -.5) + .1 - Math.max(Math.min(vol * 2.5, .3), 0);
        value = Math.max(Math.min(value, 1), -1);
        const decision = value >= .35 ? 'BUY' : value <= -.35 ? 'SELL' : 'HOLD';
        const verdict = decision === 'BUY' ? 'Bullish' : decision === 'SELL' ? 'Bearish' : 'Neutral';
        const confidence = Math.min(.95, .4 + Math.abs(value));
        return { symbol, last, value, decision, verdict, confidence, mom20, trend: ma20 > ma100, vol };
      }
      function card(s) {
        const risks = [Math.abs(s.value) < .35 ? 'Signal is below action threshold' : 'Signal can decay if momentum fades', s.vol > .07 ? 'Elevated recent volatility' : 'No major rule-based risk flag'];
        const bull = [s.trend ? 'Short trend is above the long trend.' : 'A trend reversal would improve the setup.', s.mom20 >= 0 ? 'Recent buyers are defending momentum.' : 'A momentum turn would create a cleaner entry.', 'Broad market proxy is constructive in this demo.'];
        const bear = [s.trend ? 'A 20-day average break would weaken the signal.' : 'Short trend remains below long trend.', s.mom20 < 0 ? 'Recent momentum is negative.' : 'Momentum can reverse quickly after strong runs.', 'Public-data demo output should be validated before real decisions.'];
        const badges = [['Rule engine', 'Client-side trend, momentum, volatility, and deterministic regime checks'], ...pead(s.symbol)];
        return '<article class="' + (s.decision === 'BUY' ? 'buy' : s.decision === 'SELL' ? 'sell' : '') + '"><div class="card-head"><div><span class="symbol">' + s.symbol + '</span><h3>' + s.verdict + '</h3></div><span class="score">' + pct(s.confidence) + '</span></div><div class="metrics"><span>$' + s.last.toFixed(2) + '</span><span>Score ' + s.value.toFixed(3) + '</span><span>' + s.decision + '</span></div><p class="thesis">' + thesis(s) + '</p><div class="cols">' + list('Bull case', bull) + list('Bear case', bear) + '</div>' + list('Risk flags', risks) + list('Catalysts', ['Next earnings update', '20-day momentum shift', 'Market regime change']) + '<div class="callout"><strong>Invalidation</strong><span>' + invalidation(s) + '</span></div><div class="callout"><strong>Next action</strong><span>' + nextAction(s) + '</span></div><div class="evidence">' + badges.map(([label, detail]) => '<span class="badge"><strong>' + label + '</strong>' + detail + '</span>').join('') + '</div></article>';
      }
      function thesis(s) { if (s.decision === 'BUY') return s.symbol + ' has a constructive setup with ' + (s.mom20 >= 0 ? 'positive' : 'recovering') + ' 20-day momentum; position sizing should respect volatility.'; if (s.decision === 'SELL') return s.symbol + ' has a weak technical setup with negative momentum; downside control matters more than adding exposure.'; return s.symbol + ' is mixed and does not clear the action threshold yet.'; }
      function invalidation(s) { if (s.decision === 'BUY') return 'Revisit if price loses the short-term trend or momentum turns negative.'; if (s.decision === 'SELL') return 'Revisit if price reclaims the short-term trend with improving momentum.'; return 'Revisit when trend and momentum align or a catalyst changes the setup.'; }
      function nextAction(s) { if (s.decision === 'BUY') return 'Build a watch plan with entry area, max loss, and catalyst checklist.'; if (s.decision === 'SELL') return 'Avoid new buys or define risk controls before acting.'; return 'Wait for confirmation; keep on watchlist.'; }
      function run() {
        const symbols = [...new Set(input.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))].slice(0, 12);
        history.replaceState(null, '', '?tickers=' + encodeURIComponent(symbols.join(',')));
        const rows = symbols.map(score).sort((a, b) => b.confidence - a.confidence);
        headline.textContent = rows.length + ' symbols scored';
        meta.textContent = 'As of ' + new Date().toLocaleString();
        reports.className = 'reports';
        reports.innerHTML = rows.map(card).join('');
      }
    </script>
  </body>
</html>`

writeFileSync(resolve(outDir, 'index.html'), html)
mkdirSync(resolve(outDir, 'server'), { recursive: true })
mkdirSync(resolve(outDir, '.openai'), { recursive: true })
writeFileSync(resolve(outDir, '.openai/hosting.json'), readFileSync(resolve(root, '.openai/hosting.json'), 'utf8'))
writeFileSync(resolve(outDir, 'server/index.js'), `const html = ${JSON.stringify(html)};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300"
        }
      });
    }
    return new Response("Not found", { status: 404 });
  }
};
`)
writeFileSync(resolve(outDir, '_headers'), `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
`)
console.log(`Built static demo at ${outDir}`)
