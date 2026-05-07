import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Printer, Send, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DocumentPreview } from '@/components/billing/document-preview'
import type { DocumentPreviewProps } from '@/components/billing/document-preview'
import { MOCK_INVOICE, MOCK_INVOICE_ACTIVITY } from '@/lib/mock/billing'

export const metadata: Metadata = { title: 'Invoice' }

interface Props {
  params: Promise<{ id: string }>
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
              <Badge variant="secondary">{MOCK_INVOICE.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Issued {MOCK_INVOICE.issueDate}</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Document preview */}
        <div className="lg:col-span-2">
          <DocumentPreview type="invoice" {...MOCK_INVOICE} href={`/billing/invoices/${id}`} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16">
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
                {MOCK_INVOICE_ACTIVITY.map((entry) => (
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
