import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { db, projectScheduleEntries, getProjectsProgressMap } from '@pmg/db';
import { eq, and, ne, asc } from 'drizzle-orm';
import { ProjectsListClient } from './projects-list-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Projects' };

export default async function PortalProjectsPage() {
  const { client } = await getPortalSessionOrRedirect();

  // Fetch only this client's non-cancelled projects
  const projects = await db
    .select()
    .from(projectScheduleEntries)
    .where(
      and(
        eq(projectScheduleEntries.clientId, client.id),
        ne(projectScheduleEntries.status, 'cancelled')
      )
    )
    .orderBy(asc(projectScheduleEntries.sortOrder));

  // Fetch progress stats
  const progressMap = await getProjectsProgressMap(projects.map((p) => p.id));
  const progressObj = Object.fromEntries(progressMap.entries());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track the real-time progress, timelines, and deliverables of your active projects.
        </p>
      </div>

      <ProjectsListClient projects={projects} progressMap={progressObj} />
    </div>
  );
}
