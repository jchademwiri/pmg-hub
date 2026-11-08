'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatZAR, fmtDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Receipt, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { IssueCreditNoteDialog } from '@/components/billing/issue-credit-note-dialog';
import { CreditRefundDialog } from '@/components/billing/credit-refund-dialog';
import {
  Wallet,
  AlertCircle,
  Clock,
  CheckCircle2,
  Download,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface CreditNoteEntry {
  id: string;
  documentNumber: string;
  status: string;
  type: string;
  reason: string | null;
  amount: number;
  amountRemaining: number;
  createdAt: string;
  expiresAt: string | null;
  clientId: string;
  divisionId: string;
}

interface CreditsClientProps {
  creditNotes: CreditNoteEntry[];
  clients: { id: string; name: string; businessName: string | null }[];
  divisions: { id: string; name: string }[];
  activeCredit: number;
  expiredCredit: number;
  totalIssued: number;
  totalCredit: number;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-3" />
          Active
        </span>
      );
    case 'partially_applied':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
          <Clock className="size-3" />
          Partial
        </span>
      );
    case 'fully_applied':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600">
          Used
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
          <AlertCircle className="size-3" />
          Expired
        </span>
      );
    case 'void':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600">
          Void
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600">
          {status}
        </span>
      );
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'overpayment':
      return 'Advance Payment';
    case 'manual_adjustment':
      return 'Manual Adjustment';
    case 'credit_note':
      return 'Credit Note';
    case 'promotional':
      return 'Promotional';
    case 'refund_reversal':
      return 'Refund Reversal';
    default:
      return type;
  }
}

export function CreditsClient({
  creditNotes,
  clients,
  divisions,
  activeCredit,
  expiredCredit,
  totalIssued,
  totalCredit,
}: CreditsClientProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [selectedNoteForRefund, setSelectedNoteForRefund] = useState<{
    id: string;
    documentNumber: string;
    amountRemaining: number;
    clientId: string;
    clientName: string;
  } | null>(null);

  // Build lookup maps
  const clientMap = new Map(clients.map((c) => [c.id, c.businessName ?? c.name]));
  const divisionMap = new Map(divisions.map((d) => [d.id, d.name]));

  function exportCreditsToCSV() {
    const headers = [
      'Document #',
      'Client',
      'Type',
      'Reason',
      'Amount',
      'Remaining',
      'Status',
      'Date',
    ];
    const rows = filteredNotes.map((note) => [
      note.documentNumber,
      clientMap.get(note.clientId) ?? 'Unknown',
      getTypeLabel(note.type),
      `"${(note.reason ?? '').replace(/"/g, '""')}"`,
      note.amount,
      note.amountRemaining,
      note.status,
      fmtDate(note.createdAt),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `credit-notes-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filter credit notes
  const filteredNotes = creditNotes.filter((note) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        if (note.status !== 'active' && note.status !== 'partially_applied') return false;
      } else if (note.status !== statusFilter) {
        return false;
      }
    }
    if (typeFilter !== 'all' && note.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const clientName = clientMap.get(note.clientId)?.toLowerCase() ?? '';
      const docNumber = note.documentNumber.toLowerCase();
      const reason = note.reason?.toLowerCase() ?? '';
      if (!clientName.includes(query) && !docNumber.includes(query) && !reason.includes(query))
        return false;
    }
    return true;
  });

  const appliedCredit = Math.max(0, totalIssued - activeCredit - expiredCredit);
  const activeCount = creditNotes.filter(
    (n) => n.status === 'active' || n.status === 'partially_applied',
  ).length;
  const expiredCount = creditNotes.filter((n) => n.status === 'expired').length;
  const utilizationRate = totalIssued > 0 ? (appliedCredit / totalIssued) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Credit Management</h2>
          <p className="text-sm text-muted-foreground">
            Monitor client credits, credit notes, and credit balances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="partially_applied">Partial</SelectItem>
              <SelectItem value="fully_applied">Used</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 md:w-52">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="overpayment">Advance Payment</SelectItem>
              <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
              <SelectItem value="credit_note">Credit Note</SelectItem>
              <SelectItem value="promotional">Promotional</SelectItem>
              <SelectItem value="refund_reversal">Refund Reversal</SelectItem>
            </SelectContent>
          </Select>

          {filteredNotes.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCreditsToCSV} className="gap-1.5">
              <Download className="size-4" />
              Export CSV
            </Button>
          )}

          <Button size="sm" onClick={() => setShowIssueDialog(true)}>
            <Plus className="size-4 mr-1.5" />
            Issue Credit Note
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <BillingKpiCard
          title="Total Issued"
          value={formatZAR(totalIssued)}
          subtitle={
            <span>
              <span className="font-semibold text-foreground/80">{creditNotes.length}</span> credit
              notes issued
            </span>
          }
          icon={Wallet}
          variant="blue"
          onClick={() => setStatusFilter('all')}
          isActive={statusFilter === 'all'}
          activeLabel="All notes"
          tooltip="Click to view all credit notes"
        />

        <BillingKpiCard
          title="Active Credits"
          value={formatZAR(activeCredit)}
          subtitle={
            <span>
              <span className="font-semibold text-foreground/80">{activeCount}</span> available for
              billing
            </span>
          }
          icon={CheckCircle2}
          variant="emerald"
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          isActive={statusFilter === 'active'}
          activeLabel="Filtered"
          tooltip="Click to filter active credit notes"
        />

        <BillingKpiCard
          title="Expired Credits"
          value={formatZAR(expiredCredit)}
          subtitle={
            <span>
              {expiredCredit > 0 ? (
                <>
                  <span className="font-semibold text-foreground/80">{expiredCount}</span> expired /
                  forfeited
                </>
              ) : (
                'Zero expired credits'
              )}
            </span>
          }
          icon={AlertCircle}
          variant={expiredCredit > 0 ? 'amber' : 'zinc'}
          onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
          isActive={statusFilter === 'expired'}
          activeLabel="Filtered"
          tooltip="Click to filter expired credit notes"
        />

        <BillingKpiCard
          title="Utilization Rate"
          value={`${utilizationRate.toFixed(1)}%`}
          subtitle={
            <span>
              Utilized:{' '}
              <span className="font-semibold text-foreground/80">{formatZAR(appliedCredit)}</span>
            </span>
          }
          icon={TrendingUp}
          variant="violet"
          progress={{
            value: utilizationRate,
            colorClass: 'bg-violet-500',
          }}
          onClick={() =>
            setStatusFilter(statusFilter === 'fully_applied' ? 'all' : 'fully_applied')
          }
          isActive={statusFilter === 'fully_applied'}
          activeLabel="Filtered"
          tooltip="Click to filter fully utilized credit notes"
        />
      </div>

      {/* Credit Notes Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Credit Notes</CardTitle>
            <CardDescription>All credit notes and their current status</CardDescription>
          </div>
          <Input
            placeholder="Search client, document, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 text-xs h-9"
          />
        </CardHeader>
        <CardContent className="p-0 px-6 pb-4">
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px] px-2 text-xs">Document #</TableHead>
                  <TableHead className="px-2 text-xs min-w-[120px]">Client</TableHead>
                  <TableHead className="w-[115px] px-2 text-xs">Type</TableHead>
                  <TableHead className="px-2 text-xs min-w-[130px]">Reason</TableHead>
                  <TableHead className="w-[95px] px-2 text-right text-xs">Amount</TableHead>
                  <TableHead className="w-[95px] px-2 text-right text-xs">Remaining</TableHead>
                  <TableHead className="w-[85px] px-2 text-xs">Status</TableHead>
                  <TableHead className="w-[95px] px-2 text-xs">Date</TableHead>
                  <TableHead className="w-[120px] px-2 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-muted-foreground text-xs"
                    >
                      {creditNotes.length === 0
                        ? 'No credit notes found. Click "Issue Credit Note" to create one.'
                        : 'No credit notes match the current filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotes.map((note) => {
                    const amountRemainingNum =
                      typeof note.amountRemaining === 'number'
                        ? note.amountRemaining
                        : parseFloat(note.amountRemaining);
                    const isRefundable =
                      note.status !== 'void' && note.status !== 'expired' && amountRemainingNum > 0;

                    return (
                      <TableRow
                        key={note.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => router.push(`/billing/credits/${note.id}`)}
                      >
                        <TableCell className="font-medium text-xs px-2 truncate">
                          <span className="text-primary group-hover:underline inline-flex items-center gap-1 font-mono">
                            {note.documentNumber}
                            <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </TableCell>
                        <TableCell
                          className="text-xs px-2 truncate"
                          title={clientMap.get(note.clientId) ?? 'Unknown'}
                        >
                          <span className="truncate block">
                            {clientMap.get(note.clientId) ?? 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell
                          className="text-xs px-2 truncate"
                          title={getTypeLabel(note.type)}
                        >
                          {getTypeLabel(note.type)}
                        </TableCell>
                        <TableCell className="text-xs truncate px-2" title={note.reason ?? ''}>
                          <span className="truncate block">{note.reason ?? '-'}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-xs px-2 whitespace-nowrap">
                          {formatZAR(note.amount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs px-2 whitespace-nowrap">
                          {amountRemainingNum > 0 ? (
                            <span className="font-bold text-emerald-600">
                              {formatZAR(amountRemainingNum)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2">{getStatusBadge(note.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground px-2 whitespace-nowrap">
                          {fmtDate(note.createdAt)}
                        </TableCell>
                        <TableCell
                          className="text-right py-1 px-2 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {isRefundable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-blue-600 hover:text-blue-700 h-7 px-2"
                                onClick={() => {
                                  setSelectedNoteForRefund({
                                    id: note.id,
                                    documentNumber: note.documentNumber,
                                    amountRemaining: amountRemainingNum,
                                    clientId: note.clientId,
                                    clientName: clientMap.get(note.clientId) ?? 'Unknown',
                                  });
                                  setShowRefundDialog(true);
                                }}
                              >
                                Refund
                              </Button>
                            )}
                            {note.status !== 'void' &&
                              note.status !== 'expired' &&
                              amountRemainingNum >= note.amount &&
                              amountRemainingNum > 0 && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs text-red-500 hover:text-red-600 h-7 px-2"
                                      title="Void credit note"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Void Credit Note</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Voiding <strong>{note.documentNumber}</strong> will mark it
                                        as void. This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={async () => {
                                          setIsVoiding(true);
                                          try {
                                            const { voidCreditNote } =
                                              await import('@/app/actions/credit-management');
                                            const res = await voidCreditNote(note.id);
                                            if (res.error) {
                                              toast.error(res.error);
                                            } else {
                                              toast.success(`${note.documentNumber} voided`);
                                              router.refresh();
                                            }
                                          } catch {
                                            toast.error('Failed to void');
                                          } finally {
                                            setIsVoiding(false);
                                          }
                                        }}
                                        disabled={isVoiding}
                                      >
                                        {isVoiding ? 'Voiding...' : 'Confirm Void'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Issue Credit Note Dialog */}
      <IssueCreditNoteDialog
        open={showIssueDialog}
        onOpenChange={setShowIssueDialog}
        clients={clients}
        divisions={divisions}
      />

      {/* Credit Refund Dialog */}
      <CreditRefundDialog
        open={showRefundDialog}
        onOpenChange={setShowRefundDialog}
        creditNote={selectedNoteForRefund}
      />
    </div>
  );
}
