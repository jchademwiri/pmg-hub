import type { Metadata } from 'next'
import { getAllSnapshots } from '@pmg/db'
import { formatZAR } from '@/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Snapshots' }

export default async function SnapshotsPage() {
  const snapshots = await getAllSnapshots()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Financial Snapshots</h1>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No months have been closed yet. Use the Close Month button on the dashboard to lock a month&apos;s figures.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Expenses</TableHead>
              <TableHead>PMG Share</TableHead>
              <TableHead>Profit Pool</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Reinvest</TableHead>
              <TableHead>Reserve</TableHead>
              <TableHead>Flex</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {new Date(row.period + '-01').toLocaleString('en-ZA', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell>{formatZAR(Number(row.revenue))}</TableCell>
                <TableCell>{formatZAR(Number(row.expenses))}</TableCell>
                <TableCell>{formatZAR(Number(row.pmgShare))}</TableCell>
                <TableCell>{formatZAR(Number(row.profitPool))}</TableCell>
                <TableCell>{formatZAR(Number(row.salary))}</TableCell>
                <TableCell>{formatZAR(Number(row.reinvest))}</TableCell>
                <TableCell>{formatZAR(Number(row.reserve))}</TableCell>
                <TableCell>{formatZAR(Number(row.flex))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
