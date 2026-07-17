'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientAddForm } from '@/components/clients/client-add-form';
import { ClientsTable } from '@/components/clients/clients-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { ClientWithIncomeCount } from '@pmg/db';

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

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">Manage client relationships, billing details, and outstanding balances</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm" className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" /> Add Client
          </Button>
        </div>
      </div>

      {/* Mobile FAB */}
      {!isAdding && (
        <Button 
          onClick={() => setIsAdding(true)} 
          size="icon" 
          className="md:hidden fixed bottom-20 right-4 z-50 rounded-full shadow-lg h-14 w-14"
        >
          <Plus className="size-6" />
        </Button>
      )}

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Add New Client</h3>
            <p className="text-xs text-muted-foreground">Create a new client profile for billing and activity tracking</p>
          </div>
          <ClientAddForm
            divisions={divisions}
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {/* Table or empty state */}
      {clients.length === 0 && !isAdding ? (
        <EmptyState message="No clients yet." />
      ) : (
        <ClientsTable
          clients={clients}
          deleteAction={deleteAction}
          toggleActiveAction={toggleActiveAction}
        />
      )}
    </div>
  );
}
