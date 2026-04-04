import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import { EmptyState } from '@/components/ui/empty-state'

// Mock next/link so it renders as a plain <a> in jsdom
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// ─── Unit tests (Task 1.2) ────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders the message — Validates: Requirements 4.6', () => {
    render(<EmptyState message="No income records yet." />)
    expect(screen.getByText('No income records yet.')).toBeDefined()
  })

  it('renders the CTA link when ctaLabel and ctaHref are provided — Validates: Requirements 4.7', () => {
    render(
      <EmptyState
        message="No expenses yet."
        ctaLabel="Add Expense"
        ctaHref="/expenses/new"
      />
    )
    const link = screen.getByRole('link', { name: /add expense/i })
    expect(link).toBeDefined()
    expect((link as HTMLAnchorElement).href).toContain('/expenses/new')
  })

  it('does not render a link when ctaLabel/ctaHref are omitted — Validates: Requirements 4.7', () => {
    render(<EmptyState message="No reports available." />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders with filtered=true (filter-specific icon/state) — Validates: Requirements 4.8', () => {
    render(
      <EmptyState
        message="No results match your filter."
        filtered={true}
      />
    )
    expect(screen.getByText('No results match your filter.')).toBeDefined()
  })

  it('renders with filtered=false (zero-data state) — Validates: Requirements 4.8', () => {
    render(
      <EmptyState
        message="No leads yet."
        filtered={false}
      />
    )
    expect(screen.getByText('No leads yet.')).toBeDefined()
  })
})

// ─── Property-based test (Task 1.1) ──────────────────────────────────────────
// Property 2: EmptyState renders its message and CTA for any input
// Validates: Requirements 4.6, 4.7

/** Arbitrary that produces non-empty, non-whitespace-only strings */
const nonBlankString = fc
  .string({ minLength: 1 })
  .filter((s) => s.trim().length > 0)

describe('EmptyState — Property 2: renders message and CTA for any input', () => {
  it('always renders the message text — Validates: Requirements 4.6', () => {
    fc.assert(
      fc.property(nonBlankString, (message) => {
        const { container, unmount } = render(<EmptyState message={message} />)
        const found = container.textContent?.includes(message.trim()) ?? false
        unmount()
        return found
      }),
      { numRuns: 100 }
    )
  })

  it('always renders the CTA link when ctaLabel and ctaHref are provided — Validates: Requirements 4.7', () => {
    fc.assert(
      fc.property(
        nonBlankString,
        nonBlankString,
        fc.webUrl(),
        (message, ctaLabel, ctaHref) => {
          const { container, unmount } = render(
            <EmptyState message={message} ctaLabel={ctaLabel} ctaHref={ctaHref} />
          )
          const link = container.querySelector('a')
          const found =
            link !== null &&
            (link.textContent?.trim() === ctaLabel.trim()) &&
            link.getAttribute('href') === ctaHref
          unmount()
          return found
        }
      ),
      { numRuns: 100 }
    )
  })
})
