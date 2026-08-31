/**
 * Component tests for ExpensesHeader.
 *
 * Validates:
 * - Renders the "Add Expense" trigger with the add-form dialog closed
 * - Clicking the trigger opens the dialog
 * - A successful create closes the dialog
 * - A failed create keeps the dialog open (error surfaces to the caller)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('@/components/expenses/expense-add-form', () => ({
  ExpenseAddForm: ({ createAction, onCancel }: any) => (
    <div data-testid="expense-add-form">
      <button onClick={() => createAction(new FormData())}>Submit form</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

import { ExpensesHeader } from '@/app/(admin)/finance/expenses/expenses-header';

const baseProps = {
  divisions: [{ id: 'div-1', name: 'Engineering' }],
  categories: ['Software'],
  clients: [{ id: 'client-1', name: 'Google' }],
  minDate: '2026-01-01',
};

describe('ExpensesHeader', () => {
  it('renders the Add Expense trigger with the dialog closed', () => {
    render(<ExpensesHeader {...baseProps} createAction={vi.fn()} />);
    expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
    expect(screen.queryByTestId('expense-add-form')).not.toBeInTheDocument();
  });

  it('opens the dialog when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpensesHeader {...baseProps} createAction={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add expense/i }));
    expect(screen.getByTestId('expense-add-form')).toBeInTheDocument();
  });

  it('closes the dialog after a successful create', async () => {
    const createAction = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<ExpensesHeader {...baseProps} createAction={createAction} />);

    await user.click(screen.getByRole('button', { name: /add expense/i }));
    await user.click(screen.getByRole('button', { name: 'Submit form' }));

    expect(createAction).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByTestId('expense-add-form')).not.toBeInTheDocument();
    });
  });

  it('keeps the dialog open when create fails', async () => {
    const createAction = vi.fn().mockResolvedValue({ error: 'Something went wrong' });
    const user = userEvent.setup();
    render(<ExpensesHeader {...baseProps} createAction={createAction} />);

    await user.click(screen.getByRole('button', { name: /add expense/i }));
    await user.click(screen.getByRole('button', { name: 'Submit form' }));

    expect(createAction).toHaveBeenCalled();
    expect(screen.getByTestId('expense-add-form')).toBeInTheDocument();
  });

  it('closes the dialog when cancelled', async () => {
    const user = userEvent.setup();
    render(<ExpensesHeader {...baseProps} createAction={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add expense/i }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByTestId('expense-add-form')).not.toBeInTheDocument();
  });
});
