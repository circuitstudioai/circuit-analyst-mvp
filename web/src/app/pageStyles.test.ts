import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./page.module.css', import.meta.url), 'utf8')

describe('desk responsive layout', () => {
  it('preserves the desktop workspace before the mobile breakpoint', () => {
    expect(styles).not.toContain('@media (max-width: 1024px)')
    expect(styles).toContain('@media (max-width: 720px)')
  })
})
