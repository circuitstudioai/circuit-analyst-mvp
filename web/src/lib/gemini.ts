import { GoogleGenAI } from '@google/genai'
import { SignalRow } from './types'

export async function enrichWithGemini(signals: SignalRow[], regimeScore: number): Promise<SignalRow[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return signals

  const ai = new GoogleGenAI({ apiKey })
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

  const out: SignalRow[] = []
  for (const s of signals) {
    try {
      const prompt = `You are a concise market analyst. Explain this decision in 2 short bullet points, non-hype, practical.\nSymbol: ${s.symbol}\nDecision: ${s.decision}\nScore: ${s.score}\nConfidence: ${s.confidence}\nRegime score: ${regimeScore}\nReasons: ${s.reasons.join('; ')}`
      const resp = await ai.models.generateContent({
        model,
        contents: prompt,
      })
      const txt = (resp.text || '').trim()
      out.push({ ...s, aiExplanation: txt || undefined })
    } catch {
      out.push(s)
    }
  }
  return out
}
