import { GoogleGenAI } from '@google/genai'
import { SignalRow } from './types'

const cache = new Map<string, { expires: number; text: string }>()
const TTL_MS = 1000 * 60 * 30

export async function enrichWithGemini(signals: SignalRow[], regimeScore: number): Promise<SignalRow[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return signals

  const ai = new GoogleGenAI({ apiKey })
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

  const out: SignalRow[] = []
  for (const s of signals) {
    try {
      const cacheKey = `${model}:${s.symbol}:${s.decision}:${s.score}:${s.confidence}:${regimeScore}:${s.thesis}`
      const cached = cache.get(cacheKey)
      if (cached && cached.expires > Date.now()) {
        out.push({
          ...s,
          evidence: [...s.evidence, { label: 'Gemini note', detail: 'Served from server cache', strength: 'cache' }],
          aiExplanation: cached.text,
        })
        continue
      }
      const prompt = `You are a concise market analyst writing educational decision-support, not personalized financial advice. Add 2 short practical bullets.\nSymbol: ${s.symbol}\nDecision: ${s.decision}\nScore: ${s.score}\nConfidence: ${s.confidence}\nRegime score: ${regimeScore}\nThesis: ${s.thesis}\nRisks: ${s.riskFlags.join('; ')}\nInvalidation: ${s.invalidation}\nReasons: ${s.reasons.join('; ')}`
      const resp = await ai.models.generateContent({
        model,
        contents: prompt,
      })
      const txt = (resp.text || '').trim()
      if (txt) cache.set(cacheKey, { expires: Date.now() + TTL_MS, text: txt })
      out.push({
        ...s,
        evidence: txt ? [...s.evidence, { label: 'Gemini note', detail: 'Generated server-side with provider key kept off the browser', strength: 'ai' }] : s.evidence,
        aiExplanation: txt || undefined,
      })
    } catch {
      out.push(s)
    }
  }
  return out
}
