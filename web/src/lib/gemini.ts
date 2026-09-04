import { GoogleGenAI } from '@google/genai'
import { AnalyzeResponse, SignalRow } from './types'

const cache = new Map<string, { expires: number; text: string }>()
const TTL_MS = 1000 * 60 * 30
const PROMPT_VERSION = 'plain-language-v1'

export type GeminiSummary = NonNullable<AnalyzeResponse['aiSummary']>
type Generate = (prompt: string, model: string) => Promise<string>

export function buildPlainLanguagePrompt(signal: SignalRow, regimeScore: number) {
  return `You explain a stock research brief to a self-directed investor in plain English.

Return exactly two Markdown bullets and nothing else:
- **What it means:** one sentence explaining the current setup.
- **What to watch:** one sentence naming the clearest price level, risk, or change that would matter next.

Writing rules:
- Use no more than 22 words per bullet after the bold label.
- Write at roughly a grade-7 reading level.
- Prefer everyday words. Do not use: trim exposure, long exposure, positioning, tighten stops, basis points, regime, model score, alpha, or conviction.
- Do not repeat raw internal scores or confidence values.
- Do not tell the reader to buy, sell, or trade. Describe what the evidence shows and what could change the view.
- Use dollar price levels when they make the next checkpoint clearer.
- Do not add disclaimers, headings, introductions, or extra bullets.

Research brief:
Symbol: ${signal.symbol}
Decision: ${signal.decision}
Internal score: ${signal.score}
Internal confidence: ${signal.confidence}
Market regime score: ${regimeScore}
Thesis: ${signal.thesis}
Risks: ${signal.riskFlags.join('; ')}
Invalidation: ${signal.invalidation}
Next action from rules engine: ${signal.nextAction}
Reasons: ${signal.reasons.join('; ')}`
}

function safeErrorCode(error: unknown) {
  const value = error as { status?: number; code?: number | string; message?: string }
  const status = Number(value?.status || value?.code)
  const message = String(value?.message || '').toLowerCase()
  if (status === 401 || status === 403 || message.includes('api key')) return 'auth'
  if (status === 429 || message.includes('quota') || message.includes('rate')) return 'quota'
  if (status === 404 || message.includes('not found') || message.includes('model')) return 'model'
  if (message.includes('timeout')) return 'timeout'
  return 'provider'
}

export async function enrichWithGemini(
  signals: SignalRow[],
  regimeScore: number,
  options: { generate?: Generate; model?: string } = {},
): Promise<{ signals: SignalRow[]; summary: GeminiSummary }> {
  const apiKey = process.env.GEMINI_API_KEY
  const model = options.model || process.env.GEMINI_MODEL || 'gemini-3.8-flash'
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
      const cacheKey = `${PROMPT_VERSION}:${model}:${s.symbol}:${s.decision}:${s.score}:${s.confidence}:${regimeScore}:${s.thesis}`
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
      const prompt = buildPlainLanguagePrompt(s, regimeScore)
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
      const providerError = error as { status?: number; code?: number | string; message?: string }
      failed += 1
      console.warn('[gemini]', JSON.stringify({
        symbol: s.symbol,
        model,
        status: Number(providerError?.status || providerError?.code) || null,
        errorCode,
        message: String(providerError?.message || 'unknown provider error').slice(0, 240),
      }))
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
