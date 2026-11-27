'use client';

import * as React from 'react';
import {
  Plus,
  Users,
  UserCheck,
  UserX,
  Search,
  Wallet,
  Repeat,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { ClientAddForm } from '@/components/clients/client-add-form';
import { ClientsTable } from '@/components/clients/clients-table';
import { EmptyState } from '@/components/ui/empty-state';
import { useOpenOnNewParam } from '@/hooks/use-open-on-new-param';
import { formatZAR } from '@/lib/format';
import type { ClientWithIncomeCount } from '@pmg/db';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ClientBalanceSummary {
  outstanding: number;
  overdue: number;
}

type QuickFilter = 'all' | 'retainer' | 'with_balance' | 'overdue' | 'portal';
type SortMode = 'name_asc' | 'balance_desc' | 'division_asc';

interface ClientsPageClientProps {
  clients: ClientWithIncomeCount[];
  divisions: { id: string; name: string }[];
  balancesByClient?: Record<string, ClientBalanceSummary>;
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

export default function ClientsPageClient({
  clients,
  divisions,
  balancesByClient = {},
  createAction,
  deleteAction,
  toggleActiveAction,
}: ClientsPageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);
  useOpenOnNewParam(setIsAdding);
  const [statusTab, setStatusTab] = React.useState('active');
  const [search, setSearch] = React.useState('');
  const [divisionFilter, setDivisionFilter] = React.useState('all');
  const [quickFilter, setQuickFilter] = React.useState<QuickFilter>('all');
  const [sortMode, setSortMode] = React.useState<SortMode>('name_asc');

  const activeClients = React.useMemo(() => clients.filter((c) => c.isActive), [clients]);
  const inactiveClients = React.useMemo(() => clients.filter((c) => !c.isActive), [clients]);

  const kpis = React.useMemo(() => {
    let retainerCount = 0;
    let portalRegistered = 0;
    let portalInvited = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let clientsWithBalance = 0;

    for (const c of activeClients) {
      if (c.isRetainer) retainerCount += 1;
      if (c.userId) portalRegistered += 1;
      else if (c.portalInvitationSentAt) portalInvited += 1;

      const bal = balancesByClient[c.id];
      if (bal && bal.outstanding > 0) {
        clientsWithBalance += 1;
        totalOutstanding += bal.outstanding;
        totalOverdue += bal.overdue;
      }
    }

    return {
      retainerCount,
      portalRegistered,
      portalInvited,
      totalOutstanding,
      totalOverdue,
      clientsWithBalance,
    };
  }, [activeClients, balancesByClient]);

  const applyFiltersAndSort = React.useCallback(
    (list: ClientWithIncomeCount[]) => {
      const q = search.trim().toLowerCase();
      const filtered = list.filter((c) => {
        if (divisionFilter !== 'all' && c.divisionId !== divisionFilter) return false;
        const bal = balancesByClient[c.id];
        if (quickFilter === 'retainer' && !c.isRetainer) return false;
        if (quickFilter === 'with_balance' && !(bal && bal.outstanding > 0)) return false;
        if (quickFilter === 'overdue' && !(bal && bal.overdue > 0)) return false;
        if (quickFilter === 'portal' && !c.userId) return false;

        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.businessName ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          (c.phone ?? '').toLowerCase().includes(q) ||
          (c.divisionName ?? '').toLowerCase().includes(q)
        );
      });

      return [...filtered].sort((a, b) => {
        if (sortMode === 'balance_desc') {
          const balA = balancesByClient[a.id]?.outstanding ?? 0;
          const balB = balancesByClient[b.id]?.outstanding ?? 0;
          if (balB !== balA) return balB - balA;
        }
        if (sortMode === 'division_asc') {
          const divCmp = (a.divisionName ?? 'zzz').localeCompare(b.divisionName ?? 'zzz');
          if (divCmp !== 0) return divCmp;
        }
        const labelA = (a.businessName || a.name).toLowerCase();
        const labelB = (b.businessName || b.name).toLowerCase();
        return labelA.localeCompare(labelB);
      });
    },
    [search, divisionFilter, quickFilter, sortMode, balancesByClient],
  );

  const filteredActive = React.useMemo(
    () => applyFiltersAndSort(activeClients),
    [applyFiltersAndSort, activeClients],
  );
  const filteredInactive = React.useMemo(
    () => applyFiltersAndSort(inactiveClients),
    [applyFiltersAndSort, inactiveClients],
  );
  const filteredAll = React.useMemo(
    () => applyFiltersAndSort(clients),
    [applyFiltersAndSort, clients],
  );

  const hasActiveFilters =
    search.trim().length > 0 || divisionFilter !== 'all' || quickFilter !== 'all';

  function clearAllFilters() {
    setSearch('');
    setDivisionFilter('all');
    setQuickFilter('all');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage client relationships, billing details, portal access, and outstanding balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAdding(true)} size="sm" className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" /> Add Client
          </Button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BillingKpiCard
          title="Active Clients"
          value={activeClients.length}
          subtitle={`${inactiveClients.length} inactive · ${clients.length} total`}
          icon={UserCheck}
          variant="emerald"
          isActive={statusTab === 'active' && quickFilter === 'all'}
          onClick={() => {
            setStatusTab('active');
            setQuickFilter('all');
          }}
        />
        <BillingKpiCard
          title="Retainer Clients"
          value={kpis.retainerCount}
          subtitle={
            quickFilter === 'retainer' ? 'Filtered to retainers' : 'Click to filter retainers'
          }
          icon={Repeat}
          variant="blue"
          isActive={quickFilter === 'retainer'}
          onClick={() => {
            setStatusTab('active');
            setQuickFilter((prev) => (prev === 'retainer' ? 'all' : 'retainer'));
          }}
        />
        <BillingKpiCard
          title="Outstanding AR"
          value={formatZAR(kpis.totalOutstanding)}
          subtitle={
            kpis.totalOverdue > 0
              ? `${kpis.clientsWithBalance} client${kpis.clientsWithBalance === 1 ? '' : 's'} · ${formatZAR(kpis.totalOverdue)} overdue`
              : `${kpis.clientsWithBalance} client${kpis.clientsWithBalance === 1 ? '' : 's'} with open balance`
          }
          icon={Wallet}
          variant={kpis.totalOverdue > 0 ? 'rose' : 'amber'}
          valueClassName={kpis.totalOverdue > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
          isActive={quickFilter === 'with_balance'}
          onClick={() => {
            setStatusTab('active');
            setQuickFilter((prev) => (prev === 'with_balance' ? 'all' : 'with_balance'));
            setSortMode('balance_desc');
          }}
        />
        <BillingKpiCard
          title="Portal Adoption"
          value={`${kpis.portalRegistered} / ${activeClients.length}`}
          subtitle={`${kpis.portalInvited} invited · ${Math.max(0, activeClients.length - kpis.portalRegistered - kpis.portalInvited)} not invited`}
          icon={ShieldCheck}
          variant="violet"
          isActive={quickFilter === 'portal'}
          onClick={() => {
            setStatusTab('active');
            setQuickFilter((prev) => (prev === 'portal' ? 'all' : 'portal'));
          }}
        />
      </div>

      {/* Mobile FAB */}
      <Button
        onClick={() => setIsAdding(true)}
        size="icon"
        className="md:hidden fixed bottom-20 right-4 z-50 rounded-full shadow-lg h-14 w-14"
      >
        <Plus className="size-6" />
      </Button>

      {/* Add Client Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client profile for billing and activity tracking
            </DialogDescription>
          </DialogHeader>
          <ClientAddForm
            divisions={divisions}
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
            onCancel={() => setIsAdding(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Search, Division & Quick Filter Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              placeholder="Search by client, business, email, phone, or division..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {divisions.length > 0 && (
            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue placeholder="All Divisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[175px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Sort: Name (A–Z)</SelectItem>
              <SelectItem value="balance_desc">Sort: Highest Balance</SelectItem>
              <SelectItem value="division_asc">Sort: Division</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={clearAllFilters}>
              Clear filters <X className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'retainer', label: 'Retainers' },
              { id: 'with_balance', label: 'With Balance' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'portal', label: 'Portal Registered' },
            ] as const
          ).map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setQuickFilter(pill.id)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                quickFilter === pill.id
                  ? 'bg-primary text-primary-foreground border-primary font-medium'
                  : 'bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Segmented Status Tabs */}
      <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="active" className="gap-2">
            <UserCheck className="size-4" />
            <span>Active</span>
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-xs h-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            >
              {filteredActive.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive" className="gap-2">
            <UserX className="size-4" />
            <span>Inactive</span>
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-xs h-5 bg-muted text-muted-foreground border-border"
            >
              {filteredInactive.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Users className="size-4" />
            <span>All</span>
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-xs h-5 bg-muted text-muted-foreground border-border"
            >
              {filteredAll.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {filteredActive.length === 0 && !isAdding ? (
            <EmptyState
              message={
                hasActiveFilters
                  ? 'No active clients match your current filters.'
                  : 'No active clients found.'
              }
            />
          ) : (
            <ClientsTable
              clients={filteredActive}
              balancesByClient={balancesByClient}
              deleteAction={deleteAction}
              toggleActiveAction={toggleActiveAction}
            />
          )}
        </TabsContent>

        <TabsContent value="inactive">
          {filteredInactive.length === 0 ? (
            <EmptyState
              message={
                hasActiveFilters
                  ? 'No inactive clients match your current filters.'
                  : 'No inactive clients.'
              }
            />
          ) : (
            <ClientsTable
              clients={filteredInactive}
              balancesByClient={balancesByClient}
              deleteAction={deleteAction}
              toggleActiveAction={toggleActiveAction}
            />
          )}
        </TabsContent>

        <TabsContent value="all">
          {filteredAll.length === 0 && !isAdding ? (
            <EmptyState
              message={
                hasActiveFilters ? 'No clients match your current filters.' : 'No clients yet.'
              }
            />
          ) : (
            <ClientsTable
              clients={filteredAll}
              balancesByClient={balancesByClient}
              deleteAction={deleteAction}
              toggleActiveAction={toggleActiveAction}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
