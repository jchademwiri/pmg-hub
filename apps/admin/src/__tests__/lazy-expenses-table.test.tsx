/**
 * Component tests for LazyExpensesTable.
 *
 * Validates:
 * - Loading state renders a skeleton before data resolves
 * - Fetches by month when `month` is provided, by year otherwise
 * - divisionId/category filters are forwarded to the fetch call
 * - Error state renders with a working retry button
 * - Successful update/delete actions trigger a refetch; failed ones don't
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

const mockFetchByMonth = vi.fn()
const mockFetchByYear = vi.fn()

vi.mock('@/app/actions/expenses', () => ({
  fetchExpensesByMonth: (...args: unknown[]) => mockFetchByMonth(...args),
  fetchExpensesByYear: (...args: unknown[]) => mockFetchByYear(...args),
}))

vi.mock('@/components/expenses/expense-table', () => ({
  ExpenseTable: ({ entries, deleteAction, updateAction }: any) => (
    <div data-testid="expense-table">
      <span data-testid="entry-count">{entries.length}</span>
      <button onClick={() => deleteAction('exp-1')}>Delete</button>
      <button onClick={() => updateAction('exp-1', new FormData())}>Update</button>
    </div>
  ),
}))

import { LazyExpensesTable } from '@/app/(admin)/finance/expenses/lazy-expenses-table'

const baseProps = {
  divisions: [{ id: 'div-1', name: 'Engineering' }],
  categories: ['Software'],
  clients: [{ id: 'client-1', name: 'Google' }],
  closedPeriods: [],
  minDate: '2026-01-01',
  updateAction: vi.fn(),
  deleteAction: vi.fn(),
}

const sampleEntries = [
  { id: 'exp-1', date: '2026-05-15', category: 'Software', amount: '120.00' },
]

describe('LazyExpensesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchByMonth.mockResolvedValue({ data: sampleEntries })
    mockFetchByYear.mockResolvedValue({ data: sampleEntries })
  })

  it('renders a skeleton before data resolves', () => {
    mockFetchByMonth.mockReturnValue(new Promise(() => {})) // never resolves
    const { container } = render(
      <LazyExpensesTable {...baseProps} year={2026} month={5} />
    )
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    expect(screen.queryByTestId('expense-table')).not.toBeInTheDocument()
  })

  it('fetches by month and renders the table once data resolves', async () => {
    render(<LazyExpensesTable {...baseProps} year={2026} month={5} />)

    await waitFor(() => {
      expect(screen.getByTestId('expense-table')).toBeInTheDocument()
    })
    expect(mockFetchByMonth).toHaveBeenCalledWith(2026, 5, undefined, undefined)
    expect(mockFetchByYear).not.toHaveBeenCalled()
    expect(screen.getByTestId('entry-count')).toHaveTextContent('1')
  })

  it('fetches by year when month is not provided', async () => {
    render(<LazyExpensesTable {...baseProps} year={2026} />)

    await waitFor(() => {
      expect(screen.getByTestId('expense-table')).toBeInTheDocument()
    })
    expect(mockFetchByYear).toHaveBeenCalledWith(2026, undefined, undefined)
    expect(mockFetchByMonth).not.toHaveBeenCalled()
  })

  it('forwards divisionId and category filters to the fetch call', async () => {
    render(
      <LazyExpensesTable
        {...baseProps}
        year={2026}
        month={5}
        divisionId="div-1"
        category="Software"
      />
    )

    await waitFor(() => {
      expect(mockFetchByMonth).toHaveBeenCalledWith(2026, 5, 'div-1', 'Software')
    })
  })

  it('renders an error state with a retry button on fetch failure', async () => {
    mockFetchByMonth.mockRejectedValue(new Error('network down'))
    render(<LazyExpensesTable {...baseProps} year={2026} month={5} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load data.')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('expense-table')).not.toBeInTheDocument()

    // Retry re-triggers the fetch
    mockFetchByMonth.mockResolvedValueOnce({ data: sampleEntries })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(screen.getByTestId('expense-table')).toBeInTheDocument()
    })
    expect(mockFetchByMonth).toHaveBeenCalledTimes(2)
  })

  it('refetches after a successful delete but not after a failed one', async () => {
    const deleteAction = vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({ error: 'nope' })
    render(
      <LazyExpensesTable {...baseProps} year={2026} month={5} deleteAction={deleteAction} />
    )
    await waitFor(() => expect(screen.getByTestId('expense-table')).toBeInTheDocument())
    expect(mockFetchByMonth).toHaveBeenCalledTimes(1)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(deleteAction).toHaveBeenCalledWith('exp-1')
    await waitFor(() => expect(mockFetchByMonth).toHaveBeenCalledTimes(2))

    // Second delete fails — should not trigger another refetch
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(deleteAction).toHaveBeenCalledTimes(2))
    expect(mockFetchByMonth).toHaveBeenCalledTimes(2)
  })

  it('refetches after a successful update but not after a failed one', async () => {
    const updateAction = vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({ error: 'nope' })
    render(
      <LazyExpensesTable {...baseProps} year={2026} month={5} updateAction={updateAction} />
    )
    await waitFor(() => expect(screen.getByTestId('expense-table')).toBeInTheDocument())
    expect(mockFetchByMonth).toHaveBeenCalledTimes(1)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Update' }))
    expect(updateAction).toHaveBeenCalledWith('exp-1', expect.any(FormData))
    await waitFor(() => expect(mockFetchByMonth).toHaveBeenCalledTimes(2))

    await user.click(screen.getByRole('button', { name: 'Update' }))
    await waitFor(() => expect(updateAction).toHaveBeenCalledTimes(2))
    expect(mockFetchByMonth).toHaveBeenCalledTimes(2)
  })
})
