import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AdminLoading from '@/app/(admin)/loading'

// ─── Unit tests (Task 3.1) ────────────────────────────────────────────────────

describe('AdminLoading', () => {
  it('renders Skeleton elements — Validates: Requirements 3.3', () => {
    const { container } = render(<AdminLoading />)
    // Skeleton renders with data-slot="skeleton"
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders 2 Skeleton elements in the page header bar — Validates: Requirements 3.3', () => {
    const { container } = render(<AdminLoading />)
    // Header bar has title skeleton (h-8 w-48) and action button skeleton (h-9 w-28)
    const headerRow = container.querySelector('.flex.items-center.justify-between')
    expect(headerRow).not.toBeNull()
    const headerSkeletons = headerRow!.querySelectorAll('[data-slot="skeleton"]')
    expect(headerSkeletons.length).toBe(2)
  })

  it('renders 5 placeholder table rows — Validates: Requirements 3.3', () => {
    const { container } = render(<AdminLoading />)
    // The table section: first child is header row, then 5 data rows
    const tableSection = container.querySelector('.flex.flex-col.gap-2')
    expect(tableSection).not.toBeNull()
    // Each row is a flex div with gap-4; there are 6 total (1 header + 5 rows)
    const rows = tableSection!.querySelectorAll('.flex.gap-4')
    expect(rows.length).toBe(6)
  })

  it('renders 4 Skeleton cells per table row — Validates: Requirements 3.3', () => {
    const { container } = render(<AdminLoading />)
    const tableSection = container.querySelector('.flex.flex-col.gap-2')
    const rows = tableSection!.querySelectorAll('.flex.gap-4')
    rows.forEach((row) => {
      const cells = row.querySelectorAll('[data-slot="skeleton"]')
      expect(cells.length).toBe(4)
    })
  })
})
