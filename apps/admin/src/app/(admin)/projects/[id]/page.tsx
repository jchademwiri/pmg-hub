import { notFound } from 'next/navigation';
import { db, projectScheduleEntries, getAllClients, getAllDivisions } from '@pmg/db';
import { eq } from 'drizzle-orm';
import { getProjectChecklist } from '@pmg/db';
import { ProjectDetailsClient } from './project-details-client';
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
    title: project ? project.projectReference : 'Project Details',
  };
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
