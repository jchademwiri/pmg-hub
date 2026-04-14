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
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

export default function ClientsPageClient({
  clients,
  createAction,
  deleteAction,
  toggleActiveAction,
}: ClientsPageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Clients</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" /> Add Client
        </Button>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <ClientAddForm
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
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
