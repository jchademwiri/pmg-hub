import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = { title: 'New Item' }

export default function NewItemPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/billing/items">
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <h2 className="text-lg font-semibold">New Item</h2>
          <p className="text-sm text-muted-foreground">Create a new service item</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
            <CardDescription>Basic information about this service item</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Name</label>
              <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                e.g. Website Maintenance
              </div>
              <p className="text-xs text-muted-foreground">
                Short label used in the search dropdown
              </p>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Description</label>
              <div className="h-20 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Add a description…
              </div>
              <p className="text-xs text-muted-foreground">
                Longer description that pre-fills the line item on invoices and quotes
              </p>
            </div>

            {/* Unit Price */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Unit Price</label>
              <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                R 0.00
              </div>
              <p className="text-xs text-muted-foreground">
                Default price; can be overridden per line item
              </p>
            </div>

            {/* Unit Label */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Unit Label (optional)</label>
              <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                e.g. hour, month, project
              </div>
              <p className="text-xs text-muted-foreground">
                Label shown next to quantity
              </p>
            </div>

            {/* VAT Applicable */}
            <div className="flex items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">VAT Applicable</span>
                <span className="text-xs text-muted-foreground">
                  Apply 15% VAT to this item by default
                </span>
              </div>
              <div className="h-5 w-9 rounded-full bg-primary/20" />
            </div>

            <Separator className="my-2" />

            {/* Actions */}
            <div className="flex gap-2">
              <Button className="flex-1" disabled>
                Save Item
              </Button>
              <Button variant="outline" asChild>
                <Link href="/billing/items">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
