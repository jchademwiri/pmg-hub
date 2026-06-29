import { notFound } from 'next/navigation';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { db, tenderScheduleEntries, getTenderChecklist, getAllDivisions } from '@pmg/db';
import { eq, and } from 'drizzle-orm';
import { ProjectDetailsClient } from './project-details-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalProjectDetailsPage({ params }: PageProps) {
  const { client } = await getPortalSessionOrRedirect();
  const { id } = await params;

  // Fetch project details and verify it belongs to this client (security check)
  let project;
  try {
    const [row] = await db
      .select()
      .from(tenderScheduleEntries)
      .where(
        and(
          eq(tenderScheduleEntries.id, id),
          eq(tenderScheduleEntries.clientId, client.id)
        )
      )
      .limit(1);
    project = row;
  } catch (error: any) {
    console.error("❌ Error fetching project details in PortalProjectDetailsPage:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    throw error;
  }

  if (!project) {
    notFound();
  }

  const [divisions, checklist] = await Promise.all([
    getAllDivisions(),
    getTenderChecklist(id),
  ]);

  return (
    <ProjectDetailsClient
      project={project}
      divisions={divisions}
      initialChecklist={checklist}
    />
  );
}
