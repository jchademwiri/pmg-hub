import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminError from '@/app/(admin)/error'

// Mock next/link so it renders as a plain <a> in jsdom
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// ─── Unit tests (Task 2.1) ────────────────────────────────────────────────────

describe('AdminError', () => {
  const mockError = new Error('Internal DB failure') as Error & { digest?: string }

  it('renders a safe, non-technical user message — Validates: Requirements 2.2', () => {
    render(<AdminError error={mockError} reset={() => {}} />)
    // Should show a generic message
    expect(screen.getByText(/something went wrong/i)).toBeDefined()
    // Must NOT expose the raw error message
    expect(screen.queryByText('Internal DB failure')).toBeNull()
  })

  it('does not render error.message or stack trace — Validates: Requirements 2.2', () => {
    const errorWithStack = Object.assign(new Error('secret stack trace'), {
      stack: 'Error: secret stack trace\n  at someFunction',
    }) as Error & { digest?: string }
    const { container } = render(<AdminError error={errorWithStack} reset={() => {}} />)
    expect(container.textContent).not.toContain('secret stack trace')
    expect(container.textContent).not.toContain('at someFunction')
  })

  it('"Try again" button calls reset() — Validates: Requirements 2.3', async () => {
    const reset = vi.fn()
    render(<AdminError error={mockError} reset={reset} />)
    const button = screen.getByRole('button', { name: /try again/i })
    await userEvent.click(button)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('renders a link to /dashboard — Validates: Requirements 2.4', () => {
    render(<AdminError error={mockError} reset={() => {}} />)
    const link = screen.getByRole('link', { name: /dashboard/i })
    expect(link).toBeDefined()
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/dashboard')
  })

  it('renders the error digest reference when present — Validates: Requirements 2.2', () => {
    const errorWithDigest = Object.assign(new Error('oops'), { digest: 'abc123' }) as Error & { digest?: string }
    render(<AdminError error={errorWithDigest} reset={() => {}} />)
    expect(screen.getByText(/abc123/)).toBeDefined()
  })

  it('does not render a digest reference when digest is absent', () => {
    render(<AdminError error={mockError} reset={() => {}} />)
    expect(screen.queryByText(/reference:/i)).toBeNull()
  })
})
