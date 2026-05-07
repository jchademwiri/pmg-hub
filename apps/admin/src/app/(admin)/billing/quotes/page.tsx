import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Quotations' }

const stats = [
  { label: 'Total Quotes', value: '—', icon: FileText, description: 'All time' },
  { label: 'Pending', value: '—', icon: Clock, description: 'Awaiting response' },
  { label: 'Accepted', value: '—', icon: CheckCircle, description: 'Converted to invoice' },
  { label: 'Declined', value: '—', icon: XCircle, description: 'Not accepted' },
]

export default function QuotesPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quotations</h2>
          <p className="text-sm text-muted-foreground">Create and manage client quotes</p>
        </div>
        <div className="flex items-center gap-2">
          {/* TODO: remove — dev preview link */}
          <Link
            href="/billing/quotes/mock-preview"
            className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            Preview mock quote →
          </Link>
          <Button asChild size="sm">
            <Link href="/billing/quotes/new">
              <Plus className="size-4" />
              New Quote
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{stat.label}</CardDescription>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quotes table */}
      <Card>
        <CardHeader>
          <CardTitle>All Quotations</CardTitle>
          <CardDescription>A list of all quotes sent to clients</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="py-0">
                  <EmptyState
                    message="No quotations yet. Create your first quote to get started."
                    ctaLabel="New Quote"
                    ctaHref="/billing/quotes/new"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
