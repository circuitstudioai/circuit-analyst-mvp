import { describe, expect, it } from 'vitest'
import {
  isMarketDeskVnextPromoted,
  isMarketDeskVnextRouteAvailable,
  resolveMarketDeskVnextRollout,
} from './marketDeskRollout'

describe('Market Desk vNext rollout policy', () => {
  it('defaults production to off and preview deployments to direct-link preview', () => {
    expect(resolveMarketDeskVnextRollout({ nodeEnvironment: 'production', vercelEnvironment: 'production' })).toBe('off')
    expect(resolveMarketDeskVnextRollout({ nodeEnvironment: 'production', vercelEnvironment: 'preview' })).toBe('preview')
  })

  it('honors an explicit valid mode and fails closed for invalid configuration', () => {
    expect(resolveMarketDeskVnextRollout({ configuredMode: 'on', nodeEnvironment: 'production' })).toBe('on')
    expect(resolveMarketDeskVnextRollout({ configuredMode: 'preview', nodeEnvironment: 'production' })).toBe('preview')
    expect(resolveMarketDeskVnextRollout({ configuredMode: 'unexpected', nodeEnvironment: 'development' })).toBe('off')
  })

  it('keeps preview reachable by direct link without promoting it globally', () => {
    expect(isMarketDeskVnextRouteAvailable('preview')).toBe(true)
    expect(isMarketDeskVnextPromoted('preview')).toBe(false)
    expect(isMarketDeskVnextRouteAvailable('on')).toBe(true)
    expect(isMarketDeskVnextPromoted('on')).toBe(true)
    expect(isMarketDeskVnextRouteAvailable('off')).toBe(false)
  })
})
