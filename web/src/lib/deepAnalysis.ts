import { GoogleGenAI, ThinkingLevel } from '@google/genai'
import { EngineOutput } from './consensus'
import { AnalysisIntent, DeepAnalysisReport, DeepAnalysisSource, SignalRow } from './types'
import { CheckpointedStageError, executeWithFallback, runCheckpointedStages, StageCheckpointStore, StageRecord, StageTrace } from './analystHarness'

type ResearchFact = { id: string; statement: string; source_url: string; source_title: string; published_at?: string }
type ResearchPlan = { company_context: string; questions_to_answer: string[]; facts: ResearchFact[] }
type Debate = { positive_case: string[]; challenge_case: string[]; change_conditions: string[]; cited_fact_ids: string[] }

const MAX_FACTS = 14
const MAX_SOURCES = 8

export function classifyIntent(question: string, symbolCount: number): AnalysisIntent {
  const q = question.toLowerCase()
  if (symbolCount > 1 || /compare|versus|\bvs\b|better/.test(q)) return 'comparison'
  if (/risk|wrong|worry|downside|danger|challenge/.test(q)) return 'risk'
  if (/value|valuation|expensive|cheap|worth/.test(q)) return 'valuation'
  if (/earnings|quarter|guidance|results/.test(q)) return 'earnings'
  if (/change|since|last time|new/.test(q)) return 'change'
  return 'overview'
}

function jsonFrom(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned) as Record<string, unknown>
}

function strings(value: unknown, max = 4) {
  return Array.isArray(value) ? value.map(String).map((x) => x.trim()).filter(Boolean).slice(0, max) : []
}

function safeUrl(value: unknown) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' ? url.toString() : null
  } catch { return null }
}

function validatePlan(value: Record<string, unknown>): ResearchPlan {
  const facts = (Array.isArray(value.facts) ? value.facts : []).flatMap((item, index) => {
    const row = item as Record<string, unknown>
    const url = safeUrl(row.source_url)
    const statement = String(row.statement || '').trim()
    if (!url || !statement) return []
    return [{ id: String(row.id || `fact-${index + 1}`), statement, source_url: url, source_title: String(row.source_title || new URL(url).hostname), published_at: row.published_at ? String(row.published_at) : undefined }]
  }).slice(0, MAX_FACTS)
  if (facts.length < 3) throw new Error('research returned insufficient sourced facts')
  return { company_context: String(value.company_context || ''), questions_to_answer: strings(value.questions_to_answer, 6), facts }
}

function validateDebate(value: Record<string, unknown>, factIds: Set<string>): Debate {
  const cited = strings(value.cited_fact_ids, MAX_FACTS)
  if (!cited.length || cited.some((id) => !factIds.has(id))) throw new Error('debate contains unsupported citations')
  const positive = strings(value.positive_case)
  const challenge = strings(value.challenge_case)
  const changes = strings(value.change_conditions)
  if (!positive.length || !challenge.length || !changes.length) throw new Error('debate is incomplete')
  return { positive_case: positive, challenge_case: challenge, change_conditions: changes, cited_fact_ids: cited }
}

function fallback(signal: SignalRow, question: string, intent: AnalysisIntent, code: string, stages?: StageTrace[]): DeepAnalysisReport {
  return {
    symbol: signal.symbol, question, intent, status: 'fallback',
    view: signal.abstained ? 'insufficient_evidence' : signal.decision === 'BUY' ? 'favorable' : signal.decision === 'SELL' ? 'unfavorable' : 'mixed',
    confidence: signal.confidence >= .75 ? 'high' : signal.confidence >= .5 ? 'medium' : 'low',
    directAnswer: signal.thesis,
    distinctiveNow: 'Deep company research was unavailable, so this is only the price-and-trend fallback.',
    strongestEvidence: signal.reasons.slice(0, 3),
    strongestCounterargument: [...signal.riskFlags, ...signal.bearCase].slice(0, 3),
    changeConditions: [signal.invalidation], sources: [], errorCode: code, stages,
  }
}

function memoryStageStore(): StageCheckpointStore {
  const records = new Map<string, StageRecord>()
  return {
    load: async (name) => records.get(name) || null,
    save: async (name, record) => { records.set(name, record) },
  }
}

export async function generateDeepAnalysis(
  signal: SignalRow,
  question: string,
  intent: AnalysisIntent,
  engines: EngineOutput[],
  options: { checkpointStore?: StageCheckpointStore; conversationContext?: string } = {},
): Promise<DeepAnalysisReport> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return fallback(signal, question, intent, 'not_configured')
  // Search grounding is not available on every text-only model. Keep the deep
  // research model independently configurable and default to the stable
  // search-capable Flash model.
  const primaryModel = process.env.GEMINI_DEEP_MODEL || 'gemini-3.6-flash'
  const models = [...new Set([primaryModel, process.env.GEMINI_FALLBACK_MODEL].filter(Boolean) as string[])]
  const ai = new GoogleGenAI({ apiKey })
  const checkpointStore = options.checkpointStore || memoryStageStore()
  const priorConversation = options.conversationContext
    ? `\nPrior conversation (context only; verify its factual claims again):\n${options.conversationContext}`
    : ''
  try {
    const researchPrompt = `Act as a research planner for ${signal.symbol}. The user asks: ${JSON.stringify(question)}. Intent: ${intent}.
Find current, company-specific evidence. Prefer SEC filings and company investor-relations sources; use reputable reporting only for material events not in primary sources. Return JSON only with company_context, questions_to_answer (array), and facts (array). Each fact requires id, statement, source_url, source_title, and published_at. Include business model, latest results/guidance, cash flow or margins, sector-appropriate valuation context, company-specific risk, and catalyst when relevant. Maximum ${MAX_FACTS} facts. Do not recommend a trade.${priorConversation}`
    const engineContext = engines.map((row) => ({ engine: row.engine_name, direction: row.direction, confidence: row.confidence, thesis: row.thesis_summary, risks: row.risk_flags })).slice(0, 4)
    const execution = await runCheckpointedStages([
      {
        name: 'research',
        run: async () => {
          const response = await executeWithFallback(models, 2, (model) => ai.models.generateContent({ model, contents: researchPrompt, config: { tools: [{ googleSearch: {} }], maxOutputTokens: 2600, thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } } }))
          return { plan: validatePlan(jsonFrom(response.value.text || '')), model: response.model, attempts: response.attempts }
        },
      },
      {
        name: 'challenge',
        run: async (state) => {
          const plan = (state.research as { plan: ResearchPlan }).plan
          const prompt = `Act as two independent equity analysts. Using only the sourced facts and engine context below, produce both the strongest evidence-supported positive case and the strongest challenge case for ${signal.symbol}, tailored to the user's question. Return JSON only: positive_case (1-4 plain-English strings), challenge_case (1-4), change_conditions (1-4), cited_fact_ids (all factual claims used). Do not add facts, prices, or recommendations.
Question: ${question}
Facts: ${JSON.stringify(plan.facts)}
Engine context: ${JSON.stringify(engineContext)}`
          const response = await executeWithFallback(models, 2, (model) => ai.models.generateContent({ model, contents: prompt, config: { maxOutputTokens: 1800, thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } } }))
          return { debate: validateDebate(jsonFrom(response.value.text || ''), new Set(plan.facts.map((fact) => fact.id))), model: response.model, attempts: response.attempts }
        },
      },
      {
        name: 'synthesis',
        run: async (state) => {
          const plan = (state.research as { plan: ResearchPlan }).plan
          const debate = (state.challenge as { debate: Debate }).debate
          const prompt = `Act as a careful decision editor for a non-financial reader. Answer the question about ${signal.symbol} using only the supplied research and debate. Return JSON only with: view (favorable|mixed|unfavorable|insufficient_evidence), confidence (low|medium|high), direct_answer (2-4 sentences), distinctive_now (1-3 sentences), strongest_evidence (1-4 strings), strongest_counterargument (1-4 strings), change_conditions (1-4 strings), cited_fact_ids. Use everyday language, explain necessary financial terms inline, preserve uncertainty, and never say buy, sell, or trade.
Question: ${question}
Company context: ${plan.company_context}
Facts: ${JSON.stringify(plan.facts)}
Debate: ${JSON.stringify(debate)}`
          const response = await executeWithFallback(models, 2, (model) => ai.models.generateContent({ model, contents: prompt, config: { maxOutputTokens: 2200, thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } } }))
          const edited = jsonFrom(response.value.text || '')
          const cited = strings(edited.cited_fact_ids, MAX_FACTS)
          const allowed = new Set(plan.facts.map((fact) => fact.id))
          if (!cited.length || cited.some((id) => !allowed.has(id))) throw new Error('editor contains unsupported citations')
          const views = new Set(['favorable', 'mixed', 'unfavorable', 'insufficient_evidence'])
          const confidences = new Set(['low', 'medium', 'high'])
          const directAnswer = String(edited.direct_answer || '').trim()
          const distinctiveNow = String(edited.distinctive_now || '').trim()
          if (!directAnswer || !distinctiveNow) throw new Error('editor response is incomplete')
          const sources: DeepAnalysisSource[] = [...new Map(plan.facts.filter((fact) => cited.includes(fact.id)).map((fact) => [fact.source_url, { title: fact.source_title, url: fact.source_url, publishedAt: fact.published_at || null }])).values()].slice(0, MAX_SOURCES)
          return {
            symbol: signal.symbol, question, intent, status: 'complete' as const,
            view: views.has(String(edited.view)) ? edited.view as DeepAnalysisReport['view'] : 'mixed',
            confidence: confidences.has(String(edited.confidence)) ? edited.confidence as DeepAnalysisReport['confidence'] : 'low',
            directAnswer, distinctiveNow,
            strongestEvidence: strings(edited.strongest_evidence),
            strongestCounterargument: strings(edited.strongest_counterargument),
            changeConditions: strings(edited.change_conditions), sources, model: response.model,
          }
        },
      },
    ], checkpointStore)
    return { ...(execution.state.synthesis as DeepAnalysisReport), stages: execution.stages }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    console.warn('[deep-analysis]', JSON.stringify({ symbol: signal.symbol, models, message: message.slice(0, 220) }))
    const code = /quota|429|resource_exhausted/i.test(message) ? 'quota'
      : /json|unexpected token|incomplete|citation|sourced facts/i.test(message) ? 'validation'
      : /model|not found|unsupported/i.test(message) ? 'model'
      : 'provider'
    return fallback(signal, question, intent, code, error instanceof CheckpointedStageError ? error.stages : undefined)
  }
}
