export function normalizeSignupEmail(value: unknown) {
  const email = String(value || '').trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function magicLinkRedirect(appUrl: string) {
  const url = new URL(appUrl)
  url.pathname = '/login'
  url.search = ''
  url.hash = ''
  return url.toString()
}
