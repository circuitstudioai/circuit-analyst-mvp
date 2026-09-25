import { notFound } from 'next/navigation'
import { marketDeskFixture } from '@/lib/marketDeskFixtures'
import { assertMarketDeskFixture } from '@/lib/marketDesk'
import { isMarketDeskVnextRouteAvailable, marketDeskVnextRollout } from '@/lib/marketDeskRollout'
import { MarketDeskExperience } from './MarketDeskExperience'

export const metadata = {
  title: 'Living Thesis | Circuit Market Desk',
  description: 'A change inbox for the investment cases you care about.',
}

export default function MarketDeskPage() {
  const rollout = marketDeskVnextRollout()
  if (!isMarketDeskVnextRouteAvailable(rollout)) notFound()
  assertMarketDeskFixture(marketDeskFixture)
  return <MarketDeskExperience fixture={marketDeskFixture} rollout={rollout} />
}
