/**
 * Component tests for client add/edit forms.
 *
 * Validates:
 * - Division selection persists after re-render
 * - Inline error display on failed save
 * - Form renders with correct labels and fields
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ─── Shared Mocks ────────────────────────────────────────────────────────────

const mockCreateAction = vi.fn()
const mockUpdateAction = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

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

// ─── Test data ───────────────────────────────────────────────────────────────

const mockDivisions = [
  { id: 'div-1', name: 'PMG' },
  { id: 'div-2', name: 'TES' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// ClientAddForm
// ═══════════════════════════════════════════════════════════════════════════════

describe('ClientAddForm', () => {
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateAction.mockReset()
    mockOnCancel.mockReset()
  })

  async function renderAddForm() {
    const { ClientAddForm } = await import('@/components/clients/client-add-form')
    return render(
      <ClientAddForm createAction={mockCreateAction} divisions={mockDivisions} onCancel={mockOnCancel} />,
    )
  }

  it('renders all form fields', async () => {
    await renderAddForm()
    expect(screen.getByPlaceholderText('e.g. Acme Corp')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Acme Pty Ltd')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. billing@acme.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. +27 82 123 4567')).toBeInTheDocument()
    expect(screen.getByLabelText(/division/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add client/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows inline error on failed save', async () => {
    const user = userEvent.setup()
    mockCreateAction.mockResolvedValue({ error: 'Name is required.' })
    await renderAddForm()

    await user.type(screen.getByPlaceholderText('e.g. Acme Corp'), 'Test Client')
    await user.click(screen.getByRole('button', { name: /add client/i }))

    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
  })

  it('clears error on subsequent successful submission', async () => {
    const user = userEvent.setup()
    mockCreateAction.mockResolvedValueOnce({ error: 'First error.' }).mockResolvedValueOnce({})
    await renderAddForm()

    await user.type(screen.getByPlaceholderText('e.g. Acme Corp'), 'Test Client')
    await user.click(screen.getByRole('button', { name: /add client/i }))
    expect(await screen.findByText('First error.')).toBeInTheDocument()

    const btn = await screen.findByRole('button', { name: /add client/i })
    await user.click(btn)

    await waitFor(() => expect(screen.queryByText('First error.')).toBeNull())
  })

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup()
    await renderAddForm()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('defaults division to __none__', async () => {
    await renderAddForm()
    expect((document.getElementById('client-add-division-hidden') as HTMLInputElement)?.value).toBe('__none__')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ClientEditForm
// ═══════════════════════════════════════════════════════════════════════════════

describe('ClientEditForm', () => {
  const mockClient = {
    id: 'client-1',
    name: 'Acme Corp',
    businessName: 'Acme Pty Ltd',
    email: 'billing@acme.com',
    phone: '+27 82 123 4567',
    divisionId: 'div-1',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: null,
    userId: null,
    portalInvitationSentAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateAction.mockReset()
    mockRefresh.mockReset()
  })

  async function renderEditForm() {
    const { ClientEditForm } = await import('@/components/clients/client-edit-form')
    return render(
      <ClientEditForm client={mockClient} divisions={mockDivisions} updateAction={mockUpdateAction} />,
    )
  }

  it('renders with pre-filled client data', async () => {
    await renderEditForm()
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Acme Pty Ltd')).toBeInTheDocument()
    expect(screen.getByDisplayValue('billing@acme.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+27 82 123 4567')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('shows inline error on failed save', async () => {
    const user = userEvent.setup()
    mockUpdateAction.mockResolvedValue({ error: 'Update failed.' })
    await renderEditForm()

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Update failed.')).toBeInTheDocument()
  })

  it('clears error on subsequent successful save', async () => {
    const user = userEvent.setup()
    mockUpdateAction.mockResolvedValueOnce({ error: 'First error.' }).mockResolvedValueOnce({})
    await renderEditForm()

    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText('First error.')).toBeInTheDocument()

    const btn = await screen.findByRole('button', { name: /save changes/i })
    await user.click(btn)

    await waitFor(() => expect(screen.queryByText('First error.')).toBeNull())
  })

  it('calls router.refresh on success', async () => {
    const user = userEvent.setup()
    mockUpdateAction.mockResolvedValue({})
    await renderEditForm()

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
  })
})
