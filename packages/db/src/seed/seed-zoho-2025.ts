/**
 * Idempotent seed script for FY2025/26 Zoho Books historical invoices (May 2025 – Feb 2026).
 *
 * Powers /insights/analysis?year=2025 and /insights/analysis?tab=yoy without distorting
 * the FY2026/27 General Ledger or bank balances:
 * - Inserts 56 historical invoices + billing_line_items + matching income/payment_allocations
 * - James Mtimkulu's 8 carried-over 2025 balances (R8,650) are marked `written_off` (zero AR double-count)
 * - Triple Image's Feb 2026 invoice (R150) is marked `paid` per owner confirmation
 * - Ayanda Chisi's PMG-INV-00191 (R3,000 total, R2,000 paid, R1,000 still owed) is seeded as `partially_paid`
 *   with ONE balanced Opening AR journal entry (Dr 1100 AR / Cr 3020 Retained Earnings = R1,000.00)
 *   so 1100 AR matches /billing/aging and clears cleanly when Ayanda pays.
 *
 * Run from packages/db:
 *   bun run src/seed/seed-zoho-2025.ts
 */

import { randomUUID } from 'crypto';
import {
  getDb,
  clients,
  divisions,
  invoices,
  billingLineItems,
  income,
  paymentAllocations,
  chartAccounts,
  journalEntries,
  journalLines,
  getNextJournalEntryNumber,
  ensureOpenPeriod,
  and,
  eq,
  inArray,
} from '../index';

type ZohoSeedRow = {
  documentNumber: string;
  date: string;
  dueDate: string;
  reference: string;
  customer:
    | 'James Mtimkulu'
    | 'Basadipele'
    | 'Ayanda Chisi'
    | 'OEL Holdings'
    | 'Tatenda Muchenu'
    | 'Triple Image Trading & Construction';
  division: 'PMG' | 'TES' | 'AWS';
  total: number;
  paidAmount: number;
  status: 'paid' | 'partially_paid' | 'written_off';
  writeOffAmount?: number;
  note?: string;
};

const ZOHO_2025_INVOICES: ZohoSeedRow[] = [
  {
    documentNumber: 'PMG-INV-00159',
    date: '2025-05-11',
    dueDate: '2025-05-11',
    reference: 'INF4883 - Quiz 1',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00160',
    date: '2025-05-11',
    dueDate: '2025-05-11',
    reference: 'INF4825 - Quiz 1',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 650,
    paidAmount: 650,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00161',
    date: '2025-05-11',
    dueDate: '2025-05-11',
    reference: 'INF4831 - Quiz 1',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00162',
    date: '2025-05-17',
    dueDate: '2025-05-17',
    reference: 'HPCOS81 - Quiz 1',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00163',
    date: '2025-05-17',
    dueDate: '2025-06-01',
    reference: 'INF4817 - Written Assignment 1',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00164',
    date: '2025-05-17',
    dueDate: '2025-06-01',
    reference: 'INF4820 - Quiz 1',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00165',
    date: '2025-05-17',
    dueDate: '2025-06-01',
    reference: 'INF4860 - Written Assignment 1',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00166',
    date: '2025-05-19',
    dueDate: '2025-06-03',
    reference: 'INF4831 - Quiz 2',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00167',
    date: '2025-06-09',
    dueDate: '2025-06-24',
    reference: 'INF4831 - Quiz 3',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00168',
    date: '2025-06-09',
    dueDate: '2025-06-24',
    reference: 'HPCOS81 - Quiz 2',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00170',
    date: '2025-06-10',
    dueDate: '2025-06-25',
    reference: 'INF4817 Quiz 2',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00171',
    date: '2025-06-17',
    dueDate: '2025-07-17',
    reference: 'INF4883 - Written Assignment 2',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00172',
    date: '2025-06-29',
    dueDate: '2025-07-14',
    reference: 'INF4817 - Written Assignment 2',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00178',
    date: '2025-07-27',
    dueDate: '2025-07-31',
    reference: 'Domain Email Hosting',
    customer: 'Triple Image Trading & Construction',
    division: 'AWS',
    total: 150,
    paidAmount: 150,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00169',
    date: '2025-08-01',
    dueDate: '2025-08-04',
    reference: 'INF4825 - Written Assignment 2',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00173',
    date: '2025-08-01',
    dueDate: '2025-08-01',
    reference: 'INF4860 - Written Assignment 2',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00174',
    date: '2025-08-01',
    dueDate: '2025-09-30',
    reference: 'INF4831 - Quiz 4',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00175',
    date: '2025-08-01',
    dueDate: '2025-08-05',
    reference: 'INF4860 - Written Assignment 2',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00176',
    date: '2025-08-01',
    dueDate: '2025-08-08',
    reference: 'HPCOS81 - Written Assignment 3',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00177',
    date: '2025-08-01',
    dueDate: '2025-08-19',
    reference: 'INF4883 - Written Assignment 3',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00179',
    date: '2025-08-03',
    dueDate: '2025-08-18',
    reference: 'HLA 4/2/4 - 2025/02',
    customer: 'Basadipele',
    division: 'TES',
    total: 2500,
    paidAmount: 2500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00182',
    date: '2025-08-16',
    dueDate: '2025-08-31',
    reference: 'INF4820 - Activity Quiz 2.3, 2.4, 2.5',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 900,
    paidAmount: 900,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00183',
    date: '2025-08-16',
    dueDate: '2025-09-10',
    reference: 'HPCOS81 - Quiz 4',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00184',
    date: '2025-08-21',
    dueDate: '2025-09-05',
    reference: 'A-EWM 05-2025 - CAT A & B',
    customer: 'Ayanda Chisi',
    division: 'TES',
    total: 1200,
    paidAmount: 1200,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00185',
    date: '2025-08-24',
    dueDate: '2025-09-08',
    reference: 'A-EWM 02-2025',
    customer: 'Ayanda Chisi',
    division: 'TES',
    total: 400,
    paidAmount: 400,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00186',
    date: '2025-08-25',
    dueDate: '2025-08-31',
    reference: 'Domain Email Hosting',
    customer: 'Triple Image Trading & Construction',
    division: 'AWS',
    total: 150,
    paidAmount: 150,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00188',
    date: '2025-08-27',
    dueDate: '2025-08-31',
    reference: 'A-EWM 02-2025 Compliance',
    customer: 'Ayanda Chisi',
    division: 'TES',
    total: 1150,
    paidAmount: 1150,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00187',
    date: '2025-08-29',
    dueDate: '2025-09-13',
    reference: 'A-EWM 02-2025',
    customer: 'Basadipele',
    division: 'TES',
    total: 2500,
    paidAmount: 2500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00181',
    date: '2025-08-30',
    dueDate: '2025-09-14',
    reference: 'INF4820 - Quiz 2',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00189',
    date: '2025-09-16',
    dueDate: '2025-10-01',
    reference: 'A-EE 04-2025',
    customer: 'Ayanda Chisi',
    division: 'TES',
    total: 450,
    paidAmount: 450,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00190',
    date: '2025-09-25',
    dueDate: '2025-09-30',
    reference: 'Domain Email Hosting',
    customer: 'Triple Image Trading & Construction',
    division: 'AWS',
    total: 150,
    paidAmount: 150,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00200',
    date: '2025-09-26',
    dueDate: '2025-10-11',
    reference: 'INF4817 - Written Assignment 3',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00180',
    date: '2025-09-30',
    dueDate: '2025-10-15',
    reference: 'INF4820 - Written Assignment 2',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00191',
    date: '2025-10-02',
    dueDate: '2025-10-17',
    reference: 'A-RT-01-2026',
    customer: 'Ayanda Chisi',
    division: 'TES',
    total: 3000,
    paidAmount: 2000,
    status: 'partially_paid',
    note: 'R2,000 paid in FY2025/26 (Zoho); R1,000 carried into Opening AR (Dr 1100 / Cr 3020).',
  },
  {
    documentNumber: 'PMG-INV-00192',
    date: '2025-10-02',
    dueDate: '2025-10-02',
    reference: 'Hosting',
    customer: 'Tatenda Muchenu',
    division: 'AWS',
    total: 1500,
    paidAmount: 1500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00199',
    date: '2025-10-03',
    dueDate: '2025-10-28',
    reference: 'HPCOS81 - Quiz 5',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 500,
    paidAmount: 500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00201',
    date: '2025-10-06',
    dueDate: '2025-10-09',
    reference: 'INF4825 - Written Assignment 3',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 850,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00202',
    date: '2025-10-06',
    dueDate: '2025-10-21',
    reference: 'INF4883 - Written Assignment 4',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 800,
    status: 'written_off',
    writeOffAmount: 50,
    note: 'R800 paid in FY2025/26; remaining R50 carried over to PMG-INV-2026-002.',
  },
  {
    documentNumber: 'PMG-INV-00193',
    date: '2025-10-19',
    dueDate: '2025-10-19',
    reference: 'Google Ad',
    customer: 'Tatenda Muchenu',
    division: 'AWS',
    total: 800,
    paidAmount: 800,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00194',
    date: '2025-10-20',
    dueDate: '2025-11-04',
    reference: 'INF4831 - Written Assignment 5',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 850,
    paidAmount: 0,
    status: 'written_off',
    writeOffAmount: 850,
    note: 'Carried over to PMG-INV-2026-002.',
  },
  {
    documentNumber: 'PMG-INV-00195',
    date: '2025-10-25',
    dueDate: '2025-10-31',
    reference: 'Domain Email Hosting',
    customer: 'Triple Image Trading & Construction',
    division: 'AWS',
    total: 150,
    paidAmount: 150,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00213',
    date: '2025-11-01',
    dueDate: '2025-11-30',
    reference: 'November Tender Preparation',
    customer: 'Basadipele',
    division: 'TES',
    total: 2500,
    paidAmount: 2500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00196',
    date: '2025-11-09',
    dueDate: '2025-11-24',
    reference: 'Certificates',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 1250,
    paidAmount: 0,
    status: 'written_off',
    writeOffAmount: 1250,
    note: 'Carried over to PMG-INV-2026-002.',
  },
  {
    documentNumber: 'PMG-INV-00197',
    date: '2025-11-25',
    dueDate: '2025-11-30',
    reference: 'Domain Email Hosting',
    customer: 'Triple Image Trading & Construction',
    division: 'AWS',
    total: 150,
    paidAmount: 150,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00198',
    date: '2025-12-01',
    dueDate: '2025-12-16',
    reference: 'HPCOS81 Portfolio Assignment 6',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 1300,
    paidAmount: 0,
    status: 'written_off',
    writeOffAmount: 1300,
    note: 'Carried over to PMG-INV-2026-002.',
  },
  {
    documentNumber: 'PMG-INV-00205',
    date: '2025-12-02',
    dueDate: '2026-01-06',
    reference: 'INF4860 Portfolio Assignment 3',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 1300,
    paidAmount: 0,
    status: 'written_off',
    writeOffAmount: 1300,
    note: 'Carried over to PMG-INV-2026-002.',
  },
  {
    documentNumber: 'PMG-INV-00203',
    date: '2025-12-15',
    dueDate: '2026-01-30',
    reference: 'INF4820 Portfolio Assignment 3',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 1300,
    paidAmount: 0,
    status: 'written_off',
    writeOffAmount: 1300,
    note: 'Carried over to PMG-INV-2026-002.',
  },
  {
    documentNumber: 'PMG-INV-00204',
    date: '2025-12-15',
    dueDate: '2026-01-12',
    reference: 'INF4825 Portfolio Assignment 4',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 1300,
    paidAmount: 0,
    status: 'written_off',
    writeOffAmount: 1300,
    note: 'Carried over to PMG-INV-2026-002.',
  },
  {
    documentNumber: 'PMG-INV-00206',
    date: '2025-12-15',
    dueDate: '2026-01-19',
    reference: 'INF4883 Portfolio Assignment 5',
    customer: 'James Mtimkulu',
    division: 'PMG',
    total: 1300,
    paidAmount: 0,
    status: 'written_off',
    writeOffAmount: 1300,
    note: 'Carried over to PMG-INV-2026-002.',
  },
  {
    documentNumber: 'PMG-INV-00207',
    date: '2025-12-25',
    dueDate: '2025-12-31',
    reference: 'Domain Email Hosting',
    customer: 'Triple Image Trading & Construction',
    division: 'AWS',
    total: 150,
    paidAmount: 150,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00209',
    date: '2026-01-25',
    dueDate: '2026-01-31',
    reference: 'Domain Email Hosting',
    customer: 'Triple Image Trading & Construction',
    division: 'AWS',
    total: 150,
    paidAmount: 150,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00210',
    date: '2026-02-09',
    dueDate: '2026-02-28',
    reference: 'SMU/001/2026 - SEFAKO MAKGATHO UNIVERSITY',
    customer: 'Basadipele',
    division: 'TES',
    total: 2500,
    paidAmount: 2500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00211',
    date: '2026-02-09',
    dueDate: '2026-02-28',
    reference: 'NDT0001/26 - DEPARTMENT OF TOURISM',
    customer: 'Basadipele',
    division: 'TES',
    total: 2500,
    paidAmount: 2500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00212',
    date: '2026-02-09',
    dueDate: '2026-02-28',
    reference: '2025/072 - UMNGENI-UTHUKELA WATER',
    customer: 'Basadipele',
    division: 'TES',
    total: 2500,
    paidAmount: 2500,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00215',
    date: '2026-02-22',
    dueDate: '2026-03-09',
    reference: 'Website Development & Hosting',
    customer: 'OEL Holdings',
    division: 'AWS',
    total: 4000,
    paidAmount: 4000,
    status: 'paid',
  },
  {
    documentNumber: 'PMG-INV-00216',
    date: '2026-02-25',
    dueDate: '2026-02-28',
    reference: 'Domain Email Hosting',
    customer: 'Triple Image Trading & Construction',
    division: 'AWS',
    total: 150,
    paidAmount: 150,
    status: 'paid',
  },
];

async function seedZoho2025() {
  const db = getDb();

  // 1. Resolve divisions
  const allDivisions = await db.select().from(divisions);
  const divIdByCode: Record<'PMG' | 'TES' | 'AWS', string> = {
    PMG: allDivisions.find((d) => d.name.toLowerCase().includes('playhouse'))?.id ?? '',
    TES: allDivisions.find((d) => d.name.toLowerCase().includes('tender'))?.id ?? '',
    AWS: allDivisions.find((d) => d.name.toLowerCase().includes('apex'))?.id ?? '',
  };

  if (!divIdByCode.PMG || !divIdByCode.TES || !divIdByCode.AWS) {
    throw new Error(`Missing required divisions: ${JSON.stringify(divIdByCode)}`);
  }

  // 2. Resolve existing clients (and create Tatenda Muchenu if missing)
  const allClients = await db.select().from(clients);
  const findClient = (predicate: (c: (typeof allClients)[number]) => boolean) =>
    allClients.find(predicate)?.id;

  let tatendaId = findClient((c) => c.name.toLowerCase().includes('tatenda'));
  if (!tatendaId) {
    const [created] = await db
      .insert(clients)
      .values({
        name: 'Tatenda Muchenu',
        divisionId: divIdByCode.AWS,
        isActive: true,
      })
      .returning({ id: clients.id });
    tatendaId = created?.id;
    console.log('Created client: Tatenda Muchenu', tatendaId);
  }

  const clientIdByName: Record<ZohoSeedRow['customer'], string | undefined> = {
    'James Mtimkulu': findClient((c) => c.name.toLowerCase().includes('james')),
    Basadipele: findClient((c) => (c.businessName ?? '').toLowerCase().includes('basadipele')),
    'Ayanda Chisi': findClient((c) => c.name.toLowerCase().includes('ayanda')),
    'OEL Holdings': findClient((c) => (c.businessName ?? '').toLowerCase().includes('oel')),
    'Tatenda Muchenu': tatendaId,
    'Triple Image Trading & Construction': findClient((c) =>
      (c.businessName ?? '').toLowerCase().includes('triple image'),
    ),
  };

  for (const [name, id] of Object.entries(clientIdByName)) {
    if (!id) throw new Error(`Could not resolve client ID for "${name}"`);
  }

  // 3. Idempotently insert all 56 historical invoices + line items + collected income
  const existingDocs = new Set(
    (
      await db
        .select({ documentNumber: invoices.documentNumber })
        .from(invoices)
        .where(
          inArray(
            invoices.documentNumber,
            ZOHO_2025_INVOICES.map((r) => r.documentNumber),
          ),
        )
    ).map((r) => r.documentNumber),
  );

  let insertedInvoices = 0;
  let insertedIncome = 0;
  let ayandaInvoiceId: string | null = null;

  for (const row of ZOHO_2025_INVOICES) {
    if (existingDocs.has(row.documentNumber)) {
      if (row.documentNumber === 'PMG-INV-00191') {
        const [existing] = await db
          .select({ id: invoices.id })
          .from(invoices)
          .where(eq(invoices.documentNumber, 'PMG-INV-00191'))
          .limit(1);
        ayandaInvoiceId = existing?.id ?? null;
      }
      continue;
    }

    const clientId = clientIdByName[row.customer]!;
    const divisionId = divIdByCode[row.division];
    const invoiceId = randomUUID();
    const incomeId = row.paidAmount > 0 ? randomUUID() : null;

    await db.transaction(async (tx) => {
      if (incomeId && row.paidAmount > 0) {
        await tx.insert(income).values({
          id: incomeId,
          date: row.date,
          divisionId,
          clientId,
          description: `Payment for ${row.documentNumber} — ${row.reference} (Zoho FY2025/26 archive)`,
          amount: row.paidAmount.toFixed(2),
        });
        insertedIncome++;
      }

      await tx.insert(invoices).values({
        id: invoiceId,
        divisionId,
        clientId,
        documentNumber: row.documentNumber,
        status: row.status,
        invoiceDate: row.date,
        dueDate: row.dueDate,
        reference: row.reference,
        incomeId: row.status === 'paid' ? incomeId : null,
        subtotal: row.total.toFixed(2),
        discountAmount: '0.00',
        vatEnabled: false,
        vatAmount: '0.00',
        total: row.total.toFixed(2),
        writeOffAmount: (row.writeOffAmount ?? 0).toFixed(2),
        notes: row.note ?? 'Imported from Zoho Books (FY2025/26 historical archive).',
        paidAt: row.status === 'paid' ? new Date(`${row.date}T12:00:00Z`) : null,
        createdBy: 'zoho-2025-import',
      });

      await tx.insert(billingLineItems).values({
        id: randomUUID(),
        documentType: 'invoice',
        documentId: invoiceId,
        sortOrder: 0,
        description: row.reference,
        quantity: '1.00',
        unitPrice: row.total.toFixed(2),
        discountAmount: '0.00',
        vatRate: '0.00',
        lineTotal: row.total.toFixed(2),
      });

      if (incomeId && row.paidAmount > 0) {
        await tx.insert(paymentAllocations).values({
          id: randomUUID(),
          incomeId,
          invoiceId,
          amount: row.paidAmount.toFixed(2),
        });
      }
    });

    insertedInvoices++;
    if (row.documentNumber === 'PMG-INV-00191') {
      ayandaInvoiceId = invoiceId;
    }
  }

  // 4. Idempotently post ONE balanced Opening AR JE for Ayanda's R1,000 remaining balance:
  //    Dr 1100 Accounts Receivable R1,000.00 / Cr 3020 Retained Earnings R1,000.00
  let openingArPosted = false;
  if (ayandaInvoiceId) {
    const [existingJe] = await db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceTable, 'invoices'),
          eq(journalEntries.sourceId, ayandaInvoiceId),
          eq(journalEntries.status, 'posted'),
        ),
      )
      .limit(1);

    if (!existingJe) {
      const accts = await db
        .select()
        .from(chartAccounts)
        .where(inArray(chartAccounts.code, ['1100', '3020']));
      const arAcct = accts.find((a) => a.code === '1100');
      const reAcct = accts.find((a) => a.code === '3020');

      if (!arAcct || !reAcct) {
        throw new Error('Required chart accounts 1100 (AR) or 3020 (Retained Earnings) not found.');
      }

      const openingDate = new Date().toISOString().slice(0, 10);
      const period = openingDate.slice(0, 7);
      const p = await ensureOpenPeriod(period);
      if (p.status !== 'open') {
        throw new Error(`Accounting period ${period} is ${p.status} — cannot post Opening AR JE.`);
      }

      const now = new Date();
      await db.transaction(async (tx) => {
        const entryId = randomUUID();
        const entryNumber = await getNextJournalEntryNumber(tx, openingDate);

        await tx.insert(journalEntries).values({
          id: entryId,
          entryNumber,
          entryDate: openingDate,
          period,
          divisionId: divIdByCode.TES,
          description:
            'Prior-Year Opening AR (FY2025/26 Zoho) — Ayanda Chisi PMG-INV-00191 (R1,000 balance)',
          status: 'posted',
          sourceModule: 'accounting',
          sourceTable: 'invoices',
          sourceId: ayandaInvoiceId,
          sourceDocumentNumber: 'PMG-INV-00191',
          postedAt: now,
          postedBy: 'zoho-2025-import',
          createdBy: 'zoho-2025-import',
        });

        await tx.insert(journalLines).values([
          {
            id: randomUUID(),
            journalEntryId: entryId,
            accountId: arAcct.id,
            debit: '1000.00',
            credit: null,
            description: 'Opening AR carried forward — Ayanda Chisi PMG-INV-00191',
          },
          {
            id: randomUUID(),
            journalEntryId: entryId,
            accountId: reAcct.id,
            debit: null,
            credit: '1000.00',
            description: 'Prior-year retained earnings (FY2025/26) — PMG-INV-00191',
          },
        ]);
      });
      openingArPosted = true;
    }
  }

  console.log('Zoho FY2025/26 seed complete:', {
    insertedInvoices,
    insertedIncome,
    skippedExisting: ZOHO_2025_INVOICES.length - insertedInvoices,
    openingArPosted,
  });
}

seedZoho2025()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to seed Zoho 2025 archive:', err);
    process.exit(1);
  });
