import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockTransaction = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockRevalidatePath = vi.fn();
  const mockSendPortalInvitation = vi.fn().mockResolvedValue({ success: true });

  const mockDb = {
    transaction: mockTransaction,
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: mockUpdate,
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: mockDelete,
    }),
  };

  return {
    mockTransaction,
    mockUpdate,
    mockDelete,
    mockRevalidatePath,
    mockSendPortalInvitation,
    mockDb,
  };
});

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getSessionOrRedirect: vi.fn().mockResolvedValue({ user: { id: 'admin-123' } }),
}));

vi.mock('@/actions/crm/clients', () => ({
  sendPortalInvitation: mocks.mockSendPortalInvitation,
}));

vi.mock('@pmg/db', () => ({
  db: mocks.mockDb,
  clients: { id: 'clients_id', email: 'clients_email' },
  clientOnboardings: { id: 'onboardings_id' },
  leads: { id: 'leads_id' },
  eq: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.mockRevalidatePath }));

import {
  convertOnboardingToClient,
  updateOnboardingStatus,
  deleteOnboarding,
} from '@/actions/crm/onboarding';

describe('onboarding server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertOnboardingToClient', () => {
    it('successfully converts onboarding to client in transaction', async () => {
      const mockOnboarding = {
        id: 'onboard-1',
        contactName: 'Thabo Mokoena',
        companyName: 'Apex Dynamics',
        email: 'thabo@apexdynamics.co.za',
        phone: '+27825551234',
        divisionId: 'div-1',
        registrationNumber: '2024/123/07',
        status: 'pending',
        leadId: 'lead-1',
      };

      mocks.mockTransaction.mockImplementation(async (cb) => {
        const tx = {
          select: vi.fn().mockImplementation(() => ({
            from: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockImplementation(() => ({
                for: vi.fn().mockResolvedValue([mockOnboarding]),
                length: 0,
                [Symbol.iterator]: function* () {},
              })),
            })),
          })),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'new-client-id' }]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };

        return cb(tx);
      });

      const res = await convertOnboardingToClient('onboard-1', { sendPortalInvite: true });
      expect(res.clientId).toBe('new-client-id');
      expect(mocks.mockRevalidatePath).toHaveBeenCalledWith('/relationships/onboarding');
      expect(mocks.mockRevalidatePath).toHaveBeenCalledWith('/relationships/clients');
    });

    it('returns error when submission is not found', async () => {
      mocks.mockTransaction.mockImplementation(async (cb) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                for: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        };
        return cb(tx);
      });

      const res = await convertOnboardingToClient('missing-id');
      expect(res.error).toContain('not found');
    });
  });

  describe('updateOnboardingStatus', () => {
    it('updates status and revalidates cache', async () => {
      mocks.mockUpdate.mockResolvedValue([]);
      const res = await updateOnboardingStatus('onboard-1', 'archived');
      expect(res.error).toBeUndefined();
      expect(mocks.mockRevalidatePath).toHaveBeenCalledWith('/relationships/onboarding');
    });
  });

  describe('deleteOnboarding', () => {
    it('deletes submission and revalidates cache', async () => {
      mocks.mockDelete.mockResolvedValue([]);
      const res = await deleteOnboarding('onboard-1');
      expect(res.error).toBeUndefined();
      expect(mocks.mockRevalidatePath).toHaveBeenCalledWith('/relationships/onboarding');
    });
  });
});
