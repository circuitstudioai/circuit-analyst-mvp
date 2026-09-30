import { notFound, redirect } from 'next/navigation'
import { marketDeskFixture } from '@/lib/marketDeskFixtures'
import { assertMarketDeskFixture, buildMarketDeskHref, marketDeskRequestHref, resolveMarketDeskLocation } from '@/lib/marketDesk'
import { isMarketDeskVnextRouteAvailable, marketDeskVnextRollout } from '@/lib/marketDeskRollout'
import { MarketDeskExperience } from './MarketDeskExperience'
import { loadLatestCycle } from '@/lib/marketDeskPilot'
import { serviceClient } from '@/lib/supabase'

export const metadata = {
  title: 'Living Thesis | Circuit Market Desk',
  description: 'A change inbox for the investment cases you care about.',
}

export default async function MarketDeskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const rollout = marketDeskVnextRollout()
  if (!isMarketDeskVnextRouteAvailable(rollout)) notFound()
  assertMarketDeskFixture(marketDeskFixture)
  const search = await searchParams
  const canonical = buildMarketDeskHref(resolveMarketDeskLocation(marketDeskFixture, search))
  if (marketDeskRequestHref(search) !== canonical) redirect(canonical)
  const client = serviceClient()
  const liveNvda = client ? await loadLatestCycle(client, 'NVDA').catch(() => null) : null
  return <MarketDeskExperience fixture={marketDeskFixture} rollout={rollout} search={search} liveNvda={liveNvda} />
}
