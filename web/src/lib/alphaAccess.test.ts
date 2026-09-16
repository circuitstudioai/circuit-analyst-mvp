import { describe, expect, it } from 'vitest'
import { alphaAccessDecision } from './alphaAccess'

describe('alpha access policy', () => {
  it('keeps signed-in access closed when the allowlist is missing', () => {
    expect(alphaAccessDecision('tester@example.com', undefined, 'tester')).toEqual({
      allowed: false,
      reason: 'not_invited',
    })
  })

  it('matches normalized emails and rejects everyone else', () => {
    const configured = ' Alpha@Example.com,second@example.com\n'
    expect(alphaAccessDecision('alpha@example.com', configured, 'tester').allowed).toBe(true)
    expect(alphaAccessDecision('outsider@example.com', configured, 'tester').allowed).toBe(false)
  })

  it('allows an explicit open mode for local and preview testing', () => {
    expect(alphaAccessDecision('anyone@example.com', '*', 'tester')).toEqual({ allowed: true, reason: 'open' })
  })

  it('keeps admins able to operate the alpha', () => {
    expect(alphaAccessDecision('operator@example.com', undefined, 'admin')).toEqual({ allowed: true, reason: 'admin' })
  })
})
