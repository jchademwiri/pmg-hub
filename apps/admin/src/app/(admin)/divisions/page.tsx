import type { Metadata } from 'next';
import { getDivisionsWithStats } from '@pmg/db';
import {
  createDivision,
  updateDivision,
  deleteDivision,
  toggleDivisionActive,
} from '@/app/actions/divisions';
import DivisionsPageClient from './divisions-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Divisions' };

export default async function DivisionsPage() {
  const divisions = await getDivisionsWithStats();

  return (
    <DivisionsPageClient
      divisions={divisions}
      createAction={createDivision}
      updateAction={updateDivision}
      deleteAction={deleteDivision}
      toggleActiveAction={toggleDivisionActive}
    />
  );
}
