import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BetaDialog } from './BetaDialog'

describe('BetaDialog', () => {
  it('renders as an independently dismissible modal', () => {
    const html = renderToStaticMarkup(
      <BetaDialog eyebrow="Two-week checkpoint" title="How useful was Market Desk?" titleId="survey" onSubmit={vi.fn()} onDismiss={vi.fn()}>
        <p>Survey content</p>
      </BetaDialog>,
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('Not now')
    expect(html).toContain('type="button"')
  })
})
