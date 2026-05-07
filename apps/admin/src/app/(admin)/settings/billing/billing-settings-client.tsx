'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Division {
  id: string
  name: string
}

interface BillingSettingsClientProps {
  divisions: Division[]
}

/** Derive a short uppercase prefix from a division name, e.g. "AWS Solutions" → "AWS" */
function divisionPrefix(name: string): string {
  // If the first word is all-caps and 2–5 chars, use it directly
  const firstWord = name.trim().split(/\s+/)[0]
  if (/^[A-Z]{2,5}$/.test(firstWord)) return firstWord
  // Otherwise take up to 3 initials from the words
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function DivisionBillingForm({ division }: { division: Division }) {
  const prefix = divisionPrefix(division.name)
  const invoicePrefix = `${prefix}-INV-`
  const quotePrefix = `${prefix}-QTE-`

  return (
    <div className="flex flex-col gap-6">
      {/* Document Numbering */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Document Numbering</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Prefix and starting number for invoices and quotes.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Invoice Prefix</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  {invoicePrefix}
                </div>
                <p className="text-xs text-muted-foreground">e.g. {invoicePrefix}0001</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Next Invoice Number</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  0001
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Quote Prefix</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  {quotePrefix}
                </div>
                <p className="text-xs text-muted-foreground">e.g. {quotePrefix}0001</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Next Quote Number</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  0001
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Tax & Payment */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Tax & Payment</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Default VAT rate and payment terms for new documents.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Default VAT Rate</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  15%
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Default Payment Terms</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  30 days
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Currency</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  ZAR — South African Rand
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Logo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Logo</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Displayed on invoices and quotes for {division.name}.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                No logo
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" disabled>Upload Logo</Button>
                <p className="text-xs text-muted-foreground">PNG or SVG, max 2 MB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Banking Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Banking Details</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Printed on invoices so clients know where to pay.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Bank Name</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  —
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Account Name</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  —
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Account Number</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  —
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Branch Code</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  —
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Default Notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Default Notes</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pre-filled notes on new invoices and quotes. Can be overridden per document.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Invoice Notes</label>
              <div className="h-20 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                —
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Quote Notes / Terms</label>
              <div className="h-20 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                —
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button disabled>Save Changes</Button>
      </div>
    </div>
  )
}

export function BillingSettingsClient({ divisions }: BillingSettingsClientProps) {
  const [activeId, setActiveId] = useState<string>(divisions[0]?.id ?? '')

  const activeDivision = divisions.find((d) => d.id === activeId) ?? divisions[0]

  if (!activeDivision) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No divisions found. Add a division first to configure billing settings.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Horizontal division tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-0">
        {divisions.map((division) => (
          <button
            key={division.id}
            onClick={() => setActiveId(division.id)}
            className={cn(
              'shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeId === division.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            {division.name}
          </button>
        ))}
      </div>

      {/* Settings form for the active division */}
      <DivisionBillingForm key={activeDivision.id} division={activeDivision} />
    </div>
  )
}
