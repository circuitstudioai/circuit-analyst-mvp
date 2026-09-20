import { marketDeskFixture } from '@/lib/marketDeskFixtures'
import { assertMarketDeskFixture } from '@/lib/marketDesk'
import { MarketDeskExperience } from './MarketDeskExperience'

export const metadata = {
  title: 'Living Thesis | Circuit Market Desk',
  description: 'A change inbox for the investment cases you care about.',
}

export default function MarketDeskPage() {
  assertMarketDeskFixture(marketDeskFixture)
  return <MarketDeskExperience fixture={marketDeskFixture} />
}
