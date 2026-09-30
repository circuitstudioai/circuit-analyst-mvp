import { NextRequest, NextResponse } from 'next/server'
import { verifyJobRequest } from '@/lib/jobAuth'
import { MemoryDeskStore } from '@/lib/marketDeskCycle'
import { loadLatestCycle, persistCycleResult, runNvdaSlice } from '@/lib/marketDeskPilot'
import { serviceClient } from '@/lib/supabase'

const globalStore = globalThis as { marketDeskStore?: MemoryDeskStore }

function pilotStore() {
  if (!globalStore.marketDeskStore) globalStore.marketDeskStore = new MemoryDeskStore()
  return globalStore.marketDeskStore
}

export async function POST(req: NextRequest) {
  const denied = verifyJobRequest(req)
  if (denied) return denied
  const client = serviceClient()
  if (!client) return NextResponse.json({ error: 'Market Desk durable storage is not configured.' }, { status: 503 })
  const result = await runNvdaSlice({ fetchImpl: fetch, store: pilotStore(), client })
  const persistenceErrors = result.duplicate ? [] : await persistCycleResult(client, result)
  const status = result.status === 'failed' || persistenceErrors.length ? 502 : 200
  return NextResponse.json({ result, persistenceErrors }, { status })
}

export async function GET(req: NextRequest) {
  const denied = verifyJobRequest(req)
  if (denied) return denied
  const client = serviceClient()
  if (!client) return NextResponse.json({ error: 'Market Desk durable storage is not configured.' }, { status: 503 })
  return NextResponse.json({ result: await loadLatestCycle(client, 'NVDA') })
}
