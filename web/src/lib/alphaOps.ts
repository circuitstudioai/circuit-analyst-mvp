type ProviderUsage = { provider: string; units: number; cost_usd: number | string }
type AnalysisRequest = { status: string }

export function summarizeAlphaOps(providerRows: ProviderUsage[], analyses: AnalysisRequest[]) {
  const providerCostUsd = Number(providerRows.reduce((sum, row) => sum + Number(row.cost_usd || 0), 0).toFixed(4))
  const degradedAnalyses = analyses.filter((row) => row.status === 'partial' || row.status === 'failed').length
  return {
    providerCalls: providerRows.length,
    providerUnits: providerRows.reduce((sum, row) => sum + Number(row.units || 0), 0),
    providerCostUsd,
    analyses: analyses.length,
    degradedAnalyses,
    errorRate: analyses.length ? degradedAnalyses / analyses.length : 0,
  }
}
