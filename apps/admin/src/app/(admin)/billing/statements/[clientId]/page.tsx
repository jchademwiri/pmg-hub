import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Printer, Download } from 'lucide-react'
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

export const metadata: Metadata = { title: 'Client Statement' }

interface Props {
  params: Promise<{ clientId: string }>
}

export default async function ClientStatementPage({ params }: Props) {
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
            <h2 className="text-lg font-semibold">Account Statement</h2>
            <p className="text-sm text-muted-foreground">Client ID: {clientId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="size-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Invoiced', value: 'R 0.00', description: 'All time' },
          { label: 'Total Paid', value: 'R 0.00', description: 'Received payments' },
          { label: 'Outstanding Balance', value: 'R 0.00', description: 'Amount due' },
        ].map((card) => (
          <Card key={card.label} size="sm">
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Statement transactions */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All invoices and payments for this client</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      No transactions found for this client
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Client info sidebar */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Info</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[
                { label: 'Name', value: '—' },
                { label: 'Email', value: '—' },
                { label: 'Phone', value: '—' },
                { label: 'Address', value: '—' },
              ].map((field) => (
                <div key={field.label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{field.label}</span>
                  <span className="text-sm">{field.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Statement Period</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">From</span>
                <span>—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">To</span>
                <span>—</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" disabled>
                Change Period
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
