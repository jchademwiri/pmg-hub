import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Printer, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DocumentPreview } from '@/components/billing/document-preview'
import type { DocumentPreviewProps } from '@/components/billing/document-preview'

export const metadata: Metadata = { title: 'Statement' }

interface Props {
  params: Promise<{ clientId: string }>
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK: Omit<DocumentPreviewProps, 'type'> = {
  number: 'STMT-2026-05',
  status: 'Sent',
  issueDate: '01 May 2026',
  periodFrom: '01 Feb 2026',
  periodTo: '30 Apr 2026',
  org: {
    name: 'PMG',
    registrationNumber: '2018/123456/07',
    vatNumber: '4560123456',
    email: 'billing@playhousemedia.co.za',
    phone: '+27 21 000 0000',
    website: 'www.playhousemedia.co.za',
    address: '12 Media Park, Century City\nCape Town, 7441',
  },
  client: {
    name: 'Acme Corp (Pty) Ltd',
    email: 'accounts@acmecorp.co.za',
    phone: '+27 11 555 0100',
    address: '45 Business Ave, Sandton\nJohannesburg, 2196',
  },
  transactions: [
    { date: '01 Feb 2026', reference: 'AWS-INV-0038', description: 'Monthly Retainer — February',    debit: 5175.00,  credit: undefined, balance: 5175.00  },
    { date: '14 Feb 2026', reference: 'PMT-0038',     description: 'Payment received — EFT',         debit: undefined, credit: 5175.00,  balance: 0       },
    { date: '01 Mar 2026', reference: 'AWS-INV-0039', description: 'Monthly Retainer — March',       debit: 5175.00,  credit: undefined, balance: 5175.00  },
    { date: '05 Mar 2026', reference: 'AWS-INV-0040', description: 'SEO Audit & Report',             debit: 9775.00,  credit: undefined, balance: 14950.00 },
    { date: '28 Mar 2026', reference: 'PMT-0039',     description: 'Payment received — EFT',         debit: undefined, credit: 5175.00,  balance: 9775.00  },
    { date: '01 Apr 2026', reference: 'AWS-INV-0041', description: 'Monthly Retainer — April',       debit: 5175.00,  credit: undefined, balance: 14950.00 },
    { date: '15 Apr 2026', reference: 'PMT-0040',     description: 'Payment received — EFT',         debit: undefined, credit: 9775.00,  balance: 5175.00  },
    { date: '22 Apr 2026', reference: 'AWS-INV-0042', description: 'Content Updates (5 pages)',      debit: 3737.50,  credit: undefined, balance: 8912.50  },
  ],
  notes: 'Please contact us if you have any queries regarding this statement.\nPayment can be made via EFT using your account number as reference.',
  banking: {
    bankName: 'First National Bank',
    accountName: 'PMG Media (Pty) Ltd',
    accountNumber: '62012345678',
    branchCode: '250655',
  },
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function StatementDetailPage({ params }: Props) {
  const { clientId } = await params

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing/statements">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h2 className="text-lg font-semibold">Statement — {clientId}</h2>
            <p className="text-sm text-muted-foreground">
              {MOCK.periodFrom} – {MOCK.periodTo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" disabled>
            <FileDown className="size-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Invoiced', value: 'R 28 037.50' },
          { label: 'Total Paid',     value: 'R 20 125.00' },
          { label: 'Balance Due',    value: 'R 8 912.50'  },
        ].map((s) => (
          <Card key={s.label} size="sm">
            <CardHeader>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-semibold tabular-nums">{s.value}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Document preview */}
        <div className="lg:col-span-2">
          <DocumentPreview type="statement" {...MOCK} href={`/billing/statements/${clientId}`} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Client Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: 'Name',    value: MOCK.client.name },
                  { label: 'Email',   value: MOCK.client.email ?? '—' },
                  { label: 'Phone',   value: MOCK.client.phone ?? '—' },
                  { label: 'Address', value: MOCK.client.address ?? '—' },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                    <span className="text-sm whitespace-pre-line">{f.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Statement Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">From</span>
                  <span>{MOCK.periodFrom}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To</span>
                  <span>{MOCK.periodTo}</span>
                </div>
                <Separator className="my-1" />
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Change Period
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
