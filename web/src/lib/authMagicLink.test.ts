import { describe, expect, it } from 'vitest'
import { magicLinkRedirect, normalizeSignupEmail } from './authMagicLink'

describe('magic-link signup', () => {
  it('normalizes a valid email and rejects malformed input', () => {
    expect(normalizeSignupEmail(' User@Example.COM ')).toBe('user@example.com')
    expect(normalizeSignupEmail('not-an-email')).toBeNull()
  })

  it('always targets the configured permanent app URL', () => {
    expect(magicLinkRedirect('https://circuit-analyst.vercel.app/')).toBe(
      'https://circuit-analyst.vercel.app/login',
    )
  })
})
