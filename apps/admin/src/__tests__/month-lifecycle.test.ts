import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockSession = {
  user: { id: 'admin-user-1', name: 'Admin', role: 'admin' },
};

vi.mock('@/lib/auth', () => ({
  getSessionOrRedirect: vi.fn(async () => mockSession),
  requireRole: vi.fn((session, role) => role === 'admin' || role === 'superadmin'),
}));

vi.mock('@pmg/db', () => ({
  getSnapshotByPeriod: vi.fn(),
  getFinancialSummaryForPeriod: vi.fn(),
  insertSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
  closePeriod: vi.fn(),
  reopenPeriod: vi.fn(),
}));

import { closeMonth, reopenMonth } from '@/actions/accounting/snapshots';
import {
  getSnapshotByPeriod,
  getFinancialSummaryForPeriod,
  insertSnapshot,
  deleteSnapshot,
  closePeriod,
  reopenPeriod,
} from '@pmg/db';

describe('Accounting Month Lifecycle Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_ACTION_PASSWORD = 'test-admin-password';
  });

  describe('closeMonth', () => {
    it('disallows closing the current month or future months', async () => {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const futurePeriod = `${now.getFullYear() + 1}-01`;

      const currentRes = await closeMonth(currentPeriod);
      expect(currentRes).toHaveProperty('error');
      expect((currentRes as { error: string }).error).toContain(
        'cannot be closed until it has concluded',
      );

      const futureRes = await closeMonth(futurePeriod);
      expect(futureRes).toHaveProperty('error');
      expect((futureRes as { error: string }).error).toContain(
        'cannot be closed until it has concluded',
      );
    });

    it('allows closing a valid unclosed past month', async () => {
      vi.mocked(getSnapshotByPeriod).mockResolvedValue(null);
      vi.mocked(getFinancialSummaryForPeriod).mockResolvedValue({
        revenue: 0,
        expenses: 0,
        pmgShare: 0,
        profitPool: 0,
      });

      const res = await closeMonth('2026-03');
      expect(res).toEqual({});
      expect(insertSnapshot).toHaveBeenCalledWith(
        '2026-03',
        expect.objectContaining({ revenue: 0, expenses: 0 }),
        expect.objectContaining({ createdBy: 'admin-user-1' }),
      );
      expect(closePeriod).toHaveBeenCalledWith('2026-03', 'admin-user-1');
    });

    it('returns error if past month is already closed', async () => {
      vi.mocked(getSnapshotByPeriod).mockResolvedValue({
        id: 'snap-1',
        period: '2026-03',
        revenue: '0',
        expenses: '0',
        pmgShare: '0',
        profitPool: '0',
        createdBy: 'admin-user-1',
        status: 'locked',
        notes: null,
        closedAt: new Date(),
        createdAt: new Date(),
      });

      const res = await closeMonth('2026-03');
      expect(res).toEqual({ error: 'Month already closed' });
      expect(insertSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('reopenMonth', () => {
    it('rejects with error if admin password is missing or invalid', async () => {
      const emptyRes = await reopenMonth('2026-03', '');
      expect(emptyRes).toEqual({ error: 'Admin password is required.' });

      const wrongRes = await reopenMonth('2026-03', 'incorrect-password');
      expect(wrongRes).toEqual({ error: 'Invalid admin password.' });
      expect(deleteSnapshot).not.toHaveBeenCalled();
      expect(reopenPeriod).not.toHaveBeenCalled();
    });

    it('reopens month successfully when correct admin password is provided', async () => {
      vi.mocked(getSnapshotByPeriod).mockResolvedValue({
        id: 'snap-1',
        period: '2026-03',
        revenue: '0',
        expenses: '0',
        pmgShare: '0',
        profitPool: '0',
        createdBy: 'admin-user-1',
        status: 'locked',
        notes: null,
        closedAt: new Date(),
        createdAt: new Date(),
      });

      const res = await reopenMonth('2026-03', 'test-admin-password');
      expect(res).toEqual({ success: true });
      expect(deleteSnapshot).toHaveBeenCalledWith('2026-03');
      expect(reopenPeriod).toHaveBeenCalledWith('2026-03');
    });

    it('returns error when trying to reopen a month that is not closed', async () => {
      vi.mocked(getSnapshotByPeriod).mockResolvedValue(null);

      const res = await reopenMonth('2026-03', 'test-admin-password');
      expect(res).toEqual({ error: 'This month is not currently closed.' });
      expect(deleteSnapshot).not.toHaveBeenCalled();
    });
  });
});
