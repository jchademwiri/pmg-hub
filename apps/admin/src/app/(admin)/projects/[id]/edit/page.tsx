import { notFound } from 'next/navigation';
import { db, projectScheduleEntries, getAllClients, getAllDivisions } from '@pmg/db';
import { eq } from 'drizzle-orm';
import { ProjectForm } from '@/components/projects/project-form';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [project] = await db
    .select({ projectReference: projectScheduleEntries.projectReference })
    .from(projectScheduleEntries)
    .where(eq(projectScheduleEntries.id, id))
    .limit(1);

  return {
    title: project ? `Edit ${project.projectReference}` : 'Edit Project',
  };
}

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projectScheduleEntries)
    .where(eq(projectScheduleEntries.id, id))
    .limit(1);

  if (!project) {
    notFound();
  }

  const [clients, divisions] = await Promise.all([
    getAllClients(),
    getAllDivisions(),
  ]);

  return (
    <div className="max-w-5xl mx-auto p-6 bg-card border border-border/50 rounded-xl shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Edit Project: {project.projectReference}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Modify the tender schedule entry details below.
        </p>
      </div>
      <ProjectForm clients={clients} divisions={divisions} project={project} />
    </div>
  );
}
