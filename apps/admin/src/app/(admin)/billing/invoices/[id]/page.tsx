import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Printer, Send, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Invoice' }

interface Props {
  params: Promise<{ id: string }>
}

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
              <Badge variant="secondary">Draft</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Created —</p>
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
        {/* Invoice body */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Client & invoice meta */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Invoice Details</CardTitle>
                  <CardDescription>Invoice #{id}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {[
                  { label: 'Client', value: '—' },
                  { label: 'Issue Date', value: '—' },
                  { label: 'Due Date', value: '—' },
                  { label: 'Reference', value: '—' },
                ].map((field) => (
                  <div key={field.label} className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                    <span className="text-sm font-medium">{field.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                      No line items
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No notes added.</p>
            </CardContent>
          </Card>
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
                <span className="tabular-nums">R 0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (15%)</span>
                <span className="tabular-nums">R 0.00</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">R 0.00</span>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
