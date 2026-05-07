import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Printer, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DocumentPreview } from '@/components/billing/document-preview'
import type { DocumentPreviewProps } from '@/components/billing/document-preview'
import { MOCK_STATEMENT, MOCK_STATEMENT_SUMMARY } from '@/lib/mock/billing'

export const metadata: Metadata = { title: 'Statement' }

interface Props {
  params: Promise<{ clientId: string }>
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
              {MOCK_STATEMENT.periodFrom} – {MOCK_STATEMENT.periodTo}
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
        {MOCK_STATEMENT_SUMMARY.map((s) => (
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
          <DocumentPreview type="statement" {...MOCK_STATEMENT} href={`/billing/statements/${clientId}`} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Client Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: 'Name',    value: MOCK_STATEMENT.client.name },
                  { label: 'Email',   value: MOCK_STATEMENT.client.email ?? '—' },
                  { label: 'Phone',   value: MOCK_STATEMENT.client.phone ?? '—' },
                  { label: 'Address', value: MOCK_STATEMENT.client.address ?? '—' },
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
                  <span>{MOCK_STATEMENT.periodFrom}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To</span>
                  <span>{MOCK_STATEMENT.periodTo}</span>
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
