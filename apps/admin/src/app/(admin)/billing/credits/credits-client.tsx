'use client';

import { useState } from 'react';
import { formatZAR, fmtDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { IssueCreditNoteDialog } from '@/components/billing/issue-credit-note-dialog';
import { CreditRefundDialog } from '@/components/billing/credit-refund-dialog';
import { Wallet, AlertCircle, Clock, CheckCircle2, Download } from 'lucide-react';

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
    case 'overpayment': return 'Overpayment';
    case 'manual_adjustment': return 'Manual Adjustment';
    case 'credit_note': return 'Credit Note';
    case 'promotional': return 'Promotional';
    case 'refund_reversal': return 'Refund Reversal';
    default: return type;
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
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
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
    const headers = ['Document #', 'Client', 'Type', 'Reason', 'Amount', 'Remaining', 'Status', 'Date'];
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
    if (statusFilter !== 'all' && note.status !== statusFilter) return false;
    if (typeFilter !== 'all' && note.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const clientName = clientMap.get(note.clientId)?.toLowerCase() ?? '';
      const docNumber = note.documentNumber.toLowerCase();
      const reason = note.reason?.toLowerCase() ?? '';
      if (!clientName.includes(query) && !docNumber.includes(query) && !reason.includes(query)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="size-3.5" />
              Total Credits Issued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold tabular-nums">{formatZAR(totalIssued)}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">{formatZAR(activeCredit)}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Expired Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-600 tabular-nums">{formatZAR(expiredCredit)}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credit Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold tabular-nums">{creditNotes.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Input
            placeholder="Search client, document, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36">
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
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="overpayment">Overpayment</SelectItem>
              <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
              <SelectItem value="credit_note">Credit Note</SelectItem>
              <SelectItem value="promotional">Promotional</SelectItem>
              <SelectItem value="refund_reversal">Refund Reversal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {filteredNotes.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCreditsToCSV} className="gap-1.5">
              <Download className="size-4" />
              Export CSV
            </Button>
          )}
          <Button size="sm" onClick={() => setShowIssueDialog(true)}>
            Issue Credit Note
          </Button>
        </div>
      </div>

      {/* Credit Notes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Notes</CardTitle>
          <CardDescription>All credit notes and their current status</CardDescription>
        </CardHeader>
        <CardContent className="p-0 px-6 pb-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground text-xs">
                      {creditNotes.length === 0
                        ? 'No credit notes found. Click "Issue Credit Note" to create one.'
                        : 'No credit notes match the current filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotes.map((note) => {
                    const amountRemainingNum = typeof note.amountRemaining === 'number' ? note.amountRemaining : parseFloat(note.amountRemaining);
                    const isRefundable = note.status !== 'void' && note.status !== 'expired' && amountRemainingNum > 0;

                    return (
                      <TableRow key={note.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-medium text-xs">{note.documentNumber}</TableCell>
                        <TableCell className="text-xs">{clientMap.get(note.clientId) ?? 'Unknown'}</TableCell>
                        <TableCell className="text-xs">{getTypeLabel(note.type)}</TableCell>
                        <TableCell className="text-xs truncate max-w-[200px]" title={note.reason ?? ''}>
                          {note.reason ?? '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-xs">
                          {formatZAR(note.amount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs">
                          {amountRemainingNum > 0 ? (
                            <span className="font-bold text-emerald-600">{formatZAR(amountRemainingNum)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(note.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDate(note.createdAt)}
                        </TableCell>
                        <TableCell className="text-right py-1">
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
