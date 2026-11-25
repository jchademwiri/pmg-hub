import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetSessionOrRedirect,
  mockRevalidatePath,
  mockAddComplianceRecord,
  mockUpdateComplianceRecord,
  mockDeleteComplianceRecord,
  mockEnsureComplianceDocumentType,
  mockSelectQueue,
  mockInsertValues,
  mockDeleteWhere,
  mockTxUpdateCalls,
  mockDb,
  mockComplianceDocumentsTable,
  mockComplianceDocumentTypesTable,
} = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const txUpdateCalls: Array<{ table: unknown; set: unknown }> = [];

  function makeSelectChain() {
    const result = selectQueue.shift() ?? [];
    const chain: Record<string, unknown> = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => Promise.resolve(result)),
      then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) =>
        Promise.resolve(result).then(resolve, reject),
    };
    return chain;
  }

  return {
    mockGetSessionOrRedirect: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockAddComplianceRecord: vi.fn(),
    mockUpdateComplianceRecord: vi.fn(),
    mockDeleteComplianceRecord: vi.fn(),
    mockEnsureComplianceDocumentType: vi.fn(),
    mockSelectQueue: selectQueue,
    mockInsertValues: insertValues,
    mockDeleteWhere: deleteWhere,
    mockTxUpdateCalls: txUpdateCalls,
    mockDb: {
      select: vi.fn(() => makeSelectChain()),
      insert: vi.fn(() => ({ values: insertValues })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(undefined),
        })),
      })),
      delete: vi.fn(() => ({ where: deleteWhere })),
      transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn((table: unknown) => ({
            set: vi.fn((setVal: unknown) => {
              txUpdateCalls.push({ table, set: setVal });
              return {
                where: vi.fn().mockResolvedValue(undefined),
              };
            }),
          })),
        };
        return cb(tx);
      }),
    },
    mockComplianceDocumentsTable: {
      id: 'compliance_documents.id',
      documentType: 'compliance_documents.documentType',
    },
    mockComplianceDocumentTypesTable: {
      id: 'compliance_document_types.id',
      name: 'compliance_document_types.name',
      sortOrder: 'compliance_document_types.sortOrder',
    },
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('@/lib/auth', () => ({
  getSessionOrRedirect: () => mockGetSessionOrRedirect(),
}));

vi.mock('@pmg/db', () => ({
  db: mockDb,
  complianceDocuments: mockComplianceDocumentsTable,
  complianceDocumentTypes: mockComplianceDocumentTypesTable,
  eq: vi.fn((a, b) => ({ op: 'eq', a, b })),
  sql: vi.fn(() => 'sql'),
  addComplianceRecord: (...args: unknown[]) => mockAddComplianceRecord(...args),
  updateComplianceRecord: (...args: unknown[]) => mockUpdateComplianceRecord(...args),
  deleteComplianceRecord: (...args: unknown[]) => mockDeleteComplianceRecord(...args),
  ensureComplianceDocumentType: (...args: unknown[]) => mockEnsureComplianceDocumentType(...args),
}));

import {
  addComplianceRecord,
  createComplianceDocumentType,
  updateComplianceDocumentType,
  deleteComplianceDocumentType,
} from '@/actions/operations/compliance';

describe('Compliance Document Types & Auto-Save CUSTOM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectQueue.length = 0;
    mockTxUpdateCalls.length = 0;
    mockGetSessionOrRedirect.mockResolvedValue({ user: { id: 'admin-1' } });
  });

  describe('createComplianceDocumentType', () => {
    it('inserts a new valid compliance document type', async () => {
      mockSelectQueue.push([], [{ maxSort: 11 }]);

      const fd = new FormData();
      fd.set('name', '  CSD Registration Report  ');

      const res = await createComplianceDocumentType(fd);

      expect(res).toEqual({});
      expect(mockInsertValues).toHaveBeenCalledWith({
        name: 'CSD Registration Report',
        sortOrder: 12,
        isActive: true,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/settings/compliance');
    });

    it('rejects duplicate names', async () => {
      mockSelectQueue.push([{ id: 'existing-id' }]);

      const fd = new FormData();
      fd.set('name', 'NHBRC Certificate');

      const res = await createComplianceDocumentType(fd);

      expect(res.error).toContain('already exists');
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('rejects the reserved CUSTOM name', async () => {
      const fd = new FormData();
      fd.set('name', 'custom');

      const res = await createComplianceDocumentType(fd);

      expect(res.error).toContain('reserved');
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('updateComplianceDocumentType', () => {
    it('renames the type and cascades to compliance_documents inside a transaction', async () => {
      mockSelectQueue.push([{ id: 'type-1', name: 'Old Cert', isActive: true }], []);

      const fd = new FormData();
      fd.set('name', 'New Cert');

      const res = await updateComplianceDocumentType('type-1', fd);

      expect(res).toEqual({});
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(mockTxUpdateCalls).toHaveLength(2);
      expect(mockTxUpdateCalls[0]?.table).toBe(mockComplianceDocumentTypesTable);
      expect(mockTxUpdateCalls[0]?.set).toMatchObject({ name: 'New Cert', isActive: true });
      expect(mockTxUpdateCalls[1]?.table).toBe(mockComplianceDocumentsTable);
      expect(mockTxUpdateCalls[1]?.set).toMatchObject({ documentType: 'New Cert' });
    });

    it('returns an error when renaming to an already-existing name', async () => {
      mockSelectQueue.push(
        [{ id: 'type-1', name: 'Old Cert', isActive: true }],
        [{ id: 'type-2' }],
      );

      const fd = new FormData();
      fd.set('name', 'PSIRA Certificate');

      const res = await updateComplianceDocumentType('type-1', fd);

      expect(res.error).toContain('already exists');
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });
  });

  describe('deleteComplianceDocumentType', () => {
    it('blocks deletion when usageCount > 0', async () => {
      mockSelectQueue.push([{ id: 'type-1', name: 'NHBRC Certificate' }], [{ count: 3 }]);

      const res = await deleteComplianceDocumentType('type-1');

      expect(res.error).toContain('Cannot delete "NHBRC Certificate"');
      expect(res.error).toContain('3 client compliance records');
      expect(mockDeleteWhere).not.toHaveBeenCalled();
    });

    it('deletes the type when usageCount === 0', async () => {
      mockSelectQueue.push([{ id: 'type-1', name: 'Unused Cert' }], [{ count: 0 }]);

      const res = await deleteComplianceDocumentType('type-1');

      expect(res).toEqual({});
      expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/settings/compliance');
    });
  });

  describe('addComplianceRecord with CUSTOM auto-save', () => {
    it('auto-saves customName into compliance_document_types and stores it as documentType', async () => {
      const fd = new FormData();
      fd.set('clientId', '11111111-1111-4111-8111-111111111111');
      fd.set('documentType', 'CUSTOM');
      fd.set('customName', '  PSIRA Guarding  ');
      fd.set('expiryDate', '2027-06-30');

      const res = await addComplianceRecord(fd);

      expect(res).toEqual({});
      expect(mockEnsureComplianceDocumentType).toHaveBeenCalledWith('PSIRA Guarding');
      expect(mockAddComplianceRecord).toHaveBeenCalledWith({
        clientId: '11111111-1111-4111-8111-111111111111',
        documentType: 'PSIRA Guarding',
        customName: null,
        expiryDate: '2027-06-30',
        uploadedBy: 'ADMIN',
        uploadedById: 'admin-1',
      });
    });

    it('returns an error when CUSTOM is submitted without customName', async () => {
      const fd = new FormData();
      fd.set('clientId', '11111111-1111-4111-8111-111111111111');
      fd.set('documentType', 'CUSTOM');
      fd.set('expiryDate', '2027-06-30');

      const res = await addComplianceRecord(fd);

      expect(res.error).toContain('custom document name');
      expect(mockEnsureComplianceDocumentType).not.toHaveBeenCalled();
      expect(mockAddComplianceRecord).not.toHaveBeenCalled();
    });
  });
});
