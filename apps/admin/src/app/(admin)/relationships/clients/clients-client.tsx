'use client';

import * as React from 'react';
import { Plus, Users, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClientAddForm } from '@/components/clients/client-add-form';
import { ClientsTable } from '@/components/clients/clients-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { ClientWithIncomeCount } from '@pmg/db';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ClientsPageClientProps {
  clients: ClientWithIncomeCount[];
  divisions: { id: string; name: string }[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

export default function ClientsPageClient({
  clients,
  divisions,
  createAction,
  deleteAction,
  toggleActiveAction,
}: ClientsPageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [statusTab, setStatusTab] = React.useState('active');

  const activeClients = React.useMemo(() => clients.filter((c) => c.isActive), [clients]);
  const inactiveClients = React.useMemo(() => clients.filter((c) => !c.isActive), [clients]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage client relationships, billing details, and outstanding balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAdding(true)} size="sm" className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" /> Add Client
          </Button>
        </div>
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
              {activeClients.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive" className="gap-2">
            <UserX className="size-4" />
            <span>Inactive</span>
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-xs h-5 bg-muted text-muted-foreground border-border"
            >
              {inactiveClients.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Users className="size-4" />
            <span>All</span>
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-xs h-5 bg-muted text-muted-foreground border-border"
            >
              {clients.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeClients.length === 0 && !isAdding ? (
            <EmptyState message="No active clients found." />
          ) : (
            <ClientsTable
              clients={activeClients}
              deleteAction={deleteAction}
              toggleActiveAction={toggleActiveAction}
            />
          )}
        </TabsContent>

        <TabsContent value="inactive">
          {inactiveClients.length === 0 ? (
            <EmptyState message="No inactive clients." />
          ) : (
            <ClientsTable
              clients={inactiveClients}
              deleteAction={deleteAction}
              toggleActiveAction={toggleActiveAction}
            />
          )}
        </TabsContent>

        <TabsContent value="all">
          {clients.length === 0 && !isAdding ? (
            <EmptyState message="No clients yet." />
          ) : (
            <ClientsTable
              clients={clients}
              deleteAction={deleteAction}
              toggleActiveAction={toggleActiveAction}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
