import { GoogleGenAI, ThinkingLevel } from '@google/genai'
import { EngineOutput } from './consensus'
import { EvidenceItem, EvidencePacket, packet, validateEvidencePacket } from './evidence'
import { fetchSecEvidence } from './secFundamentals'
import { AnalyzeResponse, SignalRow } from './types'

type ResearchResponse = { view: 'bullish' | 'neutral' | 'bearish'; confidence: number; thesis: string; cited_evidence_ids: string[] }

const researchResponseSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['view', 'confidence', 'thesis', 'cited_evidence_ids'],
    properties: {
      view: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] },
      confidence: { type: 'integer', minimum: 0, maximum: 100 },
      thesis: { type: 'string', maxLength: 180 },
      cited_evidence_ids: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
    },
  },
}

function asStrings(value: unknown) {
  if (Array.isArray(value)) return value.map(String).slice(0, 12)
  return value ? [String(value)] : []
}

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

function researchAbstention(runId: number, signal: SignalRow, asOf: string, evidence: EvidencePacket, message: string): EngineOutput {
  return { ...base(runId, signal, asOf, 'ai_research'), direction: 'neutral', confidence: 0, thesis_summary: 'AI research engine abstained because grounded research was unavailable.', risk_flags: [message], raw_payload: { evidence_packet: evidence, abstained: true, category_views: { research: { direction: 'neutral', confidence: 0 } } } }
}

async function researchOutputs(runId: number, inputs: Array<{ signal: SignalRow; evidence: EvidencePacket }>, asOf: string): Promise<EngineOutput[]> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return inputs.map(({ signal, evidence }) => researchAbstention(runId, signal, asOf, evidence, 'Gemini is not configured'))
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
    const ai = new GoogleGenAI({ apiKey: key })
    const prompt = `Analyze only these evidence packets. Return a strict JSON array in the same order, one compact object per packet, with exactly four keys: view, confidence (0-100), thesis, cited_evidence_ids. Every factual statement must cite an ID from its packet. Each thesis must be at most 20 words. Cite at most three IDs. If evidence is insufficient, use neutral and low confidence.\n${JSON.stringify(inputs.map((input) => input.evidence))}`
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json', responseJsonSchema: researchResponseSchema, maxOutputTokens: 1200, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } })
    const parsed = JSON.parse(response.text || '[]') as ResearchResponse[]
    if (!Array.isArray(parsed) || parsed.length !== inputs.length) throw new Error('AI response count mismatch')
    const usage = response.usageMetadata
    return parsed.map((research, index) => {
      const { signal, evidence } = inputs[index]
      const allowed = new Set(evidence.items.map((item) => item.id))
      const citedIds = asStrings(research.cited_evidence_ids)
      if (!['bullish', 'neutral', 'bearish'].includes(research.view) || !Number.isFinite(research.confidence) || research.confidence < 0 || research.confidence > 100 || !citedIds.length || citedIds.some((id) => !allowed.has(id))) throw new Error(`${signal.symbol} AI response failed evidence validation`)
      const requestUsage = index === 0 ? { prompt_tokens: usage?.promptTokenCount || 0, output_tokens: usage?.candidatesTokenCount || 0, total_tokens: usage?.totalTokenCount || 0 } : undefined
      return { ...base(runId, signal, asOf, 'ai_research'), direction: research.view, confidence: Math.round(research.confidence), thesis_summary: String(research.thesis || 'Evidence is mixed.'), bull_case: [], bear_case: [], risk_flags: [], catalysts: [], suggested_next_action: 'Investigate disagreements and thesis invalidators.', raw_payload: { evidence_packet: evidence, cited_evidence_ids: citedIds, model, usage: requestUsage, category_views: { research: { direction: research.view, confidence: research.confidence } } } } as EngineOutput
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini research failed'
    return inputs.map(({ signal, evidence }) => researchAbstention(runId, signal, asOf, evidence, message))
  }
}

export async function runMultiEngineAnalysis(analysis: AnalyzeResponse, runId: number) {
  const prepared = await Promise.all(analysis.signals.map(async (signal) => {
    const technical = technicalOutput(runId, signal, analysis.asOf)
    const fundamentals = await fundamentalsOutput(runId, signal, analysis.asOf)
    const technicalEvidence = (technical.raw_payload as { evidence_packet: EvidencePacket }).evidence_packet
    const fundamentalEvidence = (fundamentals.raw_payload as { evidence_packet: EvidencePacket }).evidence_packet
    const researchMetrics = new Set(['revenue', 'net_income', 'shares_outstanding', 'implied_value_base'])
    const researchEvidence = packet(signal.symbol, analysis.asOf, 'ai_research', [
      ...technicalEvidence.items,
      ...fundamentalEvidence.items.filter((item) => researchMetrics.has(item.metric)),
    ], { source_engines: ['technical_regime', 'fundamentals_valuation'], selection: 'decision-relevant-v1' })
    for (const evidence of [technicalEvidence, fundamentalEvidence, researchEvidence]) {
      const errors = validateEvidencePacket(evidence)
      if (errors.length) throw new Error(`${signal.symbol} evidence invalid: ${errors.join('; ')}`)
    }
    return { signal, technical, fundamentals, researchEvidence }
  }))
  const batches: typeof prepared[] = []
  for (let index = 0; index < prepared.length; index += 4) batches.push(prepared.slice(index, index + 4))
  const researched: EngineOutput[][] = []
  for (const batch of batches) {
    researched.push(await researchOutputs(runId, batch.map(({ signal, researchEvidence }) => ({ signal, evidence: researchEvidence })), analysis.asOf))
  }
  const researchByTicker = new Map(researched.flat().map((row) => [row.ticker, row]))
  return prepared.flatMap(({ signal, technical, fundamentals }) => [technical, fundamentals, researchByTicker.get(signal.symbol)!])
}
