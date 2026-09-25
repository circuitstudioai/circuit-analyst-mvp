export type MarketDeskVnextRollout = 'off' | 'preview' | 'on'

type RolloutEnvironment = {
  configuredMode?: string
  nodeEnvironment?: string
  vercelEnvironment?: string
}

const rolloutModes = new Set<MarketDeskVnextRollout>(['off', 'preview', 'on'])

export function resolveMarketDeskVnextRollout(environment: RolloutEnvironment = {}): MarketDeskVnextRollout {
  const configuredMode = environment.configuredMode?.trim().toLowerCase()
  if (configuredMode) return rolloutModes.has(configuredMode as MarketDeskVnextRollout) ? configuredMode as MarketDeskVnextRollout : 'off'
  if (environment.vercelEnvironment === 'preview') return 'preview'
  if (environment.nodeEnvironment === 'development' || environment.nodeEnvironment === 'test') return 'preview'
  return 'off'
}

export function marketDeskVnextRollout(): MarketDeskVnextRollout {
  return resolveMarketDeskVnextRollout({
    configuredMode: process.env.MARKET_DESK_VNEXT_ROLLOUT,
    nodeEnvironment: process.env.NODE_ENV,
    vercelEnvironment: process.env.VERCEL_ENV,
  })
}

export function isMarketDeskVnextRouteAvailable(mode: MarketDeskVnextRollout) {
  return mode !== 'off'
}

export function isMarketDeskVnextPromoted(mode: MarketDeskVnextRollout) {
  return mode === 'on'
}
