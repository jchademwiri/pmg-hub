import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { getDivisionsWithStats } from '@pmg/db';
import {
  createDivision,
  updateDivision,
  deleteDivision,
  toggleDivisionActive,
} from '@/app/actions/divisions';
import { DivisionAddForm } from '@/components/divisions/division-add-form';
import { DivisionsTable } from '@/components/divisions/divisions-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Divisions' };

export default async function DivisionsPage() {
  const divisions = await getDivisionsWithStats();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Divisions</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add Division
        </Button>
      </div>

      <DivisionAddForm createAction={createDivision} />

      {divisions.length === 0 ? (
        <EmptyState
          message="No divisions yet."
          ctaLabel="Add Division"
          ctaHref="#division-add-form"
        />
      ) : (
        <DivisionsTable
          divisions={divisions}
          updateAction={updateDivision}
          deleteAction={deleteDivision}
          toggleActiveAction={toggleDivisionActive}
        />
      )}
    </div>
  );
}
