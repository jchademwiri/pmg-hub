import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Printer, Send, CheckCircle, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DocumentPreview } from '@/components/billing/document-preview'
import type { DocumentPreviewProps } from '@/components/billing/document-preview'

export const metadata: Metadata = { title: 'Quotation' }

interface Props {
  params: Promise<{ id: string }>
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK: Omit<DocumentPreviewProps, 'type'> = {
  number: 'AWS-QTE-0018',
  status: 'Sent',
  issueDate: '01 May 2026',
  dueDate: '31 May 2026',
  reference: 'New Client Onboarding — Digital Package',
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
    name: 'Bright Future Logistics',
    email: 'info@brightfuture.co.za',
    phone: '+27 31 444 0200',
    address: '8 Harbour Road, Durban\nKwaZulu-Natal, 4001',
  },
  lineItems: [
    { description: 'Brand Identity Package (logo, colours, typography)', qty: 1,  unitPrice: 18000, vatApplicable: true },
    { description: 'Website Design & Development (5-page)',               qty: 1,  unitPrice: 35000, vatApplicable: true },
    { description: 'Social Media Setup & Profile Optimisation',           qty: 3,  unitPrice: 1200,  vatApplicable: true },
    { description: 'Copywriting — Website Pages',                         qty: 5,  unitPrice: 950,   vatApplicable: true },
    { description: 'Photography Session (half day)',                      qty: 1,  unitPrice: 4500,  vatApplicable: true },
  ],
  terms:
    '50% deposit required to commence work.\nBalance due on project completion.\nQuotation valid for 30 days from issue date.\nAll prices exclude VAT unless otherwise stated.',
  banking: {
    bankName: 'First National Bank',
    accountName: 'PMG Media (Pty) Ltd',
    accountNumber: '62012345678',
    branchCode: '250655',
  },
  vatRate: 15,
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing/quotes">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Quote #{id}</h2>
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
          <Button size="sm" disabled>
            <CheckCircle className="size-4" />
            Convert to Invoice
          </Button>
          <Button variant="ghost" size="sm" disabled>
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Document preview */}
        <div className="lg:col-span-2">
          <DocumentPreview type="quote" {...MOCK} />
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
                <span className="tabular-nums">R 66 350.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (15%)</span>
                <span className="tabular-nums">R 9 952.50</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">R 76 302.50</span>
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
                  { label: 'Quote sent to client', date: '01 May 2026, 10:30' },
                  { label: 'Quote created',        date: '01 May 2026, 10:15' },
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
