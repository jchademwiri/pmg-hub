import type { Metadata } from 'next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getClientsWithBillingActivity, getAgingReport } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { SendOverdueRemindersButton } from '@/components/billing/send-overdue-reminders-button';
import { ShieldCheck, Clock, AlertTriangle, AlertCircle, LucideIcon } from 'lucide-react';
import { StatementsClient } from './statements-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Statements' };

const BUCKET_THEMES: Record<string, { colorClass: string; bgClass: string; borderClass: string; icon: LucideIcon }> = {
  current: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/5',
    borderClass: 'border-emerald-500/20',
    icon: ShieldCheck,
  },
  '1_14': {
    colorClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-500/5',
    borderClass: 'border-amber-500/20',
    icon: Clock,
  },
  '15_30': {
    colorClass: 'text-orange-500 dark:text-orange-400',
    bgClass: 'bg-orange-500/5',
    borderClass: 'border-orange-500/20',
    icon: Clock,
  },
  '31_60': {
    colorClass: 'text-rose-500 dark:text-rose-400',
    bgClass: 'bg-rose-500/5',
    borderClass: 'border-rose-500/20',
    icon: AlertTriangle,
  },
  '61_plus': {
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/5',
    borderClass: 'border-red-500/20',
    icon: AlertCircle,
  },
};

export default async function StatementsPage() {
  const now = new Date();
  const currentFY = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();

  const [clients, agingReport] = await Promise.all([
    getClientsWithBillingActivity({ year: currentFY }),
    getAgingReport(),
  ]);

  const totalOutstanding = clients.reduce((s, c) => s + c.totalOutstanding, 0);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(totalOutstanding)} variant="amber" />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Statements</h2>
          <p className="text-sm text-muted-foreground">View account statements per client</p>
        </div>
        <div className="flex items-center gap-2">
          <SendOverdueRemindersButton />
        </div>
      </div>

      {/* Accounts Receivable Ageing Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Aged Receivables Summary
          </h3>
          <span className="text-xs text-muted-foreground font-medium bg-muted border border-border px-2.5 py-1 rounded-full">
            Total Outstanding: <span className="font-semibold text-foreground">{formatZAR(totalOutstanding)}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {agingReport.map((r) => {
            const theme = BUCKET_THEMES[r.bucket] || BUCKET_THEMES.current;
            const Icon = theme.icon;
            const hasTotal = r.total > 0;

            return (
              <Card
                key={r.bucket}
                size="sm"
                className={`rounded-xl border transition-all duration-200 hover:shadow-sm ${theme.borderClass} ${theme.bgClass} shadow-none`}
              >
                <CardHeader className="pb-1.5 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.colorClass} opacity-85`}>
                      {r.label}
                    </span>
                    <Icon className={`size-3.5 ${theme.colorClass}`} />
                  </div>
                </CardHeader>
                <CardContent className="pb-4 pt-1 px-4 space-y-1">
                  <p className="text-2xl font-bold tabular-nums tracking-tight">
                    {formatZAR(r.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className={hasTotal ? 'font-medium text-foreground/75' : 'opacity-55'}>
                      {r.count} {r.count === 1 ? 'invoice' : 'invoices'}
                    </span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Client Statements Table */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Client Statements</h3>
          <p className="text-xs text-muted-foreground">Select a client to view their full account statement</p>
        </div>
        <StatementsClient initialClients={clients} />
      </div>
    </div>
  );
}
