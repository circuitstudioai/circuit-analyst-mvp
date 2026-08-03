import { AnalyzeResponse, Decision, SignalRow } from './types'
import { fetchYahooDailySeries, PriceSeries } from './marketData'
import { evidenceForSymbol, latestResearchEvent } from './researchEvidence'

type PriceMap = Record<string, PriceSeries>

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function scoreSeries(symbol: string, series: PriceSeries, regimeBias: number) {
  const closes = series.closes
  if (closes.length < 110) {
    return {
      score: 0,
      decision: 'HOLD' as const,
      confidence: 0.05,
      reasons: ['Insufficient price history for 100-day trend and 20-day risk checks'],
      thesis: `${symbol} is not actionable because the public price series is too short for the engine checks.`,
      bullCase: ['Wait for enough data to measure trend and volatility.'],
      bearCase: ['Data coverage is too thin to support a responsible signal.'],
      riskFlags: ['Data coverage is insufficient'],
      catalysts: ['More daily closes available'],
      invalidation: 'Wait until at least 110 daily closes are available.',
      nextAction: 'Abstain and collect more history.',
      timeHorizon: 'swing',
      dataQuality: 'insufficient' as const,
      abstained: true,
      last: closes.at(-1) ?? 0,
    }
  }

  const last = closes[closes.length - 1]
  const ma20 = mean(closes.slice(-20))
  const ma100 = mean(closes.slice(-100))
  const mom20 = last / closes[closes.length - 21] - 1

  const dailyRets: number[] = []
  for (let i = closes.length - 20; i < closes.length; i++) {
    dailyRets.push(closes[i] / closes[i - 1] - 1)
  }
  const vol20 = Math.sqrt(mean(dailyRets.map((r) => r * r)))

  const trend = ma20 > ma100 ? 0.5 : -0.5
  const momentum = Math.max(Math.min(mom20 * 2.0, 0.5), -0.5)
  const riskPenalty = Math.max(Math.min(vol20 * 2.5, 0.3), 0)

  let score = trend + momentum + regimeBias - riskPenalty
  score = Math.max(Math.min(score, 1), -1)

  const decision: Decision = score >= 0.35 ? 'BUY' : score <= -0.35 ? 'SELL' : 'HOLD'
  const confidence = Math.min(0.95, 0.4 + Math.abs(score))
  const trendText = ma20 > ma100 ? 'constructive trend' : 'weak trend'
  const momentumText = mom20 >= 0 ? 'positive 20-day momentum' : 'negative 20-day momentum'
  const riskFlags = [
    ...(riskPenalty > 0.18 ? ['Elevated recent volatility'] : []),
    ...(Math.abs(score) < 0.35 ? ['Signal is below action threshold'] : []),
    ...(regimeBias < 0 ? ['Market regime is a headwind'] : []),
  ]
  const thesis =
    decision === 'BUY'
      ? `${symbol} has a constructive trend setup with ${momentumText}; position sizing should respect recent volatility.`
      : decision === 'SELL'
      ? `${symbol} has a weak technical setup with ${momentumText}; downside control matters more than adding exposure.`
      : `${symbol} is mixed: ${trendText}, ${momentumText}, and the score does not clear the action threshold.`
  const invalidation =
    decision === 'BUY'
      ? 'Revisit if price loses the 20-day average or the regime score turns negative.'
      : decision === 'SELL'
      ? 'Revisit if price reclaims the 20-day average with improving market regime.'
      : 'Revisit when trend and momentum align or a catalyst changes the setup.'
  const nextAction =
    decision === 'BUY'
      ? 'Build a watch plan with entry range, max loss, and catalyst checklist.'
      : decision === 'SELL'
      ? 'Reduce exposure, avoid new buys, or define a downside hedge before acting.'
      : 'Wait for confirmation; keep on watchlist.'

  const reasons = [
    `MA20 ${ma20 > ma100 ? 'above' : 'below'} MA100`,
    `20D momentum ${(mom20 * 100).toFixed(1)}%`,
    `Volatility penalty ${(riskPenalty * 100).toFixed(1)} bps`,
    `Regime bias ${(regimeBias * 100).toFixed(0)} bps`,
  ]
  const bullCase = [
    ma20 > ma100 ? 'Short trend is above the long trend.' : 'A trend reversal would improve the setup.',
    mom20 >= 0 ? 'Recent buyers are still defending momentum.' : 'A momentum turn would create a cleaner entry.',
    regimeBias > 0 ? 'Broad market regime is supportive.' : 'Improvement in SPY/QQQ regime would remove a headwind.',
  ]
  const bearCase = [
    riskPenalty > 0.18 ? 'Recent volatility can overwhelm a small edge.' : 'Low volatility can still mask event risk.',
    ma20 <= ma100 ? 'Short trend remains below long trend.' : 'A 20-day average break would weaken the signal.',
    Math.abs(score) < 0.35 ? 'Score is not far enough from neutral to force action.' : 'The signal can decay quickly if momentum fades.',
  ]
  const catalysts = [
    'Next earnings update',
    '20-day momentum shift',
    'SPY/QQQ regime change',
  ]

  return {
    score,
    decision,
    confidence,
    reasons,
    bullCase,
    bearCase,
    thesis,
    riskFlags: riskFlags.length ? riskFlags : ['No major rule-based risk flag'],
    catalysts,
    invalidation,
    nextAction,
    timeHorizon: 'swing',
    dataQuality: closes.length < 180 ? 'limited' as const : 'ok' as const,
    abstained: false,
    last,
  }
}

export async function analyzeWatchlist(watchlist: string[]): Promise<AnalyzeResponse> {
  const symbols = [...new Set(watchlist.map((s) => s.trim().toUpperCase()).filter(Boolean))]
  const bench = ['SPY', 'QQQ']
  const all = [...new Set([...symbols, ...bench])]

  const prices: PriceMap = {}
  await Promise.all(
    all.map(async (s) => {
      prices[s] = await fetchYahooDailySeries(s)
    })
  )

  const minLen = Math.min(...bench.map((b) => prices[b]?.closes.length ?? 0))
  const regimeSeries = Array.from({ length: minLen }, (_, i) => {
    const spySeries = prices.SPY?.closes ?? []
    const qqqSeries = prices.QQQ?.closes ?? []
    const spy = spySeries[spySeries.length - minLen + i] ?? 0
    const qqq = qqqSeries[qqqSeries.length - minLen + i] ?? 0
    return (spy + qqq) / 2
  })

  const regime = scoreSeries('MARKET', {
    closes: regimeSeries,
    dates: [],
    provider: 'derived',
    status: 'live',
    detail: 'SPY/QQQ blended regime series',
  }, 0)
  const regimeBias = regime.score > 0 ? 0.1 : -0.1
  const providerRows = Object.entries(prices)
  const fallbackSymbols = providerRows
    .filter(([, series]) => series.status === 'fallback')
    .map(([symbol]) => symbol)

  const signals: SignalRow[] = symbols.map((symbol) => {
    const s = scoreSeries(symbol, prices[symbol] ?? {
      closes: [],
      dates: [],
      provider: 'missing',
      status: 'fallback',
      detail: 'No provider series available',
    }, regimeBias)
    const researchEvent = latestResearchEvent(symbol)
    const evidence = [
      {
        label: 'Rule engine',
        detail: 'Yahoo daily close, MA20/MA100 trend, 20D momentum, realized volatility, SPY/QQQ regime',
        strength: 'rule' as const,
      },
      ...evidenceForSymbol(symbol),
    ]
    return {
      symbol,
      decision: s.decision,
      confidence: Number(s.confidence.toFixed(2)),
      score: Number(s.score.toFixed(3)),
      lastPrice: Number((s.last ?? 0).toFixed(2)),
      reasons: s.reasons,
      thesis: s.thesis,
      bullCase: [
        ...s.bullCase,
        ...(researchEvent?.decision === 'buy' ? [`Latest PEAD research signal agrees with upside bias: ${researchEvent.reasoning}`] : []),
      ],
      bearCase: [
        ...s.bearCase,
        ...(researchEvent?.decision === 'sell' ? [`Latest PEAD research signal disagrees with upside bias: ${researchEvent.reasoning}`] : []),
      ],
      riskFlags: s.riskFlags,
      catalysts: s.catalysts,
      invalidation: s.invalidation,
      nextAction: s.nextAction,
      timeHorizon: s.timeHorizon,
      dataQuality: s.dataQuality,
      abstained: s.abstained,
      source: 'Yahoo daily close, 20/100 trend, 20D momentum, realized volatility, SPY/QQQ regime',
      evidence,
    }
  })

  signals.sort((a, b) => b.confidence - a.confidence)

  return {
    asOf: new Date().toISOString(),
    regimeScore: Number(regime.score.toFixed(3)),
    watchlist: symbols,
    signals,
    pipeline: [
      {
        label: 'Public price fetch',
        status: fallbackSymbols.length ? 'fallback' : 'complete',
        detail: fallbackSymbols.length
          ? `Live Yahoo data used where available; fallback series used for ${fallbackSymbols.join(', ')}`
          : `${symbols.length} watchlist symbols plus SPY/QQQ benchmark data from Yahoo chart`,
      },
      {
        label: 'Rule scoring',
        status: 'complete',
        detail: 'Trend, momentum, volatility, and market-regime checks produced ranked decisions',
      },
      {
        label: 'Research evidence',
        status: 'complete',
        detail: 'PEAD event-study outputs from finance-test-harness are matched by ticker where available',
      },
      {
        label: 'AI summary',
        status: process.env.GEMINI_API_KEY ? 'complete' : 'fallback',
        detail: process.env.GEMINI_API_KEY ? 'Gemini generated analyst notes server-side' : 'Gemini key absent; rule-based report remains usable',
      },
    ],
    shareId: Buffer.from(`${symbols.join(',')}|${Date.now()}`).toString('base64url').slice(0, 16),
  }
}
