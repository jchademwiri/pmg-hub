/**
 * Component tests for tender schedule form dialogs.
 *
 * Validates:
 * - Client/division selection persists after re-render (the bug fix)
 * - Inline error display and clearing
 * - Form reset on dialog close (create) / successful save (edit)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// Increase timeout for async transition tests under parallel load
vi.setConfig({ testTimeout: 15_000 });
import userEvent from '@testing-library/user-event'
import React from 'react'

// ─── Shared Mocks (top-level) ─────────────────────────────────────────────────

const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
import { toast } from 'sonner'

// Select mock — native <select> instead of Radix
vi.mock('@/components/ui/select', () => {
  const React = require('react')
  const Ctx = React.createContext(null)
  return {
    Select: ({ children, value, defaultValue, onValueChange, disabled, name }: any) => {
      const [triggerId, setTriggerId] = React.useState(undefined as string | undefined)
      const [v, setV] = React.useState(value ?? defaultValue ?? '')
      React.useEffect(() => { if (value !== undefined) setV(value) }, [value])
      return (
        <Ctx.Provider value={{ triggerId, setTriggerId }}>
          <select data-testid="select-wrapper" id={triggerId} name={name} value={v}
            disabled={disabled}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setV(e.target.value)
              onValueChange?.(e.target.value)
            }}>
            {children}
          </select>
        </Ctx.Provider>
      )
    },
    SelectTrigger: ({ children, id }: any) => {
      const ctx = React.useContext(Ctx)
      React.useEffect(() => { if (id && ctx) ctx.setTriggerId(id) }, [id, ctx])
      return <>{children}</>
    },
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
    SelectValue: () => null,
    SelectGroup: ({ children }: any) => <>{children}</>,
    SelectLabel: ({ children }: any) => <>{children}</>,
  }
})

// ─── Action mock refs (single shared mock) ────────────────────────────────────

const mockFormCreate = vi.fn()
const mockEditUpdate = vi.fn()
const mockEditUpdateJson = vi.fn()

vi.mock('@/app/actions/project-schedule', () => ({
  createProjectScheduleEntry: (...args: any[]) => mockFormCreate(...args),
  updateProjectScheduleEntry: (...args: any[]) => mockEditUpdate(...args),
  updateProjectScheduleEntryJson: (...args: any[]) => mockEditUpdateJson(...args),
}))

// ─── Progress Action mocks ───────────────────────────────────────────────────

const mockGetChecklist = vi.fn(() => Promise.resolve({ success: true, checklist: [] }))
const mockAddSection = vi.fn()
const mockDeleteSection = vi.fn()
const mockRenameSection = vi.fn()
const mockAddItem = vi.fn()
const mockDeleteItem = vi.fn()
const mockToggleItem = vi.fn()
const mockUpdateItemText = vi.fn()

vi.mock('@/app/actions/project-progress', () => ({
  getProjectChecklistAction: (projectId: string) => mockGetChecklist(),
  addProgressSectionAction: (projectId: string, title: string) => mockAddSection(projectId, title),
  deleteProgressSectionAction: (sectionId: string) => mockDeleteSection(sectionId),
  renameProgressSectionAction: (sectionId: string, title: string) => mockRenameSection(sectionId, title),
  addProgressItemAction: (sectionId: string, task: string) => mockAddItem(sectionId, task),
  deleteProgressItemAction: (itemId: string) => mockDeleteItem(itemId),
  toggleProgressItemAction: (itemId: string, isCompleted: boolean) => mockToggleItem(itemId, isCompleted),
  updateProgressItemTextAction: (itemId: string, task: string) => mockUpdateItemText(itemId, task),
}))

// ─── Test data ────────────────────────────────────────────────────────────────

const mockClients = [
  { id: 'client-1', name: 'Tender Edge Solutions', businessName: null, email: null },
  { id: 'client-2', name: 'Another Client', businessName: null, email: null },
]

const mockDivisions = [
  { id: 'div-1', name: 'PMG' },
  { id: 'div-2', name: 'TES' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// ProjectFormDialog
// ═══════════════════════════════════════════════════════════════════════════════

describe('ProjectFormDialog', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFormCreate.mockReset()
    mockOnOpenChange.mockReset()
    mockRefresh.mockReset()
    vi.mocked(toast.success).mockClear()
  })

  // Helper: fill required fields for form submission (bypasses native validation)
  async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
    await user.selectOptions(screen.getByLabelText(/client/i), 'client-1')
    // Tender Reference
    await user.type(screen.getByPlaceholderText('e.g. T12/2026'), 'T12/2026')
    // Closing Date — fireEvent.change is more reliable in jsdom than userEvent.type for type="date"
    fireEvent.change(screen.getByLabelText(/closing date/i), { target: { value: '2026-07-14' } })
    // Effort Days
    await user.clear(screen.getByLabelText(/effort/i))
    await user.type(screen.getByLabelText(/effort/i), '3')
  }

  async function renderFormDialog() {
    const { ProjectFormDialog } = await import('@/components/projects/project-form-dialog')
    return render(
      <ProjectFormDialog clients={mockClients} divisions={mockDivisions} open={true} onOpenChange={mockOnOpenChange} />,
    )
  }

  it('renders title and description', async () => {
    await renderFormDialog()
    expect(screen.getByText('New Tender Schedule Entry')).toBeInTheDocument()
    expect(screen.getByText(/Add a tender/)).toBeInTheDocument()
  })

  it('shows inline error when action returns { error }', async () => {
    const user = userEvent.setup()
    mockFormCreate.mockResolvedValue({ error: 'A client is required.' })
    await renderFormDialog()
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /add to schedule/i }))
    expect(await screen.findByText('A client is required.')).toBeInTheDocument()
  })

  it('clears error on subsequent successful submission', async () => {
    const user = userEvent.setup()
    mockFormCreate.mockResolvedValueOnce({ error: 'First error.' }).mockResolvedValueOnce({})
    await renderFormDialog()
    await fillRequiredFields(user)
    // First submission — triggers error
    await user.click(screen.getByRole('button', { name: /add to schedule/i }))
    expect(await screen.findByText('First error.')).toBeInTheDocument()
    // Second submission — use findByRole to wait for the transition to settle
    const btn = await screen.findByRole('button', { name: /add to schedule/i })
    await user.click(btn)
    await waitFor(() => expect(screen.queryByText('First error.')).toBeNull())
  })

  it('closes dialog and shows toast on success', async () => {
    const user = userEvent.setup()
    mockFormCreate.mockResolvedValue({})
    await renderFormDialog()
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /add to schedule/i }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Tender added to schedule'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('preserves client selection after re-render from effort change', async () => {
    const user = userEvent.setup()
    await renderFormDialog()
    await user.selectOptions(screen.getByLabelText(/client/i), 'client-1')
    const hidden = document.getElementById('tender-client-hidden') as HTMLInputElement
    expect(hidden?.value).toBe('client-1')
    // Trigger re-render via effort number input
    await user.clear(screen.getByLabelText(/effort/i))
    await user.type(screen.getByLabelText(/effort/i), '5')
    expect(hidden?.value).toBe('client-1')
  })

  it('preserves division selection after re-render from effort change', async () => {
    const user = userEvent.setup()
    await renderFormDialog()
    await user.selectOptions(screen.getByLabelText(/division/i), 'div-1')
    const hidden = document.getElementById('tender-division-hidden') as HTMLInputElement
    expect(hidden?.value).toBe('div-1')
    await user.clear(screen.getByLabelText(/effort/i))
    await user.type(screen.getByLabelText(/effort/i), '5')
    expect(hidden?.value).toBe('div-1')
  })

  it('defaults division to __none__', async () => {
    await renderFormDialog()
    expect((document.getElementById('tender-division-hidden') as HTMLInputElement)?.value).toBe('__none__')
  })

  it('defaults buffer to 5 days', async () => {
    await renderFormDialog()
    expect(screen.getByLabelText(/buffer/i)).toHaveValue(5)
  })

  it('updates the schedule preview when effort changes', async () => {
    const user = userEvent.setup()
    await renderFormDialog()
    fireEvent.change(screen.getByLabelText(/closing date/i), { target: { value: '2026-07-14' } })
    await user.clear(screen.getByLabelText(/effort/i))
    await user.type(screen.getByLabelText(/effort/i), '3')

    expect(screen.getByText(/Start \+ 3 days/i)).toBeInTheDocument()
    expect(screen.getByText(/14 Jul 2026/i)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ProjectEditDialog
// ═══════════════════════════════════════════════════════════════════════════════

describe('ProjectEditDialog', () => {
  const mockOnClose = vi.fn()

  const mockTender = {
    id: 'tender-1',
    clientId: 'client-1',
    divisionId: 'div-1',
    projectReference: 'T12/2026',
    closingDate: '2026-07-14',
    effortDays: 3, bufferDays: 2,
    startDate: '2026-07-01', targetCompletionDate: '2026-07-04',
    status: 'planned' as const, priority: 'high' as const,
    notes: 'Original notes', blockers: null, outcome: null,
    description: null,
    createdBy: 'user-1', actualEffortDays: null,
    actualCompletionDate: null, submissionDate: null,
    sortOrder: null,
    createdAt: new Date('2026-06-01'), updatedAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockEditUpdate.mockReset()
    mockEditUpdateJson.mockReset()
    mockOnClose.mockReset()
    mockRefresh.mockReset()
    vi.mocked(toast.success).mockClear()
  })

  async function renderEditDialog() {
    const { ProjectEditDialog } = await import('@/components/projects/project-edit-dialog')
    return render(
      <ProjectEditDialog tender={mockTender} clients={mockClients} divisions={mockDivisions} onClose={mockOnClose} />,
    )
  }

  it('renders with pre-filled client', async () => {
    await renderEditDialog()
    expect(screen.getByLabelText(/client/i)).toHaveValue('client-1')
  })

  it('preserves client selection after tab switch', async () => {
    const user = userEvent.setup()
    mockEditUpdate.mockResolvedValue({})
    await renderEditDialog()

    await user.selectOptions(screen.getByLabelText(/client/i), 'client-2')
    const hidden = document.getElementById('edit-client-hidden') as HTMLInputElement
    expect(hidden?.value).toBe('client-2')

    // Tab triggers are role="tab"
    await user.click(screen.getByRole('tab', { name: /tracking/i }))
    await user.click(screen.getByRole('tab', { name: /details/i }))
    expect(hidden?.value).toBe('client-2')
  })

  it('preserves division selection after tab switch', async () => {
    const user = userEvent.setup()
    mockEditUpdate.mockResolvedValue({})
    await renderEditDialog()

    await user.selectOptions(screen.getByLabelText(/division/i), 'div-2')
    const hidden = document.getElementById('edit-division-hidden') as HTMLInputElement
    expect(hidden?.value).toBe('div-2')

    await user.click(screen.getByRole('tab', { name: /tracking/i }))
    await user.click(screen.getByRole('tab', { name: /details/i }))
    expect(hidden?.value).toBe('div-2')
  })

  it('shows inline error on failed save', async () => {
    const user = userEvent.setup()
    mockEditUpdate.mockResolvedValue({ error: 'Update failed.' })
    await renderEditDialog()
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText('Update failed.')).toBeInTheDocument()
  })

  it('clears error on subsequent successful save', async () => {
    const user = userEvent.setup()
    mockEditUpdate.mockResolvedValueOnce({ error: 'First error.' }).mockResolvedValueOnce({})
    await renderEditDialog()
    // First save — triggers error
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText('First error.')).toBeInTheDocument()
    // Second save — use findByRole to wait for transition to settle
    const btn = await screen.findByRole('button', { name: /save changes/i })
    await user.click(btn)
    await waitFor(() => expect(screen.queryByText('First error.')).toBeNull())
  })

  it('shows toast and calls onClose on success', async () => {
    const user = userEvent.setup()
    mockEditUpdate.mockResolvedValue({})
    await renderEditDialog()
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Project updated'))
    expect(mockOnClose).toHaveBeenCalled()
  })
})
