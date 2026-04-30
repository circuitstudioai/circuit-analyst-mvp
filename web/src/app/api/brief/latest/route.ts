import { NextResponse } from 'next/server'
import { latestConsensus, latestDailyBrief, saveDailyBrief } from '@/lib/supabase'

export async function GET() {
  const existing = await latestDailyBrief()
  if (existing) return NextResponse.json({ brief: existing, source: 'stored' })

  const consensus = (await latestConsensus()) as any[]
  if (!consensus.length) return NextResponse.json({ brief: null, source: 'none' })

  const topConviction = [...consensus]
    .sort((a, b) => b.confidence_score - a.confidence_score)
    .slice(0, 5)

  const highConflict = consensus.filter((x) => x.conflict_flag).slice(0, 5)

  const keyCatalysts: any[] = []
  const summary = `Generated from ${consensus.length} consensus rows. Top conviction: ${topConviction[0]?.ticker || 'N/A'}. Conflicts: ${highConflict.length}.`
  const title = 'Circuit Market Desk — Daily Brief'

  const md = [
    `# ${title}`,
    '',
    summary,
    '',
    '## Top Conviction',
    ...topConviction.map((r) => `- ${r.ticker}: ${r.direction} (${Math.round((r.confidence_score || 0) * 100)}%)`),
    '',
    '## High Conflict',
    ...(highConflict.length ? highConflict.map((r) => `- ${r.ticker}: disagreement with confidence ${(r.confidence_score * 100).toFixed(0)}%`) : ['- None']),
  ].join('\n')

  const today = new Date().toISOString().slice(0, 10)
  const payload = {
    brief_date: today,
    title,
    summary,
    top_conviction: topConviction,
    high_conflict: highConflict,
    key_catalysts: keyCatalysts,
    markdown: md,
  }
  await saveDailyBrief(payload)

  return NextResponse.json({ brief: payload, source: 'generated' })
}
