import { describe, expect, it } from 'vitest'
import { alphaAccessDecision } from './alphaAccess'

describe('alpha access policy', () => {
  it('keeps signed-in access closed when the allowlist is missing', () => {
    expect(alphaAccessDecision('tester@example.com', undefined, 'tester', false)).toEqual({
      allowed: false,
      reason: 'not_invited',
    })
  })

  it('matches normalized emails and rejects everyone else', () => {
    const configured = ' Alpha@Example.com,second@example.com\n'
    expect(alphaAccessDecision('alpha@example.com', configured, 'tester', false).allowed).toBe(true)
    expect(alphaAccessDecision('outsider@example.com', configured, 'tester', false).allowed).toBe(false)
  })

  it('allows verified users when open signup is enabled', () => {
    expect(alphaAccessDecision('anyone@example.com', undefined, 'tester', true)).toEqual({ allowed: true, reason: 'open' })
  })

  it('keeps open signup behind an explicit kill switch', () => {
    expect(alphaAccessDecision('anyone@example.com', '*', 'tester', false)).toEqual({
      allowed: false,
      reason: 'not_invited',
    })
  })

  it('keeps admins able to operate the alpha', () => {
    expect(alphaAccessDecision('operator@example.com', undefined, 'admin', false)).toEqual({ allowed: true, reason: 'admin' })
  })
})
