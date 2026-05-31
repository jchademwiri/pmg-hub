import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb, sql } from '@pmg/db';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';
import { UserTable } from '@/components/users/user-table';
import type { UserRow } from '@/components/users/user-table';
import { PendingInvitationsTable } from '@/components/users/pending-invitations-table';
import type { PendingInvitationRow } from '@/components/users/pending-invitations-table';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Users' };

export default async function UsersPage() {
  const session = await getSessionOrRedirect();

  if (!requireRole(session, 'super_admin')) {
    notFound();
  }

  const db = getDb();
  const result = await db.execute(
    sql`SELECT id, name, email, role, is_active AS "isActive" FROM "user" ORDER BY created_at DESC`,
  );
  const users = result.rows as unknown as UserRow[];

  const pendingResult = await db.execute(
    sql`SELECT id, name, email, role, expires_at AS "expiresAt" FROM "invitations" WHERE accepted_at IS NULL ORDER BY created_at DESC`,
  );
  const pending = pendingResult.rows as unknown as PendingInvitationRow[];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Manage organization users, roles, and pending invitations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/settings/users/invite">Invite User</Link>
          </Button>
        </div>
      </div>
      {pending && pending.length > 0 && <PendingInvitationsTable pending={pending} />}
      <UserTable users={users} />
    </div>
  );
}
