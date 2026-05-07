import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = { title: 'New Invoice' }

export default function NewInvoicePage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/billing/invoices">
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <h2 className="text-lg font-semibold">New Invoice</h2>
          <p className="text-sm text-muted-foreground">Create a new client invoice</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main form area */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Client & details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Basic information about this invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Client</label>
                  <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                    Select a client…
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Invoice #</label>
                  <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                    Auto-generated
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Issue Date</label>
                  <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                    Pick a date…
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Due Date</label>
                  <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                    Pick a date…
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Services or products being invoiced</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Line items will be added here
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" disabled>
                  + Add Line Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Optional notes or payment instructions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Add notes…
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar summary */}
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
              <Button className="mt-2 w-full" disabled>
                Save Invoice
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Save as Draft
              </Button>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Invoice will be saved as <strong>Draft</strong> until sent.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
