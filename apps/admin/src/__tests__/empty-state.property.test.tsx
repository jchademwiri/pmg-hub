/**
 * Property-Based Tests for EmptyState
 *
 * Property 2: EmptyState renders its message and CTA for any input
 * Validates: Requirements 4.6, 4.7
 */

import { describe, it } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import { EmptyState } from '@/components/ui/empty-state'

// Mock next/link so it renders as a plain <a> in jsdom
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

/** Arbitrary that produces non-empty strings */
const nonEmptyString = fc.string({ minLength: 1 })

describe('EmptyState — Property 2: renders message and CTA for any input', () => {
  /**
   * For any non-empty message string, the rendered output must contain that message.
   * Validates: Requirements 4.6
   */
  it('always renders the message text — Validates: Requirements 4.6', () => {
    fc.assert(
      fc.property(nonEmptyString, (message) => {
        const { container, unmount } = render(<EmptyState message={message} />)
        const found = container.textContent?.includes(message) ?? false
        unmount()
        return found
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For any non-empty message, ctaLabel, and valid URL ctaHref, the rendered
   * output must contain a link with the correct href and label text.
   * Validates: Requirements 4.7
   */
  it('always renders the CTA link when ctaLabel and ctaHref are provided — Validates: Requirements 4.7', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        fc.webUrl(),
        (message, ctaLabel, ctaHref) => {
          const { container, unmount } = render(
            <EmptyState message={message} ctaLabel={ctaLabel} ctaHref={ctaHref} />
          )
          const link = container.querySelector('a')
          const found =
            link !== null &&
            link.textContent?.trim() === ctaLabel.trim() &&
            link.getAttribute('href') === ctaHref
          unmount()
          return found
        }
      ),
      { numRuns: 100 }
    )
  })
})
