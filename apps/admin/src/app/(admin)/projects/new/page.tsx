import type { Metadata } from 'next';
import { getAllClients, getAllDivisions } from '@pmg/db';
import { ProjectForm } from '@/components/projects/project-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New Project' };

export default async function NewProjectPage() {
  const [clients, divisions] = await Promise.all([
    getAllClients(),
    getAllDivisions(),
  ]);

  return (
    <div className="max-w-5xl mx-auto p-6 bg-card border border-border/50 rounded-xl shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold">New Tender Schedule Entry</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add a tender. Start date is automatically assigned based on your queue — just set the
          closing date and effort days.
        </p>
      </div>
      <ProjectForm clients={clients} divisions={divisions} />
    </div>
  );
}
