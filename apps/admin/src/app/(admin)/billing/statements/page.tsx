import type { Metadata } from 'next'
import Link from 'next/link'
import { Users, TrendingUp, FileText, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Statements' }

const stats = [
  { label: 'Active Clients', value: '—', icon: Users, description: 'With statements' },
  { label: 'Total Billed', value: '—', icon: TrendingUp, description: 'All time' },
  { label: 'Statements', value: '—', icon: FileText, description: 'Generated' },
  { label: 'Last Generated', value: '—', icon: Calendar, description: 'Most recent' },
]

export default function StatementsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Statements</h2>
          <p className="text-sm text-muted-foreground">View account statements per client</p>
        </div>
        <div className="flex items-center gap-2">
          {/* TODO: remove — dev preview link */}
          <Link
            href="/billing/statements/mock-preview"
            className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            Preview mock statement →
          </Link>
          <Button variant="outline" size="sm" disabled>
            Generate Statement
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

      {/* Clients table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Statements</CardTitle>
          <CardDescription>Select a client to view their full account statement</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Total Invoiced</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="py-0">
                  <EmptyState
                    message="No client statements available yet. Statements are generated from invoices."
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
