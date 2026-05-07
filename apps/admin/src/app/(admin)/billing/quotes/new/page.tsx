import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = { title: 'New Quotation' }

export default function NewQuotePage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/billing/quotes">
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <h2 className="text-lg font-semibold">New Quotation</h2>
          <p className="text-sm text-muted-foreground">Create a new quote for a client</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main form area */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Quote details */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
              <CardDescription>Basic information about this quotation</CardDescription>
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
                  <label className="text-sm font-medium">Quote #</label>
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
                  <label className="text-sm font-medium">Expiry Date</label>
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
              <CardDescription>Services or products being quoted</CardDescription>
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

          {/* Terms & notes */}
          <Card>
            <CardHeader>
              <CardTitle>Terms & Notes</CardTitle>
              <CardDescription>Optional terms, conditions, or notes for the client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Add terms or notes…
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
                Save Quote
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
                Quote will be saved as <strong>Draft</strong> until sent to the client.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
