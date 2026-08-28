import { Decision } from './types'

export type NarrativeMetrics = {
  symbol: string
  decision: Decision
  last: number
  ma20: number
  ma100: number
  momentum20: number
  volatility20: number
  score: number
  regimeBias: number
}

const pct = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
const money = (value: number) => `$${value.toFixed(2)}`

export function buildNarrative(metrics: NarrativeMetrics) {
  const { symbol, decision, last, ma20, ma100, momentum20, volatility20, score, regimeBias } = metrics
  const gap20 = last / ma20 - 1
  const gap100 = last / ma100 - 1
  const aboveMa20 = last >= ma20
  const thresholdGap = decision === 'BUY' ? score - 0.35 : decision === 'SELL' ? -0.35 - score : 0.35 - Math.abs(score)

  const thesis = `${symbol} closes at ${money(last)}, ${pct(gap20)} versus its 20-day average and ${pct(gap100)} versus its 100-day average. Twenty-day momentum is ${pct(momentum20)}, recent daily volatility is ${(volatility20 * 100).toFixed(1)}%, and the composite score is ${score.toFixed(3)}.`

  const bullCase = [
    `${symbol}'s 20-day average (${money(ma20)}) is ${ma20 >= ma100 ? 'above' : 'below'} its 100-day average (${money(ma100)}).`,
    `Price is ${pct(gap20)} from the short trend while 20-day momentum is ${pct(momentum20)}.`,
    `The market-regime contribution is ${pct(regimeBias)} to this symbol's score.`,
  ]
  const bearCase = [
    `${symbol} would lose its short-trend support on a close below ${money(ma20)}.`,
    `A ${(volatility20 * 100).toFixed(1)}% daily volatility estimate can overwhelm a ${Math.abs(thresholdGap).toFixed(3)}-point threshold cushion.`,
    gap100 > 0
      ? `Price is ${pct(gap100)} above the 100-day average, increasing mean-reversion risk.`
      : `Price remains ${pct(gap100)} below the 100-day average, so the long trend is unresolved.`,
  ]

  const riskFlags = [
    ...(volatility20 >= 0.04 ? [`Elevated 20-day daily volatility: ${(volatility20 * 100).toFixed(1)}%`] : []),
    ...(Math.abs(thresholdGap) < 0.12 ? [`Signal is only ${Math.abs(thresholdGap).toFixed(3)} points beyond its action threshold`] : []),
    ...(Math.abs(gap20) > 0.12 ? [`Price is stretched ${pct(gap20)} from MA20`] : []),
    ...(regimeBias < 0 ? ['Broad-market regime is subtracting from the score'] : []),
  ]

  const invalidation = decision === 'BUY'
    ? aboveMa20
      ? `${symbol}: reassess on a daily close below MA20 (${money(ma20)}) or if momentum turns negative enough to pull the score below 0.350.`
      : `${symbol}: the setup needs a daily close back above MA20 (${money(ma20)}); reassess the bullish view on a close below MA100 (${money(ma100)}) or if the score falls below 0.350.`
    : decision === 'SELL'
      ? `${symbol}: reassess on a daily close above MA20 (${money(ma20)}) or if the score recovers above -0.350.`
      : `${symbol}: remain neutral until price/MA20 direction and 20-day momentum align strongly enough to clear ±0.350.`

  const nextAction = decision === 'BUY'
    ? aboveMa20
      ? `Build a ${symbol} watch plan around ${money(last)} with ${money(ma20)} as the first technical risk reference; size for ${(volatility20 * 100).toFixed(1)}% daily volatility.`
      : `Wait for ${symbol} to reclaim MA20 at ${money(ma20)} before treating the BUY score as confirmed; use MA100 at ${money(ma100)} as the downside reference.`
    : decision === 'SELL'
      ? `Review ${symbol} exposure near ${money(last)} and use ${money(ma20)} as the first recovery checkpoint before changing the bearish stance.`
      : `Keep ${symbol} on watch; wait for a decisive move away from MA20 (${money(ma20)}) before taking a directional view.`

  return {
    thesis,
    bullCase,
    bearCase,
    riskFlags: riskFlags.length ? riskFlags : [`${symbol} has no rule-based risk flag beyond normal market uncertainty.`],
    catalysts: [
      `${symbol} next earnings or guidance update`,
      `A daily close through MA20 at ${money(ma20)}`,
      `A 20-day momentum reversal from ${pct(momentum20)}`,
    ],
    invalidation,
    nextAction,
  }
}
