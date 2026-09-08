import { GoogleGenAI } from '@google/genai'
import { EngineOutput } from './consensus'
import { EvidenceItem, EvidencePacket, packet, validateEvidencePacket } from './evidence'
import { fetchSecEvidence } from './secFundamentals'
import { AnalyzeResponse, SignalRow } from './types'

type ResearchResponse = { view: 'bullish' | 'neutral' | 'bearish'; confidence: number; thesis: string; bull_case: string[]; bear_case: string[]; risks: string[]; catalysts: string[]; cited_evidence_ids: string[] }

function base(runId: number, signal: SignalRow, asOf: string, engine: string): Omit<EngineOutput, 'direction' | 'confidence'> {
  return { run_id: runId, ticker: signal.symbol, market: 'US', run_timestamp: asOf, engine_name: engine, time_horizon: engine === 'technical_regime' ? 'swing' : 'long_term', source_tag: 'scheduled_multi_engine' }
}

export function technicalPacket(signal: SignalRow, asOf: string) {
  const source = { provider: 'yahoo-chart', url: `https://query1.finance.yahoo.com/v8/finance/chart/${signal.symbol}`, retrieved_at: asOf, observed_at: signal.dataAsOf }
  const item = (id: string, metric: string, value: unknown, unit: string): EvidenceItem => ({ id, kind: 'fact', metric, value, unit, ticker: signal.symbol, period: 'latest', confidence: signal.marketDataStatus === 'live' ? 0.9 : 0, freshness_seconds: 0, missing_status: value === null ? 'unavailable' : 'present', source: value === null ? undefined : source })
  return packet(signal.symbol, asOf, 'technical_regime', [
    item('technical-last-price', 'last_price', signal.lastPrice || null, 'USD'),
    { id: 'technical-score', kind: 'calculation', metric: 'technical_score', value: signal.score, unit: 'ratio', ticker: signal.symbol, period: '20d/100d', confidence: signal.confidence, freshness_seconds: 0, missing_status: 'present', calculation: { method: 'trend_momentum_regime', formula: 'trend + momentum + regime_bias - volatility_penalty', inputs: { reasons: signal.reasons } } },
  ])
}

export function technicalOutput(runId: number, signal: SignalRow, asOf: string): EngineOutput {
  const evidence = technicalPacket(signal, asOf)
  const direction = signal.abstained ? 'neutral' : signal.decision === 'BUY' ? 'bullish' : signal.decision === 'SELL' ? 'bearish' : 'neutral'
  return { ...base(runId, signal, asOf, 'technical_regime'), direction, confidence: signal.abstained ? 0 : Math.round(signal.confidence * 100), thesis_summary: signal.thesis, bull_case: signal.bullCase, bear_case: signal.bearCase, risk_flags: signal.riskFlags, catalysts: signal.catalysts, suggested_next_action: signal.nextAction, raw_payload: { evidence_packet: evidence, abstained: signal.abstained, category_views: { trend: { direction, confidence: Math.round(signal.confidence * 100) }, risk: { direction: signal.riskFlags.length ? 'bearish' : 'neutral', confidence: 60 } } } }
}

function valuationItems(ticker: string, revenue: number, shares: number): EvidenceItem[] {
  return [{ name: 'bear', growth: -0.1, multiple: 1.5 }, { name: 'base', growth: 0.05, multiple: 3 }, { name: 'bull', growth: 0.2, multiple: 5 }].map((scenario) => ({
    id: `valuation-${scenario.name}`, kind: 'calculation', metric: `implied_value_${scenario.name}`, value: Number((revenue * (1 + scenario.growth) * scenario.multiple / shares).toFixed(2)), unit: 'USD/share', ticker, period: 'NTM', confidence: 0.6, freshness_seconds: 0, missing_status: 'present',
    calculation: { method: 'forward_revenue_multiple', formula: 'revenue * (1 + growth_rate) * multiple / shares', inputs: { revenue, shares, growth_rate: scenario.growth, multiple: scenario.multiple } }, notes: 'Scenario assumption, not a price prediction',
  })) as EvidenceItem[]
}

async function fundamentalsOutput(runId: number, signal: SignalRow, asOf: string): Promise<EngineOutput> {
  try {
    const sec = await fetchSecEvidence(signal.symbol, asOf)
    const revenue = Number(sec.items.find((item) => item.metric === 'revenue')?.value)
    const shares = Number(sec.items.find((item) => item.metric === 'shares_outstanding')?.value)
    const valuations = revenue > 0 && shares > 0 ? valuationItems(signal.symbol, revenue, shares) : []
    const evidence = packet(signal.symbol, asOf, 'fundamentals_valuation', [...sec.items, ...valuations], sec.metadata)
    const values = valuations.map((item) => Number(item.value)).sort((a, b) => a - b)
    const midpoint = values[1]
    const gap = midpoint && signal.lastPrice ? midpoint / signal.lastPrice - 1 : 0
    const direction = !midpoint ? 'neutral' : gap >= 0.15 ? 'bullish' : gap <= -0.15 ? 'bearish' : 'neutral'
    const confidence = !midpoint ? 20 : Math.min(85, Math.round(55 + Math.abs(gap) * 100))
    const missing = sec.items.filter((item) => item.missing_status !== 'present').map((item) => item.metric)
    return { ...base(runId, signal, asOf, 'fundamentals_valuation'), direction, confidence, thesis_summary: midpoint ? `Transparent scenario range $${values[0].toFixed(2)}–$${values.at(-1)!.toFixed(2)} versus $${signal.lastPrice.toFixed(2)}.` : 'Insufficient SEC evidence for valuation; engine abstained.', bull_case: direction === 'bullish' ? ['Current price is below the base scenario.'] : [], bear_case: direction === 'bearish' ? ['Current price is above the base scenario.'] : [], risk_flags: missing.map((metric) => `Missing SEC metric: ${metric}`), catalysts: ['Next SEC filing'], suggested_next_action: 'Review assumptions and refresh after the next filing.', raw_payload: { evidence_packet: evidence, abstained: !midpoint, category_views: { fundamentals: { direction: 'neutral', confidence: Math.max(20, 80 - missing.length * 10) }, valuation: { direction, confidence } } } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SEC provider failed'
    const evidence = packet(signal.symbol, asOf, 'fundamentals_valuation', [], { provider_error: message })
    return { ...base(runId, signal, asOf, 'fundamentals_valuation'), direction: 'neutral', confidence: 0, thesis_summary: 'Fundamentals engine abstained because SEC evidence was unavailable.', risk_flags: [message], raw_payload: { evidence_packet: evidence, abstained: true, category_views: { fundamentals: { direction: 'neutral', confidence: 0 }, valuation: { direction: 'neutral', confidence: 0 } } } }
  }
}

async function researchOutput(runId: number, signal: SignalRow, asOf: string, evidence: EvidencePacket): Promise<EngineOutput> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { ...base(runId, signal, asOf, 'ai_research'), direction: 'neutral', confidence: 0, thesis_summary: 'AI research engine abstained because Gemini is not configured.', raw_payload: { evidence_packet: evidence, abstained: true, category_views: { research: { direction: 'neutral', confidence: 0 } } } }
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    const ai = new GoogleGenAI({ apiKey: key })
    const prompt = `Analyze only this evidence packet. Return strict JSON with keys view, confidence (0-100), thesis, bull_case, bear_case, risks, catalysts, cited_evidence_ids. Every factual statement must be supported by an ID from the packet. If evidence is insufficient, use neutral and low confidence.\n${JSON.stringify(evidence)}`
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json', maxOutputTokens: 700 } })
    const parsed = JSON.parse(response.text || '{}') as ResearchResponse
    const allowed = new Set(evidence.items.map((item) => item.id))
    if (!['bullish', 'neutral', 'bearish'].includes(parsed.view) || !Number.isFinite(parsed.confidence) || parsed.confidence < 0 || parsed.confidence > 100 || !parsed.cited_evidence_ids?.length || parsed.cited_evidence_ids.some((id) => !allowed.has(id))) throw new Error('AI response failed evidence validation')
    const usage = response.usageMetadata
    return { ...base(runId, signal, asOf, 'ai_research'), direction: parsed.view, confidence: Math.round(parsed.confidence), thesis_summary: parsed.thesis, bull_case: parsed.bull_case || [], bear_case: parsed.bear_case || [], risk_flags: parsed.risks || [], catalysts: parsed.catalysts || [], suggested_next_action: 'Investigate disagreements and thesis invalidators.', raw_payload: { evidence_packet: evidence, cited_evidence_ids: parsed.cited_evidence_ids, model, usage: { prompt_tokens: usage?.promptTokenCount || 0, output_tokens: usage?.candidatesTokenCount || 0, total_tokens: usage?.totalTokenCount || 0 }, category_views: { research: { direction: parsed.view, confidence: parsed.confidence } } } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini research failed'
    return { ...base(runId, signal, asOf, 'ai_research'), direction: 'neutral', confidence: 0, thesis_summary: 'AI research engine abstained after evidence validation failed.', risk_flags: [message], raw_payload: { evidence_packet: evidence, abstained: true, category_views: { research: { direction: 'neutral', confidence: 0 } } } }
  }
}

export async function runMultiEngineAnalysis(analysis: AnalyzeResponse, runId: number) {
  const rows: EngineOutput[] = []
  for (const signal of analysis.signals) {
    const technical = technicalOutput(runId, signal, analysis.asOf)
    const fundamentals = await fundamentalsOutput(runId, signal, analysis.asOf)
    const technicalEvidence = (technical.raw_payload as { evidence_packet: EvidencePacket }).evidence_packet
    const fundamentalEvidence = (fundamentals.raw_payload as { evidence_packet: EvidencePacket }).evidence_packet
    const researchEvidence = packet(signal.symbol, analysis.asOf, 'ai_research', [...technicalEvidence.items, ...fundamentalEvidence.items], { source_engines: ['technical_regime', 'fundamentals_valuation'] })
    for (const evidence of [technicalEvidence, fundamentalEvidence, researchEvidence]) {
      const errors = validateEvidencePacket(evidence)
      if (errors.length) throw new Error(`${signal.symbol} evidence invalid: ${errors.join('; ')}`)
    }
    rows.push(technical, fundamentals, await researchOutput(runId, signal, analysis.asOf, researchEvidence))
  }
  return rows
}
