#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const inputPath = process.argv[2]
if (!inputPath) throw new Error('Usage: node scripts/sync-symbol-universe.mjs <universe.json>')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRoleKey) throw new Error('Supabase environment variables are required')

const payload = JSON.parse(await readFile(inputPath, 'utf8'))
if (!Array.isArray(payload.symbols) || payload.symbols.length !== 100) {
  throw new Error('Universe must contain exactly 100 symbols')
}

const asOf = new Date(payload.as_of)
if (Number.isNaN(asOf.getTime())) throw new Error('Universe has an invalid as_of timestamp')

const dateSlug = asOf.toISOString().slice(0, 10)
const slug = `top-us-equities-${dateSlug}`
const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: version, error: versionError } = await supabase
  .from('symbol_universe_versions')
  .upsert({
    slug,
    name: `Top 100 US Equities — ${dateSlug}`,
    status: 'draft',
    methodology_version: payload.methodology_version,
    as_of: asOf.toISOString(),
    sources: [
      { name: 'Yahoo Finance most active', purpose: 'liquidity candidate set and market fields' },
      { name: 'Yahoo Finance most watched', purpose: 'retail popularity proxy' },
      { name: 'Yahoo Finance US trending', purpose: 'short-term attention proxy' },
      { name: 'SEC ticker and exchange data', purpose: 'listing identity validation policy' },
    ],
    notes: JSON.stringify({ filters: payload.filters, weights: payload.weights }),
  }, { onConflict: 'slug' })
  .select('id, slug')
  .single()

if (versionError || !version) throw new Error(versionError?.message || 'Failed to create universe version')

const items = payload.symbols.map((row) => ({
  universe_id: version.id,
  symbol: row.symbol,
  company_name: row.company_name,
  exchange: row.exchange,
  rank: row.rank,
  liquidity_score: row.liquidity_score,
  popularity_score: row.popularity_score,
  composite_score: row.composite_score,
  average_daily_volume_3m: row.average_daily_volume_3m,
  average_dollar_volume_3m: row.average_dollar_volume_3m,
  market_cap: row.market_cap,
  source_tags: row.source_tags,
  is_active: true,
}))

const { error: itemError } = await supabase
  .from('symbol_universe_items')
  .upsert(items, { onConflict: 'universe_id,symbol' })
if (itemError) throw new Error(itemError.message)

const { error: archiveError } = await supabase
  .from('symbol_universe_versions')
  .update({ status: 'archived', activated_at: null })
  .neq('id', version.id)
if (archiveError) throw new Error(archiveError.message)

const { error: activateError } = await supabase
  .from('symbol_universe_versions')
  .update({ status: 'active', activated_at: new Date().toISOString() })
  .eq('id', version.id)
if (activateError) throw new Error(activateError.message)

process.stdout.write(`${JSON.stringify({ ok: true, slug, version_id: version.id, symbols: items.length })}\n`)
