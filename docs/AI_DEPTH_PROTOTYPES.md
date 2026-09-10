# Market Desk AI-Heavy Analysis Prototype

Date: 2026-09-10

Status: Product-review draft. This is the manual validation step before implementation.

## Proposed production contract

Every foreground request should accept both a company and a natural-language question. The system should classify the intent, assemble a current evidence dossier, run role-specific analysis passes, validate citations, and then synthesize one answer.

### Required evidence

- Company identity, business model, and economically important segments
- Latest filed quarterly results and management outlook
- Growth, margins, cash flow, and balance-sheet direction
- Company-specific risks, dependencies, and upcoming catalysts
- A valuation method appropriate to the business; no universal revenue multiple
- Market/price context as supporting evidence, not the whole thesis
- Source URL, observation date, retrieval date, and evidence ID for every factual input

### AI passes

1. Research planner: decide what matters for this company and the user's intent.
2. Company analyst: build the strongest evidence-supported base/positive case.
3. Risk analyst: challenge assumptions and identify contrary or missing evidence.
4. Decision editor: reconcile disagreement and explain the answer at approximately grade 7–9 reading level.

### Final answer shape

1. Direct answer
2. What is distinctive about this company now
3. Strongest supporting evidence
4. Strongest counterargument
5. What would change the view
6. Sources and freshness

The output decision is limited to `favorable`, `mixed`, `unfavorable`, or `insufficient evidence`. It is research support, not a trade instruction.

## Five manual prototypes

These samples intentionally answer the same question—“How does the evidence look now?”—to test whether different evidence produces naturally different reports.

### NVDA — favorable, with unusually high expectation risk

**Direct answer:** Nvidia's business evidence is exceptionally strong, but the market price already assumes that AI infrastructure spending will remain very large. The key question is no longer whether demand is growing; it is how long growth near this scale can last.

**What is distinctive now:** This is primarily an AI-compute capacity story. Data Center produced $89.0 billion of Nvidia's $96.2 billion fiscal Q2 2027 revenue. That concentration makes the company different from a normal diversified semiconductor business.

**Strongest evidence:** Quarterly revenue grew 106% year over year, Data Center revenue grew 117%, and gross margin was 75.0%. Management guided the next quarter to $108.0 billion of revenue, plus or minus 2%, while assuming no Data Center compute revenue from China.

**Strongest counterargument:** Growth depends heavily on a concentrated group of large customers continuing to fund AI infrastructure. Export restrictions, product-transition execution, supply dependencies, or customers slowing capital spending could change expectations quickly. A strong company can still be a poor setup if expected growth is already fully priced.

**What would change the view:** Watch whether Data Center growth and gross margin remain close to guidance as Rubin production ramps. A material slowdown in orders, weaker margin guidance, or renewed China exposure would weaken the case.

Primary sources: [Nvidia fiscal Q2 2027 results](https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Second-Quarter-Fiscal-2027/default.aspx), [Nvidia fiscal Q2 2027 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm)

### JPM — favorable operating evidence, but sensitive to the credit cycle

**Direct answer:** JPMorgan is producing strong results across lending, markets, investment banking, and asset management. The evidence is favorable, but some of the quarter benefited from an unusually active market environment and credit costs remain the main checkpoint.

**What is distinctive now:** JPMorgan is not one growth engine. Its consumer bank, commercial and investment bank, markets businesses, and asset-management franchise can offset one another. That diversification is central to the thesis.

**Strongest evidence:** Excluding significant items, second-quarter 2026 net income was $16.9 billion and return on tangible common equity was 23%. Average loans grew 10% year over year, deposits grew 7%, investment-banking fees rose 30%, markets revenue rose 35%, and assets under management reached $5.1 trillion.

**Strongest counterargument:** The firm recorded $2.5 billion of credit costs, including $2.4 billion of net charge-offs. A weaker consumer or corporate-credit environment can reduce earnings even if revenue stays healthy. Management also described the market environment as particularly favorable, so the strongest trading and banking results should not be treated as automatic run-rate earnings.

**What would change the view:** Watch net charge-offs, reserve building, deposit costs, loan growth, and whether investment-banking and markets activity remains broad. Faster credit deterioration without matching revenue growth would weaken the case.

Primary sources: [JPMorgan second-quarter 2026 earnings release](https://www.jpmorganchase.com/content/dam/jpmc/jpmorgan-chase-and-co/investor-relations/documents/quarterly-earnings/2026/2nd-quarter/6cded9fd-a164-4e6c-8cff-377357cf105c.pdf), [JPMorgan investor relations](https://www.jpmorganchase.com/ir)

### COST — high-quality membership economics, with valuation as the central challenge

**Direct answer:** Costco's operating evidence remains strong: shoppers are spending more, comparable sales are healthy, and digitally enabled sales are growing quickly. The main challenge is not business quality; it is how much investors are paying for that quality.

**What is distinctive now:** Costco intentionally runs merchandise at low margins and earns customer loyalty through membership. Sales growth, traffic, membership renewal, and fee economics matter more than a typical retailer's product-margin story.

**Strongest evidence:** Fiscal Q3 2026 net sales increased 11.6% to $69.15 billion. Comparable sales adjusted for gasoline and currency grew 6.6% company-wide, while digitally enabled comparable sales grew 20.8%.

**Strongest counterargument:** At roughly 45 times trailing earnings in the September 10 market snapshot, the share price leaves less room for ordinary execution. Slower comparable-sales growth, weaker membership renewal, or margin pressure could matter more to the stock than they would at a lower valuation.

**What would change the view:** The next full-quarter report is due September 24, 2026. Watch membership-fee growth and renewal, traffic versus ticket growth, merchandise margin, and whether digital growth remains additive rather than costly.

Primary sources: [Costco fiscal Q3 2026 results](https://investor.costco.com/news/news-details/2026/Costco-Wholesale-Corporation-Reports-Third-Quarter-and-Year-To-Date-Operating-Results-For-Fiscal-2026/default.aspx), [Costco events and presentations](https://investor.costco.com/events-and-presentations/)

### XOM — cash-generative but inseparable from commodity conditions

**Direct answer:** ExxonMobil's latest cash generation is strong, supporting dividends, repurchases, and investment. Unlike Nvidia or Costco, however, much of the near-term result depends on commodity prices and refining conditions that management does not control.

**What is distinctive now:** ExxonMobil combines upstream production with refining and chemicals. That integration can soften—but not remove—energy-price cycles. The investment case therefore needs scenario analysis around oil, gas, refining margins, project execution, and capital allocation.

**Strongest evidence:** ExxonMobil reported second-quarter 2026 adjusted earnings of $14.7 billion, operating cash flow of $23.6 billion, and free cash flow of $17.2 billion. It returned $9.4 billion to shareholders, including $4.3 billion of dividends and $5.1 billion of repurchases.

**Strongest counterargument:** One quarter earlier, reported earnings were $4.2 billion and operating cash flow was $8.7 billion, illustrating how sharply results can move with market conditions and timing effects. A single strong quarter should not be projected forward without commodity scenarios.

**What would change the view:** Watch production growth and project delivery alongside realized commodity prices, refining margins, capital spending, and whether free cash flow continues to cover dividends and repurchases across weaker price scenarios.

Primary source: [ExxonMobil investor news releases](https://corporate.exxonmobil.com/news/news-releases)

### HIMS — fast platform growth with execution, regulatory, and financing risk

**Direct answer:** Hims & Hers is growing much faster than the other companies in this sample, but it also carries the widest range of outcomes. The evidence supports continued customer and revenue growth; the challenge is proving that expansion, personalization, and healthcare delivery can scale safely and profitably.

**What is distinctive now:** Hims is a consumer-health platform rather than a traditional retailer or healthcare provider. Subscriber growth, personalized treatment adoption, customer acquisition efficiency, clinical/regulatory execution, and access to important treatments all shape the thesis.

**Strongest evidence:** Second-quarter 2026 revenue was approximately $753 million, up 38% year over year, and subscribers approached 2.9 million, up 19%. Management raised full-year revenue guidance to $3.1–$3.3 billion and set adjusted EBITDA guidance at $275–$325 million.

**Strongest counterargument:** Growth requires healthcare and regulatory execution, not just software distribution. The company also issued $350 million of convertible notes to support international expansion, AI investment, and the proposed Eucalyptus acquisition. Those initiatives may create value, but they add integration, execution, and potential dilution risk.

**What would change the view:** Watch subscriber growth versus revenue per subscriber, adjusted EBITDA and cash conversion, regulatory or supplier changes affecting treatments, acquisition integration, and whether international expansion improves or consumes unit economics.

Primary sources: [Hims & Hers quarterly results](https://investors.hims.com/financials/quarterly-results/default.aspx), [Hims & Hers convertible notes announcement](https://investors.hims.com/news/news-details/2026/Hims--Hers-Health-Inc--Prices-Upsized-350-Million-Convertible-Senior-Notes-Offering-to-Support-International-Expansion-and-Accelerate-AI-Driven-Platform-Investment/default.aspx), [Hims & Hers Q2 2026 SEC filing directory](https://www.sec.gov/Archives/edgar/data/1773751/000177375126000163/)

## Prototype assessment

- Distinctiveness: pass. Each thesis is driven by a different economic model and risk structure rather than the same price indicators.
- Readability: provisional pass. The main conclusions are understandable, but terms such as gross margin, charge-offs, comparable sales, and free cash flow need inline explanations in the product.
- Grounding: pass for the cited facts above. A production validator still needs claim-to-evidence mapping at sentence level.
- Question awareness: not yet demonstrated beyond the shared overview question. The implementation must alter evidence selection and synthesis for risk, valuation, earnings, change, and comparison intents.
- Latency target: 20–45 seconds for a single company with progressive status; 45–90 seconds for a comparison.
- Cost target: cap at four model calls for one company and six for a comparison, with evidence and completed reports cached by source freshness.
- Failure behavior: if research or synthesis fails, show the deterministic technical snapshot as a clearly labeled fallback, not as the completed deep analysis.

## Recommended implementation slice after approval

1. Add `question` and classified `intent` to the foreground API contract and database.
2. Build the company evidence dossier from SEC filings, investor-relations results, price history, and material-news sources.
3. Run the four structured AI passes with explicit evidence IDs.
4. Validate every factual sentence against cited evidence and reject unsupported output.
5. Make the visible research journey reflect actual server stages using streaming events.
6. Render the six-part answer first; keep raw engine evidence and calculations expandable.
7. Add per-request call, token, cost, and time ceilings plus paid-provider capacity and fallback.
8. Test the five prototypes plus risk, valuation, earnings, change, and comparison questions before release.
