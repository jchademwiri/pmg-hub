import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Setup Mocks ─────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

vi.mock('@pmg/db', () => {
  const mockDb: Record<string, any> = {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn((cb) => cb(mockDb)),
  };
  return {
    db: mockDb,
    getDb: () => mockDb,
    expenseCategories: { id: 'expenseCategories_id', name: 'name' },
    expenses: { id: 'expenses_id', category: 'category' },
    getAllExpenseCategories: vi.fn(),
    eq: vi.fn(),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
      { raw: (s: string) => s }
    ),
  };
});

import { db, getAllExpenseCategories } from '@pmg/db';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from 'next/cache';

vi.mock('@/components/expense-categories/category-list', () => ({
  CategoryList: ({ initialCategories }: any) => (
    <div data-testid="category-list">
      {initialCategories.map((c: any) => (
        <div key={c.id}>{c.name}</div>
      ))}
    </div>
  ),
}));

// ─── Import Code Under Test ──────────────────────────────────────────────────
import {
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory
} from '@/app/actions/expense-categories';
import ExpenseCategoriesPage from '@/app/(admin)/finance/categories/page';

describe('Finance Categories Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Standard chainable mocks
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
    } as any);
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(true),
      }),
    } as any);
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(true),
    } as any);
    vi.mocked(db.transaction).mockImplementation(async (cb: any) => cb(db as any));
  });

  describe('Server Actions', () => {
    it('createExpenseCategory - successfully creates a category', async () => {
      const formData = new FormData();
      formData.set('name', 'Office Supplies');

      const res = await createExpenseCategory(formData);
      expect(res).toEqual({});
      expect(db.insert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/finance/categories');
    });

    it('updateExpenseCategory - modifies category and cascades to expenses', async () => {
      const formData = new FormData();
      formData.set('name', 'Office Supplies Pro');

      // Mock category search return
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'cat-1', name: 'Office Supplies' }]),
        }),
      } as any);

      const res = await updateExpenseCategory('cat-1', formData);
      expect(res).toEqual({});
      expect(db.transaction).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/finance/categories');
    });

    it('deleteExpenseCategory - blocks if in use, otherwise deletes', async () => {
      // 1st call to db.select gets the category
      // 2nd call checks usage count in expenses table
      let selectCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++;
        return {
          from: () => ({
            where: () => {
              if (selectCount === 1) {
                return Promise.resolve([{ id: 'cat-1', name: 'Software' }]);
              }
              return Promise.resolve([{ count: 2 }]); // in use
            },
          }),
        } as any;
      });

      const resBlocked = await deleteExpenseCategory('cat-1');
      expect(resBlocked.error).toBe('Category is in use by existing expenses');

      // mock not in use
      selectCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++;
        return {
          from: () => ({
            where: () => {
              if (selectCount === 1) {
                return Promise.resolve([{ id: 'cat-1', name: 'Software' }]);
              }
              return Promise.resolve([{ count: 0 }]); // not in use
            },
          }),
        } as any;
      });

      const resSuccess = await deleteExpenseCategory('cat-1');
      expect(resSuccess).toEqual({});
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('Pages and Layouts', () => {
    it('ExpenseCategoriesPage - renders category list correctly', async () => {
      vi.mocked(getAllExpenseCategories).mockResolvedValue([
        { id: 'cat-1', name: 'Travel' },
        { id: 'cat-2', name: 'Marketing' },
      ] as any);

      const page = await ExpenseCategoriesPage();
      render(page as React.ReactElement);

      expect(screen.getByTestId('category-list')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });
  });
});
