import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LeadStatusTabs } from '@/components/leads/lead-status-tabs'
import { LeadsTable } from '@/components/leads/leads-table'
import { LeadStatusForm } from '@/components/leads/lead-status-form'
import { LeadNotesForm } from '@/components/leads/lead-notes-form'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: any) => (
    <div data-disabled={disabled}>{children}</div>
  ),
  SelectTrigger: ({ children, id }: any) => <div id={id}>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultCounts = { all: 10, new: 3, contacted: 4, converted: 2, lost: 1 }

// ─── LeadStatusTabs unit tests ───────────────────────────────────────────────

describe('LeadStatusTabs', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the correct tab as active based on currentStatus prop', () => {
    // Validates: Requirements 2.3, 2.5
    render(<LeadStatusTabs counts={defaultCounts} currentStatus="contacted" />)

    // The "Contacted" button should have the active styling class
    const contactedBtn = screen.getByRole('button', { name: /contacted/i })
    expect(contactedBtn.className).toContain('bg-card')

    // The "New" button should NOT have the active styling class
    const newBtn = screen.getByRole('button', { name: /^new/i })
    expect(newBtn.className).not.toContain('bg-card')
  })

  it('defaults to "all" tab when currentStatus is undefined', () => {
    // Validates: Requirements 2.3, 2.5
    render(<LeadStatusTabs counts={defaultCounts} />)

    const allBtn = screen.getByRole('button', { name: /^all/i })
    expect(allBtn.className).toContain('bg-card')

    const newBtn = screen.getByRole('button', { name: /^new/i })
    expect(newBtn.className).not.toContain('bg-card')
  })

  it('tab change preserves currentDivisionId and currentSource in URL', async () => {
    // Validates: Requirements 2.3, 2.5
    const mockPush = vi.fn()
    const { useRouter } = await import('next/navigation')
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)

    render(
      <LeadStatusTabs
        counts={defaultCounts}
        currentStatus="new"
        currentDivisionId="div-123"
        currentSource="website"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /contacted/i }))

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('status=contacted')
    )
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('divisionId=div-123')
    )
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('source=website')
    )
  })

  it('tab change to "all" omits status param from URL', async () => {
    // Validates: Requirements 2.3, 2.5
    const mockPush = vi.fn()
    const { useRouter } = await import('next/navigation')
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)

    render(<LeadStatusTabs counts={defaultCounts} currentStatus="new" />)

    fireEvent.click(screen.getByRole('button', { name: /^all/i }))

    const calledWith: string = mockPush.mock.calls[0][0]
    expect(calledWith).not.toContain('status=')
  })
})

// ─── LeadsTable unit tests ────────────────────────────────────────────────────

describe('LeadsTable', () => {
  it('renders no rows when entries is empty', () => {
    // Validates: Requirements 1.3
    render(<LeadsTable entries={[]} />)

    const links = screen.queryAllByRole('link', { name: /view/i })
    expect(links).toHaveLength(0)
  })

  it('renders detail links with correct /leads/<id> hrefs', () => {
    // Validates: Requirements 1.4
    const entries = [
      {
        id: 'lead-1',
        name: 'Alice',
        email: 'alice@example.com',
        phone: null,
        message: null,
        source: 'website',
        serviceInterest: null,
        status: 'new',
        divisionId: null,
        divisionName: null,
        notes: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
      },
      {
        id: 'lead-2',
        name: 'Bob',
        email: null,
        phone: '0821234567',
        message: null,
        source: null,
        serviceInterest: null,
        status: 'contacted',
        divisionId: null,
        divisionName: null,
        notes: null,
        createdAt: new Date('2024-01-02'),
        updatedAt: null,
      },
    ]

    render(<LeadsTable entries={entries} />)

    const links = screen.getAllByRole('link', { name: /view/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/leads/lead-1')
    expect(links[1]).toHaveAttribute('href', '/leads/lead-2')
  })
})

// ─── LeadStatusForm unit tests ────────────────────────────────────────────────

describe('LeadStatusForm', () => {
  it('submit button is initially enabled with correct label', () => {
    // Validates: Requirements 5.5
    const mockAction = vi.fn().mockResolvedValue({})
    render(<LeadStatusForm currentStatus="new" updateAction={mockAction} />)

    const submitBtn = screen.getByRole('button', { name: /update status/i })
    expect(submitBtn).not.toBeDisabled()
  })
})

// ─── LeadNotesForm unit tests ─────────────────────────────────────────────────

describe('LeadNotesForm', () => {
  it('pre-populates textarea with existing notes value', () => {
    // Validates: Requirements 7.1, 7.5
    const mockAction = vi.fn().mockResolvedValue({})
    render(<LeadNotesForm currentNotes="Some existing notes" updateAction={mockAction} />)

    const textarea = screen.getByRole('textbox', { name: /notes/i })
    expect(textarea).toHaveValue('Some existing notes')
  })

  it('renders empty textarea when currentNotes is null', () => {
    // Validates: Requirements 7.1
    const mockAction = vi.fn().mockResolvedValue({})
    render(<LeadNotesForm currentNotes={null} updateAction={mockAction} />)

    const textarea = screen.getByRole('textbox', { name: /notes/i })
    expect(textarea).toHaveValue('')
  })
})
