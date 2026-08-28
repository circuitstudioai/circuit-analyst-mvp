import { GoogleGenAI } from '@google/genai'
import { AnalyzeResponse, SignalRow } from './types'

const cache = new Map<string, { expires: number; text: string }>()
const TTL_MS = 1000 * 60 * 30

export type GeminiSummary = NonNullable<AnalyzeResponse['aiSummary']>
type Generate = (prompt: string, model: string) => Promise<string>

function safeErrorCode(error: unknown) {
  const value = error as { status?: number; code?: number | string; message?: string }
  const status = Number(value?.status || value?.code)
  const message = String(value?.message || '').toLowerCase()
  if (status === 401 || status === 403 || message.includes('api key')) return 'auth'
  if (status === 404 || message.includes('not found') || message.includes('model')) return 'model'
  if (status === 429 || message.includes('quota') || message.includes('rate')) return 'quota'
  if (message.includes('timeout')) return 'timeout'
  return 'provider'
}

export async function enrichWithGemini(
  signals: SignalRow[],
  regimeScore: number,
  options: { generate?: Generate; model?: string } = {},
): Promise<{ signals: SignalRow[]; summary: GeminiSummary }> {
  const apiKey = process.env.GEMINI_API_KEY
  const model = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  if (!apiKey && !options.generate) {
    return { signals: signals.map((s) => ({ ...s, aiStatus: 'skipped' })), summary: { status: 'skipped', model: null, generated: 0, cached: 0, failed: 0 } }
  }
  const ai = options.generate ? null : new GoogleGenAI({ apiKey: apiKey! })
  const generate: Generate = options.generate || (async (prompt, selectedModel) => {
    const response = await ai!.models.generateContent({ model: selectedModel, contents: prompt })
    return (response.text || '').trim()
  })

  const out: SignalRow[] = []
  let generated = 0
  let cachedCount = 0
  let failed = 0
  for (const s of signals) {
    try {
      const cacheKey = `${model}:${s.symbol}:${s.decision}:${s.score}:${s.confidence}:${regimeScore}:${s.thesis}`
      const cached = cache.get(cacheKey)
      if (cached && cached.expires > Date.now()) {
        out.push({
          ...s,
          evidence: [...s.evidence, { label: 'Gemini note', detail: 'Served from server cache', strength: 'cache' }],
          aiExplanation: cached.text,
          aiStatus: 'cached',
        })
        cachedCount += 1
        continue
      }
      const prompt = `You are a concise market analyst writing educational decision-support, not personalized financial advice. Add 2 short practical bullets.\nSymbol: ${s.symbol}\nDecision: ${s.decision}\nScore: ${s.score}\nConfidence: ${s.confidence}\nRegime score: ${regimeScore}\nThesis: ${s.thesis}\nRisks: ${s.riskFlags.join('; ')}\nInvalidation: ${s.invalidation}\nReasons: ${s.reasons.join('; ')}`
      const txt = (await generate(prompt, model)).trim()
      if (txt) cache.set(cacheKey, { expires: Date.now() + TTL_MS, text: txt })
      out.push({
        ...s,
        evidence: txt ? [...s.evidence, { label: 'Gemini note', detail: 'Generated server-side with provider key kept off the browser', strength: 'ai' }] : s.evidence,
        aiExplanation: txt || undefined,
        aiStatus: txt ? 'complete' : 'fallback',
        aiErrorCode: txt ? undefined : 'empty',
      })
      if (txt) generated += 1
      else failed += 1
    } catch (error) {
      const errorCode = safeErrorCode(error)
      failed += 1
      console.warn('[gemini]', JSON.stringify({ symbol: s.symbol, model, status: 'error', errorCode }))
      out.push({ ...s, aiStatus: 'fallback', aiErrorCode: errorCode })
    }
  }
  const success = generated + cachedCount
  const status = success === signals.length ? 'complete' : success > 0 ? 'partial' : 'fallback'
  return { signals: out, summary: { status, model, generated, cached: cachedCount, failed } }
}

export function applyGeminiEnrichment(base: AnalyzeResponse, enrichment: { signals: SignalRow[]; summary: GeminiSummary }): AnalyzeResponse {
  const summary = enrichment.summary
  const status = summary.status === 'complete' ? 'complete' : summary.status === 'skipped' ? 'skipped' : 'fallback'
  const detail = summary.status === 'complete'
    ? `${summary.generated} generated, ${summary.cached} cached with ${summary.model}`
    : summary.status === 'partial'
      ? `${summary.generated + summary.cached} enriched, ${summary.failed} fell back to deterministic analysis`
      : summary.status === 'skipped'
        ? 'Gemini is not configured; deterministic analysis is complete'
        : `Gemini unavailable for ${summary.failed} symbols; deterministic analysis shown`
  return {
    ...base,
    signals: enrichment.signals,
    aiSummary: summary,
    pipeline: base.pipeline.map((step) => step.label === 'AI summary' ? { ...step, status, detail } : step),
  }
}
