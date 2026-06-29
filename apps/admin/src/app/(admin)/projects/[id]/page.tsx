import { notFound } from 'next/navigation';
import { db, projectScheduleEntries, getAllClients, getAllDivisions } from '@pmg/db';
import { eq } from 'drizzle-orm';
import { getProjectChecklist } from '@pmg/db';
import { ProjectDetailsClient } from './project-details-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailsPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch project details
  const [project] = await db
    .select()
    .from(projectScheduleEntries)
    .where(eq(projectScheduleEntries.id, id))
    .limit(1);

  if (!project) {
    notFound();
  }

  const [clients, divisions, checklist] = await Promise.all([
    getAllClients(),
    getAllDivisions(),
    getProjectChecklist(id),
  ]);

  return (
    <ProjectDetailsClient
      project={project}
      clients={clients}
      divisions={divisions}
      initialChecklist={checklist}
    />
  );
}
