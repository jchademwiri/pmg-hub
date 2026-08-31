/**
 * Component tests for RestoreWriteOffButton.
 *
 * Validates:
 * - Confirms before restoring, with no action taken if the user cancels
 * - Successful restore shows a success toast and refreshes the router
 * - A returned error shows an error toast (no refresh)
 * - An unexpected throw is caught and surfaces a generic error toast
 * - The button is disabled while the restore is pending
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockConfirm = vi.fn();
vi.mock('@/components/ui/confirm-dialog', () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

import { toast } from 'sonner';
import { RestoreWriteOffButton } from '@/components/billing/restore-write-off-button';

describe('RestoreWriteOffButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
  });

  it('does not call the restore action if the user cancels the confirmation', async () => {
    const restoreWriteOffAction = vi.fn();
    mockConfirm.mockResolvedValue(false);
    const user = userEvent.setup();

    render(
      <RestoreWriteOffButton invoiceId="inv-1" restoreWriteOffAction={restoreWriteOffAction} />,
    );
    await user.click(screen.getByRole('button', { name: 'Remove Write-off' }));

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Remove Write-off?' }),
    );
    expect(restoreWriteOffAction).not.toHaveBeenCalled();
  });

  it('restores successfully: shows a success toast and refreshes', async () => {
    const restoreWriteOffAction = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();

    render(
      <RestoreWriteOffButton invoiceId="inv-1" restoreWriteOffAction={restoreWriteOffAction} />,
    );
    await user.click(screen.getByRole('button', { name: 'Remove Write-off' }));

    await waitFor(() => {
      expect(restoreWriteOffAction).toHaveBeenCalledWith('inv-1');
    });
    expect(toast.success).toHaveBeenCalledWith('Write-off removed and invoice status restored.');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows an error toast and does not refresh when the action returns an error', async () => {
    const restoreWriteOffAction = vi.fn().mockResolvedValue({ error: 'Invoice not found.' });
    const user = userEvent.setup();

    render(
      <RestoreWriteOffButton invoiceId="inv-1" restoreWriteOffAction={restoreWriteOffAction} />,
    );
    await user.click(screen.getByRole('button', { name: 'Remove Write-off' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invoice not found.');
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('shows a generic error toast when the action throws', async () => {
    const restoreWriteOffAction = vi.fn().mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();

    render(
      <RestoreWriteOffButton invoiceId="inv-1" restoreWriteOffAction={restoreWriteOffAction} />,
    );
    await user.click(screen.getByRole('button', { name: 'Remove Write-off' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'An unexpected error occurred while removing the write-off.',
      );
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('disables the button while the restore is pending', async () => {
    let resolveAction: (v: { error?: string }) => void;
    const restoreWriteOffAction = vi.fn(
      () =>
        new Promise<{ error?: string }>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const user = userEvent.setup();

    render(
      <RestoreWriteOffButton invoiceId="inv-1" restoreWriteOffAction={restoreWriteOffAction} />,
    );
    const button = screen.getByRole('button', { name: 'Remove Write-off' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Removing Write-off...' })).toBeDisabled();
    });

    resolveAction!({});
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove Write-off' })).not.toBeDisabled();
    });
  });
});
