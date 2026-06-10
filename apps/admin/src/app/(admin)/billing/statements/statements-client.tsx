'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatZAR, fmtDate } from '@/lib/format';

interface ClientStatementSummary {
  id: string;
  name: string;
  businessName: string | null;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  lastActivityDate: string | null;
}

interface StatementsClientProps {
  initialClients: ClientStatementSummary[];
}

type SortField = 'name' | 'totalInvoiced' | 'totalPaid' | 'totalOutstanding' | 'lastActivityDate';
type SortOrder = 'asc' | 'desc';

export function StatementsClient({ initialClients }: StatementsClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'outstanding'>('all');
  const [sortField, setSortField] = React.useState<SortField>('totalOutstanding');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // default to descending for amounts/dates, alphabetical name gets sorted naturally
    }
  };

  // Search & Filter
  const filteredClients = React.useMemo(() => {
    return initialClients.filter((client) => {
      const nameMatch = (client.businessName ?? client.name)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const outstandingMatch =
        filterType === 'all' || client.totalOutstanding > 0;

      return nameMatch && outstandingMatch;
    });
  }, [initialClients, searchTerm, filterType]);

  // Sorting
  const sortedClients = React.useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'name') {
        valA = (a.businessName ?? a.name).toLowerCase();
        valB = (b.businessName ?? b.name).toLowerCase();
      } else if (sortField === 'lastActivityDate') {
        valA = a.lastActivityDate || '';
        valB = b.lastActivityDate || '';
      } else {
        valA = a[sortField];
        valB = b[sortField];
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredClients, sortField, sortOrder]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 size-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 size-3 text-foreground" />
    ) : (
      <ArrowDown className="ml-1 size-3 text-foreground" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search client statements..."
            className="pl-9 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            variant={filterType === 'all' ? 'secondary' : 'ghost'}
            size="xs"
            className="text-xs"
            onClick={() => setFilterType('all')}
          >
            All Accounts
          </Button>
          <Button
            variant={filterType === 'outstanding' ? 'secondary' : 'ghost'}
            size="xs"
            className="text-xs"
            onClick={() => setFilterType('outstanding')}
          >
            Outstanding Balance
          </Button>
        </div>
      </div>

      {/* Main Table without card background/border */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%] py-4">
                <button
                  onClick={() => handleSort('name')}
                  className="group inline-flex items-center text-xs font-semibold hover:text-foreground text-left"
                >
                  Client
                  <SortIcon field="name" />
                </button>
              </TableHead>
              <TableHead className="text-right py-4">
                <button
                  onClick={() => handleSort('totalInvoiced')}
                  className="group inline-flex items-center text-xs font-semibold hover:text-foreground"
                >
                  Total Invoiced
                  <SortIcon field="totalInvoiced" />
                </button>
              </TableHead>
              <TableHead className="text-right py-4">
                <button
                  onClick={() => handleSort('totalPaid')}
                  className="group inline-flex items-center text-xs font-semibold hover:text-foreground"
                >
                  Total Paid
                  <SortIcon field="totalPaid" />
                </button>
              </TableHead>
              <TableHead className="text-right py-4">
                <button
                  onClick={() => handleSort('totalOutstanding')}
                  className="group inline-flex items-center text-xs font-semibold hover:text-foreground"
                >
                  Outstanding
                  <SortIcon field="totalOutstanding" />
                </button>
              </TableHead>
              <TableHead className="py-4">
                <button
                  onClick={() => handleSort('lastActivityDate')}
                  className="group inline-flex items-center text-xs font-semibold hover:text-foreground"
                >
                  Last Activity
                  <SortIcon field="lastActivityDate" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                  {searchTerm || filterType !== 'all'
                    ? 'No statement records found matching the criteria.'
                    : 'No client statements available yet.'}
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map((client) => {
                const hasOutstanding = client.totalOutstanding > 0;
                return (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border"
                    onClick={() => router.push(`/billing/statements/${client.id}`)}
                  >
                    <TableCell className="font-medium text-sm py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground hover:text-primary hover:underline">
                          {client.businessName ?? client.name}
                        </span>
                        {hasOutstanding && (
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500" title="Has outstanding balance" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium py-4">
                      {formatZAR(client.totalInvoiced)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-emerald-600 dark:text-emerald-400 font-medium py-4">
                      {formatZAR(client.totalPaid)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm py-4">
                      <span
                        className={
                          hasOutstanding
                            ? 'text-red-500 font-semibold'
                            : 'text-muted-foreground'
                        }
                      >
                        {formatZAR(client.totalOutstanding)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-4">
                      {client.lastActivityDate ? fmtDate(client.lastActivityDate) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {/* Search results summary */}
      {filteredClients.length < initialClients.length && (
        <p className="text-[11px] text-muted-foreground">
          Showing {filteredClients.length} of {initialClients.length} statements
        </p>
      )}
    </div>
  );
}
