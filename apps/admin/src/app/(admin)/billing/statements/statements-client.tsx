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

function SortIcon({ field, currentField, order }: { field: SortField; currentField: SortField; order: SortOrder }) {
  if (currentField !== field) return <ArrowUpDown className="ml-1 size-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
  return order === 'asc' ? (
    <ArrowUp className="ml-1 size-3 text-foreground" />
  ) : (
    <ArrowDown className="ml-1 size-3 text-foreground" />
  );
}

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

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%] py-4">
                <button
                  onClick={() => handleSort('name')}
                  className="group inline-flex items-center text-xs font-semibold hover:text-foreground text-left"
                >
                  Client
                  <SortIcon field="name" currentField={sortField} order={sortOrder} />
                </button>
              </TableHead>
              <TableHead className="text-right py-4">
                <button
                  onClick={() => handleSort('totalInvoiced')}
                  className="group inline-flex items-center text-xs font-semibold hover:text-foreground"
                >
                  Total Invoiced
                  <SortIcon field="totalInvoiced" currentField={sortField} order={sortOrder} />
                </button>
              </TableHead>
              <TableHead className="text-right py-4">
                <button
                  onClick={() => handleSort('totalPaid')}
                  className="group inline-flex items-center text-xs font-semibold hover:text-foreground"
                >
                  Total Paid
                  <SortIcon field="totalPaid" currentField={sortField} order={sortOrder} />
                </button>
              </TableHead>
              <TableHead className="text-right py-4">
                <button
                  onClick={() => handleSort('totalOutstanding')}
                  className="group inline-flex items-center text-xs font-semibold hover:text-foreground"
                >
                  Outstanding
                  <SortIcon field="totalOutstanding" currentField={sortField} order={sortOrder} />
                </button>
              </TableHead>
              <TableHead className="py-4">
                <button
                  onClick={() => handleSort('lastActivityDate')}
                  className="group inline-flex items-center text-xs font-semibold hover:text-foreground"
                >
                  Last Activity
                  <SortIcon field="lastActivityDate" currentField={sortField} order={sortOrder} />
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

      {/* Mobile List View */}
      <div className="md:hidden flex flex-col gap-3">
        {sortedClients.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-8 border border-dashed rounded-lg">
            {searchTerm || filterType !== 'all'
              ? 'No statement records found matching the criteria.'
              : 'No client statements available yet.'}
          </div>
        ) : (
          sortedClients.map((client) => {
            const hasOutstanding = client.totalOutstanding > 0;
            return (
              <div 
                key={client.id}
                onClick={() => router.push(`/billing/statements/${client.id}`)}
                className="flex flex-col gap-2 p-4 bg-card border border-border rounded-xl shadow-sm cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm hover:text-primary hover:underline flex items-center gap-2">
                      {client.businessName ?? client.name}
                      {hasOutstanding && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500" title="Has outstanding balance" />}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
                    {client.lastActivityDate ? fmtDate(client.lastActivityDate) : 'No activity'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2 pt-3 border-t border-border/50">
                   <div className="flex flex-col gap-1">
                     <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Invoiced</span>
                     <span className="text-xs font-semibold">{formatZAR(client.totalInvoiced)}</span>
                   </div>
                   <div className="flex flex-col gap-1 text-right">
                     <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Paid</span>
                     <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatZAR(client.totalPaid)}</span>
                   </div>
                </div>
                
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/50 bg-muted/20 -mx-4 -mb-4 px-4 pb-4 pt-3 rounded-b-xl">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Outstanding</span>
                  <span className={hasOutstanding ? "text-xs font-bold text-red-500" : "text-xs font-medium text-muted-foreground"}>
                    {formatZAR(client.totalOutstanding)}
                  </span>
                </div>
              </div>
            );
          })
        )}
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
