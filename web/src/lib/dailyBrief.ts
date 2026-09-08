import { ConsensusResult, EngineOutput } from './consensus'
import { ConsensusDiffRow } from './supabase'

export function buildMaterialChangeBrief(runId: number, consensus: ConsensusResult[], outputs: EngineOutput[], diffs: ConsensusDiffRow[], asOf: string) {
  const material = diffs.filter((row) => row.change_type === 'flip' || row.change_type === 'new' || row.latest_conflict || Math.abs(row.confidence_delta || 0) >= 0.08 || Math.abs(row.agreement_delta || 0) >= 0.08)
  const topConviction = [...consensus].filter((row) => row.engines_total >= 2).sort((a, b) => b.confidence_score - a.confidence_score).slice(0, 5)
  const highConflict = consensus.filter((row) => row.conflict_flag).slice(0, 5)
  const keyCatalysts = outputs.flatMap((row) => (row.catalysts || []).map((catalyst) => ({ ticker: row.ticker, engine: row.engine_name, catalyst }))).slice(0, 10)
  const summary = material.length
    ? `${material.length} material change${material.length === 1 ? '' : 's'} across ${consensus.length} covered tickers; ${highConflict.length} currently in conflict.`
    : `No material consensus changes across ${consensus.length} covered tickers; ${highConflict.length} currently in conflict.`
  const title = `Circuit Market Desk — ${asOf.slice(0, 10)} Daily Brief`
  const markdown = [
    `# ${title}`, '', summary, '', '## Material changes',
    ...(material.length ? material.map((row) => `- ${row.ticker}: ${row.change_type}; ${row.latest_direction}; confidence ${Math.round(row.latest_confidence * 100)}%; agreement ${Math.round(row.latest_agreement * 100)}%${row.latest_conflict ? '; conflict flagged' : ''}`) : ['- None']),
    '', '## Top conviction',
    ...(topConviction.length ? topConviction.map((row) => `- ${row.ticker}: ${row.direction}; confidence ${Math.round(row.confidence_score * 100)}%; ${row.engines_total} engines`) : ['- None']),
    '', '## High conflict',
    ...(highConflict.length ? highConflict.map((row) => `- ${row.ticker}: ${row.rationale}`) : ['- None']),
  ].join('\n')
  return { run_id: runId, brief_date: asOf.slice(0, 10), title, summary, top_conviction: topConviction, high_conflict: highConflict, key_catalysts: keyCatalysts, markdown }
}
