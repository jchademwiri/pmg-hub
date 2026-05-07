import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Archive, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = { title: 'Item' }

interface Props {
  params: Promise<{ id: string }>
}

// ── Mock data — TODO: replace with real DB fetch ──────────────────────────────

const MOCK = {
  name: 'Website Maintenance',
  description: 'Monthly website maintenance including security updates, plugin updates, uptime monitoring, and up to 2 hours of content changes.',
  unitPrice: 'R 4 500.00',
  unitLabel: 'month',
  vatApplicable: true,
  status: 'Active',
  createdAt: '12 Jan 2026',
  usageInvoices: 8,
  usageQuotes: 3,
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing/items">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{MOCK.name}</h2>
              <Badge variant="secondary">{MOCK.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Created {MOCK.createdAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Archive className="size-4" />
            Archive
          </Button>
          <Button variant="ghost" size="sm" disabled>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Item details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
              <CardDescription>Service item information</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Name</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm">
                  {MOCK.name}
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Description</label>
                <div className="min-h-20 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
                  {MOCK.description}
                </div>
              </div>

              {/* Unit Price + Unit Label */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Unit Price</label>
                  <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm">
                    {MOCK.unitPrice}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Unit Label</label>
                  <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm">
                    {MOCK.unitLabel}
                  </div>
                </div>
              </div>

              {/* VAT Applicable */}
              <div className="flex items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">VAT Applicable</span>
                  <span className="text-xs text-muted-foreground">
                    Apply 15% VAT to this item by default
                  </span>
                </div>
                {/* Mock toggle — on state */}
                <div className="h-5 w-9 rounded-full bg-primary flex items-center px-0.5">
                  <div className="ml-auto h-4 w-4 rounded-full bg-primary-foreground shadow-sm" />
                </div>
              </div>

              <Separator className="my-2" />

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1" disabled>
                  Save Changes
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/billing/items">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — sticky */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoices</span>
                  <span className="tabular-nums font-medium">{MOCK.usageInvoices}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quotes</span>
                  <span className="tabular-nums font-medium">{MOCK.usageQuotes}</span>
                </div>
                <Separator className="my-1" />
                <p className="text-xs text-muted-foreground">
                  Used on {MOCK.usageInvoices + MOCK.usageQuotes} documents in total.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{MOCK.status}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT</span>
                  <span>{MOCK.vatApplicable ? 'Applicable' : 'Exempt'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{MOCK.createdAt}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
