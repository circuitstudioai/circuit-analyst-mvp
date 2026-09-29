export type ResearchArchetype = 'high_growth_platform' | 'quality_compounder' | 'commodity_cyclical' | 'regulated_financial' | 'emerging_consumer_health'

export type ResearchLens = {
  id: string
  title: string
  required: boolean
}

export type ResearchTemplate = {
  archetype: ResearchArchetype
  version: string
  lenses: ResearchLens[]
}

export const researchTemplateVersion = '2026-09-29'

export const researchTemplates: Record<ResearchArchetype, ResearchTemplate> = {
  high_growth_platform: { archetype: 'high_growth_platform', version: researchTemplateVersion, lenses: [
    { id: 'demand', title: 'Demand durability', required: true },
    { id: 'margins', title: 'Margin bridge', required: true },
    { id: 'concentration', title: 'Customer concentration', required: true },
  ] },
  quality_compounder: { archetype: 'quality_compounder', version: researchTemplateVersion, lenses: [
    { id: 'retention', title: 'Retention engine', required: true },
    { id: 'traffic', title: 'Traffic resilience', required: true },
    { id: 'valuation', title: 'Valuation tension', required: true },
  ] },
  commodity_cyclical: { archetype: 'commodity_cyclical', version: researchTemplateVersion, lenses: [
    { id: 'volume', title: 'Low-cost volume', required: true },
    { id: 'commodity', title: 'Commodity sensitivity', required: true },
    { id: 'projects', title: 'Project execution', required: true },
  ] },
  regulated_financial: { archetype: 'regulated_financial', version: researchTemplateVersion, lenses: [
    { id: 'earnings', title: 'Earnings resilience', required: true },
    { id: 'credit', title: 'Credit normalization', required: true },
    { id: 'capital', title: 'Capital burden', required: true },
  ] },
  emerging_consumer_health: { archetype: 'emerging_consumer_health', version: researchTemplateVersion, lenses: [
    { id: 'growth', title: 'Subscriber growth', required: true },
    { id: 'access', title: 'Regulatory access', required: true },
    { id: 'quality', title: 'Growth quality', required: true },
  ] },
}

export const pilotCompanies = [
  { symbol: 'NVDA', name: 'NVIDIA', cik: '0001045810', archetype: 'high_growth_platform' },
  { symbol: 'COST', name: 'Costco', cik: '0000909832', archetype: 'quality_compounder' },
  { symbol: 'XOM', name: 'Exxon Mobil', cik: '0000034088', archetype: 'commodity_cyclical' },
  { symbol: 'JPM', name: 'JPMorgan Chase', cik: '0000019617', archetype: 'regulated_financial' },
  { symbol: 'HIMS', name: 'Hims & Hers', cik: '0001773751', archetype: 'emerging_consumer_health' },
] as const satisfies ReadonlyArray<{ symbol: string; name: string; cik: string; archetype: ResearchArchetype }>

export type CoverageGap = {
  archetype: ResearchArchetype
  source: string
  status: 'covered_in_five_company_slice' | 'missing'
  missingBehavior: string
}

export const sourceCoverageMatrix: CoverageGap[] = [
  { archetype: 'high_growth_platform', source: 'sec_filing', status: 'covered_in_five_company_slice', missingBehavior: 'Abstain on the unfilled lens.' },
  { archetype: 'high_growth_platform', source: 'licensed_estimates', status: 'missing', missingBehavior: 'Do not invent consensus revisions.' },
  { archetype: 'quality_compounder', source: 'sec_filing', status: 'covered_in_five_company_slice', missingBehavior: 'Abstain on the unfilled lens.' },
  { archetype: 'quality_compounder', source: 'monthly_sales_feed', status: 'missing', missingBehavior: 'Keep the traffic lens uncertain until a primary source is licensed.' },
  { archetype: 'commodity_cyclical', source: 'sec_filing', status: 'covered_in_five_company_slice', missingBehavior: 'Abstain on the unfilled lens.' },
  { archetype: 'commodity_cyclical', source: 'commodity_curve', status: 'missing', missingBehavior: 'Do not treat a spot print as a full price deck.' },
  { archetype: 'regulated_financial', source: 'sec_filing', status: 'covered_in_five_company_slice', missingBehavior: 'Abstain on the unfilled lens.' },
  { archetype: 'regulated_financial', source: 'call_report', status: 'missing', missingBehavior: 'Leave capital and credit lenses uncertain when bank-specific filings are absent.' },
  { archetype: 'emerging_consumer_health', source: 'sec_filing', status: 'covered_in_five_company_slice', missingBehavior: 'Abstain when category economics are undisclosed.' },
  { archetype: 'emerging_consumer_health', source: 'regulatory_feed', status: 'missing', missingBehavior: 'Do not infer enforcement posture from headlines.' },
]

export type PilotGateReport = {
  companiesCompleted: number
  reliability: number | null
  falsePositiveRate: number | null
  costPerCompanyUsd: number | null
  counselReviewRecorded: boolean
}

export const watchlistGates = {
  minimumCompanies: 25,
  minimumReliability: 0.99,
  maximumFalsePositiveRate: 0.15,
  maximumCostPerCompanyUsd: 2,
}

export function watchlistEligibility(report: PilotGateReport) {
  const reasons: string[] = []
  if (report.companiesCompleted < watchlistGates.minimumCompanies) reasons.push(`Pilot coverage is ${report.companiesCompleted} companies; user-selected watchlists stay closed until ${watchlistGates.minimumCompanies}.`)
  if (report.reliability === null || report.reliability < watchlistGates.minimumReliability) reasons.push('Update reliability has not cleared the pilot gate.')
  if (report.falsePositiveRate === null || report.falsePositiveRate > watchlistGates.maximumFalsePositiveRate) reasons.push('False-positive interruptions have not been measured under the pilot gate.')
  if (report.costPerCompanyUsd === null || report.costPerCompanyUsd > watchlistGates.maximumCostPerCompanyUsd) reasons.push('Cost per monitored company has not cleared the pilot gate.')
  if (!report.counselReviewRecorded) reasons.push('Securities-counsel review is not recorded. Alerts, personalization, and monetization stay off.')
  return { eligible: reasons.length === 0, reasons }
}

export const currentPilotGateReport: PilotGateReport = {
  companiesCompleted: pilotCompanies.length,
  reliability: null,
  falsePositiveRate: null,
  costPerCompanyUsd: null,
  counselReviewRecorded: false,
}
