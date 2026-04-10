/**
 * Unit Tests for EmptyState
 * Validates: Requirements 4.6, 4.7, 4.8
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/components/ui/empty-state'

// Mock next/link as a plain <a> tag
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('EmptyState', () => {
  it('renders the message and CTA link when both ctaLabel and ctaHref are provided', () => {
    render(
      <EmptyState
        message="No income records found."
        ctaLabel="Add Income"
        ctaHref="/income/new"
      />
    )

    expect(screen.getByText('No income records found.')).toBeTruthy()

    const link = screen.getByRole('link', { name: 'Add Income' })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/income/new')
  })

  it('does not render a link when CTA props are omitted', () => {
    render(<EmptyState message="No records yet." />)

    expect(screen.getByText('No records yet.')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('does not render a link when only ctaLabel is provided (no ctaHref)', () => {
    render(<EmptyState message="No records yet." ctaLabel="Add Item" />)

    expect(screen.queryByRole('link')).toBeNull()
  })

  it('does not render a link when only ctaHref is provided (no ctaLabel)', () => {
    render(<EmptyState message="No records yet." ctaHref="/items/new" />)

    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders a filter-specific message when filtered=true', () => {
    render(
      <EmptyState
        message="No results match your current filter."
        filtered={true}
      />
    )

    expect(screen.getByText('No results match your current filter.')).toBeTruthy()
  })

  it('renders the message without a link when filtered=true and no CTA provided', () => {
    render(
      <EmptyState
        message="No results match your current filter."
        filtered={true}
      />
    )

    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders both message and CTA when filtered=true with CTA props', () => {
    render(
      <EmptyState
        message="No results match your current filter."
        filtered={true}
        ctaLabel="Clear Filters"
        ctaHref="/leads"
      />
    )

    expect(screen.getByText('No results match your current filter.')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Clear Filters' })
    expect(link.getAttribute('href')).toBe('/leads')
  })
})
