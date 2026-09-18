export type AlphaAccessReason = 'admin' | 'invited' | 'open' | 'not_invited'

export function alphaAccessDecision(
  email: string | undefined,
  configuredEmails: string | undefined,
  role: string | undefined,
  openSignup: boolean,
): { allowed: boolean; reason: AlphaAccessReason } {
  if (role === 'admin') return { allowed: true, reason: 'admin' }
  if (openSignup && email) return { allowed: true, reason: 'open' }
  const normalized = (configuredEmails || '').trim()
  const invited = new Set(normalized.split(/[\s,]+/).map((value) => value.trim().toLowerCase()).filter(Boolean))
  const allowed = Boolean(email && invited.has(email.trim().toLowerCase()))
  return { allowed, reason: allowed ? 'invited' : 'not_invited' }
}
