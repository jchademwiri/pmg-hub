import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ─── Setup Mocks ─────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();
const mockDbExecute = vi.fn();

const dbMock = {
  insert: mockDbInsert,
  select: mockDbSelect,
  update: mockDbUpdate,
  delete: mockDbDelete,
  execute: mockDbExecute,
};

vi.mock('@pmg/db', () => ({
  getDb: () => dbMock,
  billingItems: { id: 'billing_item_id', name: 'name', status: 'status', unitPrice: 'unitPrice', description: 'description', unitLabel: 'unitLabel' },
  billingLineItems: { id: 'billing_line_item_id', documentType: 'documentType', description: 'description' },
  eq: vi.fn(),
  and: vi.fn(),
  getAllItems: vi.fn(),
}));

import { getAllItems } from '@pmg/db';

vi.mock('@/lib/auth', () => ({
  getSessionOrRedirect: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

import { getSessionOrRedirect } from '@/lib/auth';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from 'next/cache';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: mockBack,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

// ─── Import Code Under Test ──────────────────────────────────────────────────
import { createItem, updateItem, archiveItem, unarchiveItem, deleteItem } from '@/app/actions/billing-items';
import ItemsPage from '@/app/(admin)/billing/items/page';
import { ItemFormClient } from '@/app/(admin)/billing/items/new/item-form-client';
import { ItemEditClient } from '@/app/(admin)/billing/items/[id]/item-edit-client';

describe('Billing Items Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSessionOrRedirect).mockResolvedValue({ user: { id: 'user-1' } } as any);
  });

  describe('Server Actions', () => {
    it('createItem - creates an item successfully', async () => {
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'new-item-id' }]),
        }),
      });

      const res = await createItem({
        name: 'Maintenance',
        description: 'Monthly service',
        unitPrice: 1500,
        unitLabel: 'month',
      });

      expect(res).toEqual({ id: 'new-item-id' });
      expect(mockDbInsert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/billing/items');
    });

    it('createItem - validation failure', async () => {
      const res = await createItem({
        name: '',
        description: 'Monthly service',
        unitPrice: -50,
        unitLabel: 'month',
      });

      expect(res.error).toBeDefined();
    });

    it('updateItem - updates successfully', async () => {
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(true),
        }),
      });

      const res = await updateItem('item-123', {
        name: 'Maintenance Pro',
        description: 'Gold level support',
        unitPrice: 2500,
        unitLabel: 'month',
      });

      expect(res).toEqual({});
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('archiveItem / unarchiveItem - transitions status correctly', async () => {
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(true),
        }),
      });

      const resArchive = await archiveItem('item-123');
      expect(resArchive).toEqual({});

      const resUnarchive = await unarchiveItem('item-123');
      expect(resUnarchive).toEqual({});
    });

    it('deleteItem - blocks if used, otherwise deletes successfully', async () => {
      mockDbSelect.mockImplementation(() => {
        return {
          from: (table: any) => ({
            where: (cond: any) => {
              if (table.id === 'billing_item_id') {
                return Promise.resolve([{ name: 'Consulting' }]);
              }
              // billingLineItems check
              return {
                limit: () => Promise.resolve([{ id: 'line-item-1' }]), // used
              };
            },
          }),
        };
      });

      const resBlocked = await deleteItem('item-123');
      expect(resBlocked.error).toBe('Archive instead of deleting used items.');

      // Mock not used in invoices
      mockDbSelect.mockImplementation(() => {
        return {
          from: (table: any) => ({
            where: (cond: any) => {
              if (table.id === 'billing_item_id') {
                return Promise.resolve([{ name: 'Consulting' }]);
              }
              return {
                limit: () => Promise.resolve([]), // not used
              };
            },
          }),
        };
      });

      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(true),
      });

      const resSuccess = await deleteItem('item-123');
      expect(resSuccess).toEqual({});
      expect(mockDbDelete).toHaveBeenCalled();
    });
  });

  describe('Pages and Forms', () => {
    it('ItemsPage - renders table of items', async () => {
      vi.mocked(getAllItems).mockResolvedValue([
        { id: '1', name: 'Item Alpha', description: 'Desc A', unitPrice: '120.00', status: 'active', unitLabel: 'hour' },
      ] as any);

      const page = await ItemsPage({ searchParams: Promise.resolve({ status: 'active' }) });
      render(page as React.ReactElement);

      expect(screen.getByText('Item Alpha')).toBeInTheDocument();
      expect(screen.getByText('Desc A')).toBeInTheDocument();
    });

    it('ItemsPage - renders empty state', async () => {
      vi.mocked(getAllItems).mockResolvedValue([]);

      const page = await ItemsPage({ searchParams: Promise.resolve({ status: 'active' }) });
      render(page as React.ReactElement);

      expect(screen.getByText('No items yet. Create your first service item to get started.')).toBeInTheDocument();
    });

    it('ItemFormClient - submits item form correctly', async () => {
      const user = userEvent.setup();
      render(<ItemFormClient />);

      const nameInput = screen.getByLabelText(/Name/);
      const descInput = screen.getByLabelText(/Description/);
      const priceInput = screen.getByLabelText(/Unit Price/);

      await user.type(nameInput, 'New Web App');
      await user.type(descInput, 'React and Next.js development');
      await user.type(priceInput, '15000');

      // mock server action createItem
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
        }),
      });

      const saveBtn = screen.getByRole('button', { name: 'Save Item' });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/billing/items');
      });
    });

    it('ItemEditClient - handles save, archive, and delete interactions', async () => {
      const user = userEvent.setup();
      const mockItem = {
        id: 'item-1',
        name: 'Old Service',
        description: 'Old description',
        unitPrice: '500.00',
        status: 'active' as const,
        unitLabel: 'hour',
        vatApplicable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock confirmation dialog for delete
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ItemEditClient item={mockItem} />);

      // Test Edit Save
      const nameInput = screen.getByDisplayValue('Old Service');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Service');

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(true),
        }),
      });

      const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Item saved.');
        expect(mockPush).toHaveBeenCalledWith('/billing/items');
      });

      // Test Archive
      const archiveBtn = screen.getByRole('button', { name: 'Archive' });
      await user.click(archiveBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Item archived.');
        expect(mockRefresh).toHaveBeenCalled();
      });

      // Test Delete
      const deleteBtn = screen.getByTitle('Delete item');
      mockDbSelect.mockImplementation(() => {
        return {
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]), // not used in invoice
            }),
          }),
        };
      });
      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(true),
      });

      await user.click(deleteBtn);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Item deleted.');
        expect(mockPush).toHaveBeenCalledWith('/billing/items');
      });

      confirmSpy.mockRestore();
    });
  });
});
