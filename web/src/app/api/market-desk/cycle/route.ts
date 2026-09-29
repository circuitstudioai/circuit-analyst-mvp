import { NextRequest, NextResponse } from 'next/server'
import { verifyJobRequest } from '@/lib/jobAuth'
import { MemoryDeskStore } from '@/lib/marketDeskCycle'
import { persistCycleResult, runPilotSlice } from '@/lib/marketDeskPilot'
import { serviceClient } from '@/lib/supabase'

const globalStore = globalThis as { marketDeskStore?: MemoryDeskStore }

function pilotStore() {
  if (!globalStore.marketDeskStore) globalStore.marketDeskStore = new MemoryDeskStore()
  return globalStore.marketDeskStore
}

export async function POST(req: NextRequest) {
  const denied = verifyJobRequest(req)
  if (denied) return denied
  const report = await runPilotSlice({ fetchImpl: fetch, store: pilotStore() })
  const client = serviceClient()
  const persistenceErrors: string[] = []
  if (client) {
    for (const company of report.companies) {
      if (company.duplicate) continue
      persistenceErrors.push(...await persistCycleResult(client, company))
    }
  }
  const status = report.status === 'failed' ? 502 : 200
  return NextResponse.json({ ...report, persistence: client ? persistenceErrors : 'not_configured' }, { status })
}

export async function GET(req: NextRequest) {
  const denied = verifyJobRequest(req)
  if (denied) return denied
  const store = pilotStore()
  return NextResponse.json({
    runs: [...store.runs.values()].map((run) => ({ idempotencyKey: run.idempotencyKey, symbol: run.result.symbol, status: run.result.status, inbox: run.result.event?.inbox || false })),
    events: store.events.size,
    markers: store.markers.size,
  })
}
