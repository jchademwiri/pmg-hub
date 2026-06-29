import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { db, tenderScheduleEntries, getTendersProgressMap } from '@pmg/db';
import { eq, and, ne, asc } from 'drizzle-orm';
import { ProjectsListClient } from './projects-list-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Projects' };

export default async function PortalProjectsPage() {
  const { client } = await getPortalSessionOrRedirect();

  // Fetch only this client's non-cancelled projects
  const projects = await db
    .select()
    .from(tenderScheduleEntries)
    .where(
      and(
        eq(tenderScheduleEntries.clientId, client.id),
        ne(tenderScheduleEntries.status, 'cancelled')
      )
    )
    .orderBy(asc(tenderScheduleEntries.sortOrder));

  // Fetch progress stats
  const progressMap = await getTendersProgressMap(projects.map((p) => p.id));
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
