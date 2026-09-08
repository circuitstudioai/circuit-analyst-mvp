export type EvidenceItem = {
  id: string
  kind: 'fact' | 'calculation' | 'interpretation' | 'assumption'
  metric: string
  value: unknown
  unit: string
  ticker: string
  period: string
  confidence: number
  freshness_seconds: number | null
  missing_status: 'present' | 'unavailable' | 'not_applicable'
  source?: {
    provider: string
    url: string
    retrieved_at: string
    published_at?: string | null
    observed_at?: string | null
  }
  calculation?: { method: string; formula: string; inputs: Record<string, unknown> }
  notes?: string
}

export type EvidencePacket = {
  ticker: string
  as_of: string
  items: EvidenceItem[]
  engine: string
  schema_version: '1.0.0'
  request_id?: string
  metadata: Record<string, unknown>
}

export function packet(ticker: string, asOf: string, engine: string, items: EvidenceItem[], metadata: Record<string, unknown> = {}): EvidencePacket {
  return { ticker, as_of: asOf, items, engine, schema_version: '1.0.0', metadata }
}

export function validateEvidencePacket(value: EvidencePacket) {
  const errors: string[] = []
  if (value.schema_version !== '1.0.0') errors.push('unsupported schema version')
  if (!value.ticker || !value.engine) errors.push('ticker and engine are required')
  const ids = new Set<string>()
  value.items.forEach((item, index) => {
    if (!item.id || ids.has(item.id)) errors.push(`items[${index}].id must be unique`)
    ids.add(item.id)
    if (item.ticker !== value.ticker) errors.push(`items[${index}].ticker mismatch`)
    if (item.confidence < 0 || item.confidence > 1) errors.push(`items[${index}].confidence out of range`)
    if (item.missing_status === 'present' && item.value === null) errors.push(`items[${index}].value missing`)
    if (item.kind === 'fact' && item.missing_status === 'present' && !item.source) errors.push(`items[${index}].source missing`)
    if (item.kind === 'calculation' && !item.calculation) errors.push(`items[${index}].calculation missing`)
  })
  return errors
}
