import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Printer, Send, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DocumentPreview } from '@/components/billing/document-preview'
import type { DocumentPreviewProps } from '@/components/billing/document-preview'

export const metadata: Metadata = { title: 'Invoice' }

interface Props {
  params: Promise<{ id: string }>
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK: Omit<DocumentPreviewProps, 'type'> = {
  number: 'AWS-INV-0042',
  status: 'Sent',
  issueDate: '01 May 2026',
  dueDate: '31 May 2026',
  reference: 'Project: Website Redesign Phase 2',
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
  lineItems: [
    { description: 'Website Maintenance — Monthly Retainer', qty: 1, unitPrice: 4500, vatApplicable: true },
    { description: 'SEO Audit & Recommendations Report',     qty: 1, unitPrice: 8500, vatApplicable: true },
    { description: 'Content Updates (5 pages)',              qty: 5, unitPrice: 650,  vatApplicable: true },
    { description: 'Domain Renewal — acmecorp.co.za',       qty: 1, unitPrice: 299,  vatApplicable: false },
  ],
  notes: 'Payment due within 30 days of invoice date.\nPlease use the invoice number as your payment reference.',
  banking: {
    bankName: 'First National Bank',
    accountName: 'PMG Media (Pty) Ltd',
    accountNumber: '62012345678',
    branchCode: '250655',
  },
  vatRate: 15,
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing/invoices">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Invoice #{id}</h2>
              <Badge variant="secondary">{MOCK.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Issued {MOCK.issueDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Send className="size-4" />
            Send
          </Button>
          <Button variant="ghost" size="sm" disabled>
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Document preview */}
        <div className="lg:col-span-2">
          <DocumentPreview type="invoice" {...MOCK} href={`/billing/invoices/${id}`} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">R 16 549.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (15%)</span>
                <span className="tabular-nums">R 2 432.25</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">R 18 981.25</span>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Invoice sent to client', date: '01 May 2026, 09:14' },
                  { label: 'Invoice created',        date: '01 May 2026, 09:00' },
                ].map((entry) => (
                  <div key={entry.date} className="flex flex-col gap-0.5">
                    <span className="text-sm">{entry.label}</span>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
