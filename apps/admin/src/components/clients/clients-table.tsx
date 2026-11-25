'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  PowerOff,
  Power,
  Mail,
  Send,
  Loader2,
  MoreHorizontal,
  MessageCircle,
  FileText,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ClientWithIncomeCount } from '@pmg/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataList } from '@/components/ui/data-list';
import { sendPortalInvitation } from '@/app/actions/clients';
import { formatZAR } from '@/lib/format';
import { normalizeSAPhoneNumber } from '@/lib/billing/whatsapp';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientBalanceSummary {
  outstanding: number;
  overdue: number;
}

interface ClientsTableProps {
  clients: ClientWithIncomeCount[];
  balancesByClient?: Record<string, ClientBalanceSummary>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

export function ClientsTable({
  clients,
  balancesByClient = {},
  deleteAction,
  toggleActiveAction,
}: ClientsTableProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [pendingToggleId, setPendingToggleId] = React.useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deleteAction(deleteId);
    if (result.error) {
      toast.error(result.error);
    }
    setDeleteId(null);
  }

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    setPendingToggleId(id);
    try {
      const result = await toggleActiveAction(id, !currentlyActive);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(currentlyActive ? 'Client disabled' : 'Client activated');
      }
    } finally {
      setPendingToggleId(null);
    }
  }

  const desktopView = (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Portal Access</TableHead>
            <TableHead className="w-[90px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const bal = balancesByClient[client.id];
            const outstanding = bal?.outstanding ?? 0;
            const overdue = bal?.overdue ?? 0;
            const waDigits = normalizeSAPhoneNumber(client.phone);
            const displayName = client.businessName || client.name;
            const showContactSubtitle =
              Boolean(client.businessName) && client.businessName !== client.name;

            return (
              <TableRow
                key={client.id}
                className={`cursor-pointer ${!client.isActive ? 'opacity-60' : ''}`}
                onClick={() => router.push('/relationships/clients/' + client.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm">{displayName}</span>
                    {client.isRetainer && (
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase h-5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      >
                        Retainer
                      </Badge>
                    )}
                    {client.divisionName && (
                      <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                        {client.divisionName}
                      </Badge>
                    )}
                  </div>
                  {showContactSubtitle && (
                    <div className="text-xs text-muted-foreground mt-0.5">{client.name}</div>
                  )}
                </TableCell>

                <TableCell className="text-xs">
                  {client.email ? (
                    <div className="text-foreground truncate max-w-[220px]">{client.email}</div>
                  ) : (
                    <div className="text-muted-foreground italic">No email</div>
                  )}
                  {client.phone && (
                    <div className="text-muted-foreground mt-0.5">{client.phone}</div>
                  )}
                </TableCell>

                <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                  {outstanding > 0 ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span
                        className={`text-sm font-semibold ${
                          overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                        }`}
                      >
                        {formatZAR(outstanding)}
                      </span>
                      {overdue > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                          {formatZAR(overdue)} overdue
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Settled</span>
                  )}
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <PortalStatusCell client={client} />
                </TableCell>

                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {waDigits && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                            <a
                              href={`https://wa.me/${waDigits}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`WhatsApp ${displayName}`}
                            >
                              <MessageCircle className="h-4 w-4 text-emerald-600" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open WhatsApp chat</TooltipContent>
                      </Tooltip>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Actions for ${displayName}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/relationships/clients/${client.id}`}>
                            <ExternalLink className="h-3.5 w-3.5 mr-2" /> View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/billing/invoices/new?clientId=${client.id}`}>
                            <Receipt className="h-3.5 w-3.5 mr-2" /> New Invoice
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/billing/statements/${client.id}`}>
                            <FileText className="h-3.5 w-3.5 mr-2" /> View Statement
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={pendingToggleId === client.id}
                          onClick={() => handleToggleActive(client.id, client.isActive)}
                        >
                          {client.isActive ? (
                            <>
                              <PowerOff className="h-3.5 w-3.5 mr-2" /> Disable Client
                            </>
                          ) : (
                            <>
                              <Power className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Activate
                              Client
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={client.incomeCount > 0}
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(client.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          {client.incomeCount > 0 ? 'Delete (has income)' : 'Delete Client'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const mobileView = (
    <div className="flex flex-col gap-3">
      {clients.map((client) => {
        const bal = balancesByClient[client.id];
        const outstanding = bal?.outstanding ?? 0;
        const overdue = bal?.overdue ?? 0;
        const waDigits = normalizeSAPhoneNumber(client.phone);
        const displayName = client.businessName || client.name;

        return (
          <div
            key={client.id}
            className={`relative flex flex-col p-4 border border-border rounded-lg bg-card shadow-sm transition-shadow ${!client.isActive ? 'opacity-60' : ''}`}
          >
            <div
              className="absolute inset-0 cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => router.push('/relationships/clients/' + client.id)}
              role="button"
              tabIndex={0}
              aria-label={`View client ${displayName}`}
            />
            <div className="flex justify-between items-start gap-2 mb-2 relative z-10">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-foreground leading-tight">{displayName}</p>
                  {client.isRetainer && (
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase h-5 bg-blue-500/10 text-blue-600 border-blue-500/20"
                    >
                      Retainer
                    </Badge>
                  )}
                  {client.divisionName && (
                    <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                      {client.divisionName}
                    </Badge>
                  )}
                </div>
                {client.businessName && client.businessName !== client.name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{client.name}</p>
                )}
              </div>

              {outstanding > 0 && (
                <div className="text-right font-mono shrink-0">
                  <div
                    className={`text-sm font-semibold ${
                      overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                    }`}
                  >
                    {formatZAR(outstanding)}
                  </div>
                  {overdue > 0 && (
                    <div className="text-[10px] text-rose-600 dark:text-rose-400">overdue</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mb-3 relative z-10">
              {client.email && <div className="truncate">{client.email}</div>}
              {client.phone && <div>{client.phone}</div>}
            </div>

            <div className="flex justify-between items-center text-sm border-t border-border/50 pt-3 relative z-10">
              <PortalStatusCell client={client} />

              <div className="flex items-center gap-1">
                {waDigits && (
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp ${displayName}`}
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pendingToggleId === client.id}
                  onClick={() => handleToggleActive(client.id, client.isActive)}
                >
                  {client.isActive ? (
                    <PowerOff className="text-muted-foreground size-4" />
                  ) : (
                    <Power className="text-green-500 size-4" />
                  )}
                  <span className="sr-only">{client.isActive ? 'Disable' : 'Activate'}</span>
                </Button>
                {client.incomeCount === 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteId(client.id)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={handleDelete}
        title="Delete client?"
        description="This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
      <DataList desktop={desktopView} mobile={mobileView} />
    </>
  );
}

function PortalStatusCell({ client }: { client: ClientWithIncomeCount }) {
  const [isSending, setIsSending] = React.useState(false);
  const router = useRouter();

  const handleInvite = async () => {
    if (!client.email) {
      toast.error('Client does not have an email address.');
      return;
    }
    setIsSending(true);
    try {
      const res = await sendPortalInvitation(client.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          client.portalInvitationSentAt ? 'Portal invitation resent!' : 'Portal invitation sent!',
        );
        router.refresh();
      }
    } catch (err: unknown) {
      console.error('handleInvite failed:', err);
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  if (client.userId) {
    return (
      <Badge
        variant="secondary"
        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-none"
      >
        Registered
      </Badge>
    );
  }

  if (client.portalInvitationSentAt) {
    const sentDate = new Date(client.portalInvitationSentAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
    return (
      <div className="flex items-center gap-1.5">
        <Badge
          variant="secondary"
          className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-none"
        >
          Invited ({sentDate})
        </Badge>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              disabled={isSending}
              onClick={handleInvite}
            >
              {isSending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resend Invitation</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs px-2.5 gap-1"
      disabled={isSending || !client.email}
      onClick={handleInvite}
    >
      {isSending ? (
        <>
          <Loader2 className="size-3 animate-spin mr-1" />
          Inviting
        </>
      ) : (
        <>
          <Mail className="size-3 mr-1" />
          Invite
        </>
      )}
    </Button>
  );
}
