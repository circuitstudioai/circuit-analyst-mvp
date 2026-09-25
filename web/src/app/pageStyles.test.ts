import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./page.module.css', import.meta.url), 'utf8')

describe('desk responsive layout', () => {
  it('stacks the workspace for intermediate-width and desktop-mode mobile viewports', () => {
    expect(styles).toContain('@media (max-width: 1024px)')
    expect(styles).toContain('.workspaceShell { grid-template-columns: minmax(0, 1fr); }')
    expect(styles).toContain('.conversation { order: -1; }')
  })
})
