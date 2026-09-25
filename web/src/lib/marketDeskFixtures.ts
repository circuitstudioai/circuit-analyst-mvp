import { CompanyDeskRecord, MarketDeskFixture, ResearchEvent, ThesisClaim, ThesisVersion } from './marketDesk'

const date = '2026-09-19T16:00:00Z'
const retrieved = '2026-09-19T18:30:00Z'

function evidence(symbol: string, id: string, sourceName: string, sourceUrl: string, fact: string, passage: string, freshness: 'current' | 'stale' | 'missing' = 'current') {
  return { id: `${symbol.toLowerCase()}-${id}`, sourceType: 'earnings' as const, sourceName, sourceUrl, passage, normalizedFact: fact, publishedAt: date, retrievedAt: retrieved, freshness, confidence: freshness === 'current' ? .91 : .58 }
}

function claim(symbol: string, id: string, title: string, detail: string, state: ThesisClaim['state'], evidenceId: string, kind: ThesisClaim['kind'] = 'fact'): ThesisClaim {
  return { id: `${symbol.toLowerCase()}-${id}`, title, detail, kind, importance: id === 'c1' ? 'core' : 'supporting', state, confidence: state === 'uncertain' ? .52 : .82, evidenceIds: evidenceId ? [`${symbol.toLowerCase()}-${evidenceId}`] : [] }
}

function thesis(symbol: string, version: number, stance: ThesisVersion['stance'], status: ThesisVersion['status'], valuation: ThesisVersion['valuation'], summary: string, claims: ThesisClaim[]): ThesisVersion {
  return { id: `${symbol.toLowerCase()}-v${version}`, version, cutoff: version === 1 ? '2026-08-20T16:00:00Z' : date, stance, status, valuation, confidence: stance === 'insufficient_evidence' ? .48 : .78, summary, claims, published: true }
}

const companies: CompanyDeskRecord[] = [
  {
    id: 'company-nvda', symbol: 'NVDA', name: 'NVIDIA', sector: 'Semiconductors', archetype: 'High-growth platform', mandate: 'exploring', concern: 'Can AI infrastructure demand absorb premium expectations?',
    bullCase: 'Accelerated computing remains a durable platform shift with pricing power and an expanding software layer.',
    bearCase: 'Customer concentration, transition costs, export controls, and heroic expectations leave little room for execution misses.',
    pricedIn: 'Sustained hyperscaler spending and a smooth product transition are substantially reflected in expectations.',
    catalysts: ['Next-quarter gross-margin guide', 'Blackwell supply ramp'], invalidation: ['Two consecutive quarters below 70% gross-margin guidance', 'Material hyperscaler capex retrenchment'],
    evidence: [
      evidence('NVDA', 'e1', 'NVIDIA quarterly results', 'https://investor.nvidia.com/financial-info/financial-reports-and-results/', 'Gross-margin guidance moved below the prior baseline.', 'Management guided the next quarter below the margin level embedded in the baseline thesis.'),
      evidence('NVDA', 'e2', 'NVIDIA earnings commentary', 'https://investor.nvidia.com/events-and-presentations/', 'Demand commentary remained strong while transition costs increased.', 'Demand visibility remained constructive; product-transition costs weighed on near-term margin.'),
      evidence('NVDA', 'e3', 'NVIDIA Form 10-Q', 'https://www.sec.gov/edgar/browse/?CIK=1045810&owner=exclude', 'Large customers remain an important concentration.', 'A limited number of direct and indirect customers represented a meaningful share of revenue.'),
    ],
    thesisVersions: [], currentThesis: {} as ThesisVersion,
  },
  {
    id: 'company-cost', symbol: 'COST', name: 'Costco', sector: 'Consumer staples', archetype: 'Quality compounder', mandate: 'watching', concern: 'Does operating quality justify the valuation premium?',
    bullCase: 'Membership renewal, traffic, and limited SKU economics create unusually resilient growth and loyalty.',
    bearCase: 'A premium multiple makes even healthy execution vulnerable to modest normalization.',
    pricedIn: 'Continued high renewal and consistent traffic growth are already expected.', catalysts: ['Monthly sales update', 'Membership-fee flow-through'], invalidation: ['Sustained renewal deterioration', 'Traffic growth turns negative'],
    evidence: [
      evidence('COST', 'e1', 'Costco monthly sales', 'https://investor.costco.com/news/default.aspx', 'Comparable sales remained positive with stable traffic.', 'Reported comparable sales and traffic remained positive in the latest update.'),
      evidence('COST', 'e2', 'Costco Form 10-K', 'https://www.sec.gov/edgar/browse/?CIK=909832&owner=exclude', 'Membership renewal remained above 90% in core markets.', 'Reported renewal rates remained above 90 percent in the U.S. and Canada.'),
      evidence('COST', 'e3', 'Market price context', 'https://finance.yahoo.com/quote/COST/', 'The valuation remains above its longer-run range.', 'The current earnings multiple remains elevated relative to the company’s longer-run range.'),
    ], thesisVersions: [], currentThesis: {} as ThesisVersion,
  },
  {
    id: 'company-xom', symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', archetype: 'Commodity cyclical', mandate: 'owned', concern: 'How much of the case depends on the oil-price deck?',
    bullCase: 'Low-cost supply, integration, and disciplined capital returns support cash generation across the cycle.',
    bearCase: 'Commodity prices dominate near-term outcomes and can overwhelm execution gains.',
    pricedIn: 'A mid-cycle oil environment and continuing distributions are reflected in the base case.', catalysts: ['Quarterly production update', 'Guyana project milestones'], invalidation: ['Cash breakeven rises above the modeled band', 'Capital discipline weakens materially'],
    evidence: [
      evidence('XOM', 'e1', 'ExxonMobil results', 'https://investor.exxonmobil.com/company-information/earnings', 'Production gains offset part of weaker commodity realizations.', 'Higher advantaged production partially offset lower realizations.'),
      evidence('XOM', 'e2', 'ExxonMobil project update', 'https://corporate.exxonmobil.com/news/news-releases', 'Guyana project timing remains on plan.', 'The company maintained the disclosed project schedule for its next Guyana development.'),
      evidence('XOM', 'e3', 'Commodity reference data', 'https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm', 'The current oil deck is below the prior-quarter average.', 'Benchmark spot prices were below the prior-quarter average during the observed window.'),
    ], thesisVersions: [], currentThesis: {} as ThesisVersion,
  },
  {
    id: 'company-jpm', symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', archetype: 'Regulated financial', mandate: 'watching', concern: 'Are credit normalization and capital rules adequately reflected?',
    bullCase: 'Scale, deposit franchise, fee diversity, and risk controls provide through-cycle resilience.',
    bearCase: 'Credit normalization and capital requirements can compress returns despite strong operations.',
    pricedIn: 'A benign credit path and durable net-interest income are partly embedded.', catalysts: ['Investor day', 'Regulatory capital proposal'], invalidation: ['Material reserve miss', 'Sustained ROTCE compression below the base case'],
    evidence: [
      evidence('JPM', 'e1', 'JPMorgan results', 'https://www.jpmorganchase.com/ir/quarterly-earnings', 'Card charge-offs normalized upward within guidance.', 'Net charge-offs increased while remaining within the firm’s disclosed outlook.'),
      evidence('JPM', 'e2', 'JPMorgan supplement', 'https://www.jpmorganchase.com/ir/quarterly-earnings', 'Net-interest income stayed above the prior planning baseline.', 'Reported net-interest income remained above the earlier planning baseline.'),
      evidence('JPM', 'e3', 'Federal Reserve capital framework', 'https://www.federalreserve.gov/supervisionreg/capital-framework.htm', 'The final capital impact remains unresolved.', 'The applicable capital framework is still subject to a final rule and firm-specific implementation.', 'stale'),
    ], thesisVersions: [], currentThesis: {} as ThesisVersion,
  },
  {
    id: 'company-hims', symbol: 'HIMS', name: 'Hims & Hers', sector: 'Health care', archetype: 'Emerging consumer-health platform', mandate: 'exploring', concern: 'Is growth durable under changing compounding rules?',
    bullCase: 'A scaled consumer funnel and personalized care platform can expand categories and lifetime value.',
    bearCase: 'Regulatory uncertainty and product-mix opacity make current growth quality difficult to underwrite.',
    pricedIn: 'Rapid subscriber and revenue growth are expected to persist.', catalysts: ['Regulatory update', 'Next subscriber cohort disclosure'], invalidation: ['Core organic growth decelerates sharply', 'Access to a key treatment category is curtailed'],
    evidence: [
      evidence('HIMS', 'e1', 'Hims & Hers shareholder letter', 'https://investors.hims.com/financials/quarterly-results/default.aspx', 'Subscriber growth remained strong.', 'The company reported continued year-over-year subscriber growth.'),
      evidence('HIMS', 'e2', 'FDA drug shortages', 'https://dps.fda.gov/drugshortages', 'Regulatory availability conditions may change.', 'Shortage status and enforcement conditions for relevant active ingredients remain material to access.'),
      evidence('HIMS', 'e3', 'Hims & Hers Form 10-Q', 'https://www.sec.gov/edgar/browse/?CIK=1773751&owner=exclude', 'Category-level contribution is not sufficiently disclosed.', 'Disclosures do not provide enough category-level economics to isolate the durability of the newest treatment cohort.', 'missing'),
    ], thesisVersions: [], currentThesis: {} as ThesisVersion,
  },
]

const thesisInputs: Record<string, [ThesisVersion, ThesisVersion]> = {
  NVDA: [
    thesis('NVDA', 1, 'favorable', 'strengthened', 'expectations_stretched', 'Demand and execution supported the case, though expectations were demanding.', [claim('NVDA','c1','AI demand durability','Hyperscaler demand supports continued platform growth.','supported','e2'), claim('NVDA','c2','Transition margins','The product transition can hold gross margin near the prior baseline.','supported','e1'), claim('NVDA','c3','Customer concentration','Concentration remains manageable but important.','watch','e3')]),
    thesis('NVDA', 2, 'favorable', 'under_pressure', 'expectations_stretched', 'Demand remains constructive, but the margin assumption is now under pressure.', [claim('NVDA','c1','AI demand durability','Hyperscaler demand supports continued platform growth.','supported','e2'), claim('NVDA','c2','Transition margins','The latest guide challenges the prior margin baseline.','challenged','e1'), claim('NVDA','c3','Customer concentration','Concentration remains manageable but important.','watch','e3')]),
  ],
  COST: [
    thesis('COST',1,'favorable','unchanged','expectations_stretched','Operating quality remained high and valuation remained demanding.',[claim('COST','c1','Membership engine','Renewal supports recurring economics.','supported','e2'),claim('COST','c2','Traffic resilience','Traffic continues to support comparable sales.','supported','e1'),claim('COST','c3','Valuation tolerance','The premium leaves limited room for normalization.','watch','e3')]),
    thesis('COST',2,'favorable','unchanged','expectations_stretched','The new sales update supports the operating case but does not change the thesis.',[claim('COST','c1','Membership engine','Renewal supports recurring economics.','supported','e2'),claim('COST','c2','Traffic resilience','The latest update confirms positive traffic.','supported','e1'),claim('COST','c3','Valuation tolerance','The premium leaves limited room for normalization.','watch','e3')]),
  ],
  XOM: [
    thesis('XOM',1,'mixed','unchanged','fair','Execution was solid, with outcomes still controlled by commodity scenarios.',[claim('XOM','c1','Low-cost volume growth','Advantaged production supports through-cycle cash flow.','supported','e1'),claim('XOM','c2','Commodity sensitivity','The base case assumes a mid-cycle oil deck.','watch','e3'),claim('XOM','c3','Project execution','Guyana milestones remain on schedule.','supported','e2')]),
    thesis('XOM',2,'mixed','under_pressure','fair','A lower price deck adds pressure, partly offset by volume and project execution.',[claim('XOM','c1','Low-cost volume growth','Advantaged production supports through-cycle cash flow.','supported','e1'),claim('XOM','c2','Commodity sensitivity','Current prices challenge the prior cash-flow scenario.','challenged','e3'),claim('XOM','c3','Project execution','Guyana milestones remain on schedule.','supported','e2')]),
  ],
  JPM: [
    thesis('JPM',1,'favorable','unchanged','fair','Franchise strength offset expected credit normalization.',[claim('JPM','c1','Earnings resilience','Diversified earnings support through-cycle returns.','supported','e2'),claim('JPM','c2','Credit normalization','Losses can normalize within the guided range.','supported','e1'),claim('JPM','c3','Capital burden','The capital impact remains uncertain.','uncertain','e3')]),
    thesis('JPM',2,'mixed','unchanged','fair','Operating evidence remains strong, while capital and credit lenses disagree on the margin of safety.',[claim('JPM','c1','Earnings resilience','Diversified earnings support through-cycle returns.','supported','e2'),claim('JPM','c2','Credit normalization','Losses remain within guidance but deserve monitoring.','watch','e1'),claim('JPM','c3','Capital burden','The final capital impact remains uncertain.','uncertain','e3')]),
  ],
  HIMS: [
    thesis('HIMS',1,'mixed','unchanged','expectations_stretched','Growth was visible, but category economics and regulation limited confidence.',[claim('HIMS','c1','Subscriber growth','Consumer demand continues to expand.','supported','e1'),claim('HIMS','c2','Regulatory access','Treatment access remains exposed to changing rules.','uncertain','e2'),claim('HIMS','c3','Growth quality','Category-level contribution is not disclosed.','uncertain','e3')]),
    thesis('HIMS',2,'insufficient_evidence','under_pressure','insufficient_evidence','Growth remains visible, but missing cohort economics and regulatory clarity prevent a supported conclusion.',[claim('HIMS','c1','Subscriber growth','Consumer demand continues to expand.','supported','e1'),claim('HIMS','c2','Regulatory access','Treatment access remains exposed to changing rules.','challenged','e2'),claim('HIMS','c3','Growth quality','Missing category economics prevent a durable margin conclusion.','uncertain','e3')]),
  ],
}

for (const company of companies) {
  company.thesisVersions = thesisInputs[company.symbol]
  company.currentThesis = company.thesisVersions[1]
}

function event(input: Omit<ResearchEvent, 'decisionObject'>): ResearchEvent {
  const preference: Record<ResearchEvent['eventType'], ResearchEvent['availableObjects'][number]> = { guidance: 'scenario', results: 'expectations_results', evidence_conflict: 'conflict_map', catalyst: 'timeline', filing: 'peer_comparison' }
  return { ...input, decisionObject: input.availableObjects.includes(preference[input.eventType]) ? preference[input.eventType] : input.availableObjects[0] }
}

const events: ResearchEvent[] = [
  event({ id:'event-nvda-margin', companyId:'company-nvda', category:'assumption_pressure', thesisEffect:'challenged', eventType:'guidance', state:'ready', title:'The margin bridge now carries more weight', affectedClaimId:'nvda-c2', before:'Transition margins could hold near the prior baseline.', after:'The latest guide falls below that baseline.', whyItMatters:'A few points of durable margin compression materially change earnings power at today’s expectations.', bullInterpretation:'The pressure is temporary product-transition cost while demand and pricing remain strong.', bearInterpretation:'The margin reset may be structural as supply, mix, and competition normalize.', resolution:'Next-quarter gross-margin guidance and evidence on product mix.', materiality:94, reliability:92, publishedAt:'2026-09-19T16:00:00Z', evidenceIds:['nvda-e1','nvda-e2'], availableObjects:['scenario','timeline'], read:false }),
  event({ id:'event-cost-sales', companyId:'company-cost', category:'new_evidence', thesisEffect:'no_change', eventType:'results', state:'ready', title:'Healthy traffic confirms the existing case', affectedClaimId:'cost-c2', before:'Traffic was expected to remain positive.', after:'The latest monthly release confirms positive traffic.', whyItMatters:'It supports the operating thesis, but the magnitude is not enough to change the valuation tension.', bullInterpretation:'The membership flywheel continues to translate into resilient store traffic.', bearInterpretation:'Steady execution is already required by the premium valuation.', resolution:'A sustained change in traffic or renewal, not one monthly print.', materiality:42, reliability:91, publishedAt:'2026-09-19T17:30:00Z', evidenceIds:['cost-e1','cost-e3'], availableObjects:['expectations_results','peer_comparison'], read:false }),
  event({ id:'event-xom-deck', companyId:'company-xom', category:'thesis_changed', thesisEffect:'challenged', eventType:'guidance', state:'stale', title:'The cash-flow case is more price-sensitive', affectedClaimId:'xom-c2', before:'The base case used a mid-cycle oil deck.', after:'The observed price window is below the prior-quarter average.', whyItMatters:'Commodity assumptions can overwhelm otherwise strong project execution.', bullInterpretation:'Low-cost volume growth offsets part of the weaker deck.', bearInterpretation:'Distributions become less protected if the lower deck persists.', resolution:'Refresh the price deck and compare it with the next production update.', materiality:87, reliability:72, publishedAt:'2026-09-18T14:00:00Z', evidenceIds:['xom-e1','xom-e3'], availableObjects:['scenario','timeline'], read:false }),
  event({ id:'event-jpm-lenses', companyId:'company-jpm', category:'disagreement', thesisEffect:'no_change', eventType:'evidence_conflict', state:'partial', title:'Strong earnings, narrower margin of safety', affectedClaimId:'jpm-c2', before:'Credit normalization looked comfortably contained.', after:'Credit remains within guidance, while the risk lens assigns more weight to late-cycle losses.', whyItMatters:'The same evidence supports different conclusions depending on how much weight goes to current earnings versus tail risk.', bullInterpretation:'Earnings diversity and reserves keep normalization manageable.', bearInterpretation:'Current loss rates can lag stress and capital requirements remain unresolved.', resolution:'Final capital rules and two more quarters of vintage-level credit data.', materiality:74, reliability:78, publishedAt:'2026-09-17T12:00:00Z', evidenceIds:['jpm-e1','jpm-e2','jpm-e3'], availableObjects:['conflict_map'], read:false }),
  event({ id:'event-hims-regulation', companyId:'company-hims', category:'thesis_changed', thesisEffect:'challenged', eventType:'catalyst', state:'failed', title:'Regulatory clarity is now the gating evidence', affectedClaimId:'hims-c2', before:'Access uncertainty was a secondary risk.', after:'Changing availability conditions make it central to the growth-quality case.', whyItMatters:'Without stable access and cohort economics, recent growth cannot be confidently extrapolated.', bullInterpretation:'The platform can shift mix and retain demand across treatment categories.', bearInterpretation:'A key growth cohort may be less durable than headline subscriber growth suggests.', resolution:'A verified regulatory update plus category-level retention and contribution data.', materiality:90, reliability:64, publishedAt:'2026-09-16T15:00:00Z', evidenceIds:['hims-e1','hims-e2','hims-e3'], availableObjects:['timeline','scenario'], read:false }),
]

export const marketDeskFixture: MarketDeskFixture = {
  asOf: retrieved,
  generatedFrom: 'controlled_fixture',
  processedSilently: 38,
  companies,
  events,
  modelDecisions: [
    { id:'model-nvda', companyId:'company-nvda', strategy:'Quality growth with valuation discipline', version:'1.2', horizon:'12–24 months', classification:'hold', confidence:.68, assumptions:['AI capex remains durable','Gross margin recovers after transition'], invalidation:'Two quarters of sub-70% margin guidance', asOf:date, freshness:'Current through fixture cutoff', evaluationStatus:'Walk-forward evaluation in progress' },
    { id:'model-jpm', companyId:'company-jpm', strategy:'Through-cycle bank quality', version:'0.9', horizon:'18–36 months', classification:'buy', confidence:.61, assumptions:['Credit remains within normalized range','Capital impact is manageable'], invalidation:'Reserve development exceeds the declared stress band', asOf:date, freshness:'Capital evidence is stale', evaluationStatus:'Insufficient completed cycles for performance claim' },
    { id:'model-hims', companyId:'company-hims', strategy:'Emerging platform growth', version:'0.7', horizon:'12–24 months', classification:'sell', confidence:.55, assumptions:['Regulatory access determines the newest cohort economics'], invalidation:'Verified durable access plus disclosed cohort contribution', asOf:date, freshness:'Missing category economics', evaluationStatus:'Experimental; not promoted' },
  ],
}
