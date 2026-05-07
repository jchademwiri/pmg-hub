/**
 * Mock billing data — used for UI preview while real data is not yet wired up.
 * TODO: remove this file once all billing pages are connected to the database.
 */

import type { DocumentPreviewProps } from '@/components/billing/document-preview'

// ── Shared fixtures ───────────────────────────────────────────────────────────

const MOCK_ORG: DocumentPreviewProps['org'] = {
  name: 'PMG',
  registrationNumber: '2018/123456/07',
  vatNumber: '4560123456',
  email: 'billing@playhousemedia.co.za',
  phone: '+27 21 000 0000',
  website: 'www.playhousemedia.co.za',
  address: '12 Media Park, Century City\nCape Town, 7441',
}

const MOCK_BANKING: DocumentPreviewProps['banking'] = {
  bankName: 'First National Bank',
  accountName: 'PMG Media (Pty) Ltd',
  accountNumber: '62012345678',
  branchCode: '250655',
}

const MOCK_CLIENT_ACME: DocumentPreviewProps['client'] = {
  name: 'Acme Corp (Pty) Ltd',
  email: 'accounts@acmecorp.co.za',
  phone: '+27 11 555 0100',
  address: '45 Business Ave, Sandton\nJohannesburg, 2196',
}

// ── Invoice ───────────────────────────────────────────────────────────────────

export const MOCK_INVOICE: Omit<DocumentPreviewProps, 'type'> = {
  number: 'AWS-INV-0042',
  status: 'Sent',
  issueDate: '01 May 2026',
  dueDate: '31 May 2026',
  reference: 'Project: Website Redesign Phase 2',
  org: MOCK_ORG,
  client: MOCK_CLIENT_ACME,
  lineItems: [
    { description: 'Website Maintenance — Monthly Retainer', qty: 1, unitPrice: 4500, vatApplicable: true  },
    { description: 'SEO Audit & Recommendations Report',     qty: 1, unitPrice: 8500, vatApplicable: true  },
    { description: 'Content Updates (5 pages)',              qty: 5, unitPrice: 650,  vatApplicable: true  },
    { description: 'Domain Renewal — acmecorp.co.za',       qty: 1, unitPrice: 299,  vatApplicable: false },
  ],
  notes: 'Payment due within 30 days of invoice date.\nPlease use the invoice number as your payment reference.',
  banking: MOCK_BANKING,
  vatRate: 15,
}

export const MOCK_INVOICE_ACTIVITY = [
  { label: 'Invoice sent to client', date: '01 May 2026, 09:14' },
  { label: 'Invoice created',        date: '01 May 2026, 09:00' },
]

// ── Quote ─────────────────────────────────────────────────────────────────────

export const MOCK_QUOTE: Omit<DocumentPreviewProps, 'type'> = {
  number: 'AWS-QTE-0018',
  status: 'Sent',
  issueDate: '01 May 2026',
  dueDate: '31 May 2026',
  reference: 'New Client Onboarding — Digital Package',
  org: MOCK_ORG,
  client: {
    name: 'Bright Future Logistics',
    email: 'info@brightfuture.co.za',
    phone: '+27 31 444 0200',
    address: '8 Harbour Road, Durban\nKwaZulu-Natal, 4001',
  },
  lineItems: [
    { description: 'Brand Identity Package (logo, colours, typography)', qty: 1, unitPrice: 18000, vatApplicable: true },
    { description: 'Website Design & Development (5-page)',               qty: 1, unitPrice: 35000, vatApplicable: true },
    { description: 'Social Media Setup & Profile Optimisation',           qty: 3, unitPrice: 1200,  vatApplicable: true },
    { description: 'Copywriting — Website Pages',                         qty: 5, unitPrice: 950,   vatApplicable: true },
    { description: 'Photography Session (half day)',                      qty: 1, unitPrice: 4500,  vatApplicable: true },
  ],
  terms:
    '50% deposit required to commence work.\nBalance due on project completion.\nQuotation valid for 30 days from issue date.\nAll prices exclude VAT unless otherwise stated.',
  banking: MOCK_BANKING,
  vatRate: 15,
}

export const MOCK_QUOTE_ACTIVITY = [
  { label: 'Quote sent to client', date: '01 May 2026, 10:30' },
  { label: 'Quote created',        date: '01 May 2026, 10:15' },
]

// ── Statement ─────────────────────────────────────────────────────────────────

export const MOCK_STATEMENT: Omit<DocumentPreviewProps, 'type'> = {
  number: 'STMT-2026-05',
  status: 'Sent',
  issueDate: '01 May 2026',
  periodFrom: '01 Feb 2026',
  periodTo: '30 Apr 2026',
  org: MOCK_ORG,
  client: MOCK_CLIENT_ACME,
  transactions: [
    { date: '01 Feb 2026', reference: 'AWS-INV-0038', description: 'Monthly Retainer — February',  debit: 5175.00,   credit: undefined, balance: 5175.00  },
    { date: '14 Feb 2026', reference: 'PMT-0038',     description: 'Payment received — EFT',       debit: undefined, credit: 5175.00,   balance: 0        },
    { date: '01 Mar 2026', reference: 'AWS-INV-0039', description: 'Monthly Retainer — March',     debit: 5175.00,   credit: undefined, balance: 5175.00  },
    { date: '05 Mar 2026', reference: 'AWS-INV-0040', description: 'SEO Audit & Report',           debit: 9775.00,   credit: undefined, balance: 14950.00 },
    { date: '28 Mar 2026', reference: 'PMT-0039',     description: 'Payment received — EFT',       debit: undefined, credit: 5175.00,   balance: 9775.00  },
    { date: '01 Apr 2026', reference: 'AWS-INV-0041', description: 'Monthly Retainer — April',     debit: 5175.00,   credit: undefined, balance: 14950.00 },
    { date: '15 Apr 2026', reference: 'PMT-0040',     description: 'Payment received — EFT',       debit: undefined, credit: 9775.00,   balance: 5175.00  },
    { date: '22 Apr 2026', reference: 'AWS-INV-0042', description: 'Content Updates (5 pages)',    debit: 3737.50,   credit: undefined, balance: 8912.50  },
  ],
  notes: 'Please contact us if you have any queries regarding this statement.\nPayment can be made via EFT using your account number as reference.',
  banking: MOCK_BANKING,
}

export const MOCK_STATEMENT_SUMMARY = [
  { label: 'Total Invoiced', value: 'R 28 037.50' },
  { label: 'Total Paid',     value: 'R 20 125.00' },
  { label: 'Balance Due',    value: 'R 8 912.50'  },
]

// ── Item ──────────────────────────────────────────────────────────────────────

export const MOCK_ITEM = {
  name: 'Website Maintenance',
  description:
    'Monthly website maintenance including security updates, plugin updates, uptime monitoring, and up to 2 hours of content changes.',
  unitPrice: 'R 4 500.00',
  unitLabel: 'month',
  vatApplicable: true,
  status: 'Active',
  createdAt: '12 Jan 2026',
  usageInvoices: 8,
  usageQuotes: 3,
}
