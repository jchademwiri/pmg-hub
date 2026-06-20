import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserPlus, Users } from 'lucide-react';
import { getDb, sql } from '@pmg/db';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';
import { UserTable } from '@/components/users/user-table';
import type { UserRow } from '@/components/users/user-table';
import { PendingInvitationsTable } from '@/components/users/pending-invitations-table';
import type { PendingInvitationRow } from '@/components/users/pending-invitations-table';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';

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
  const activeUsers = users.filter((user) => user.isActive).length;
  const adminUsers = users.filter((user) => user.role === 'admin' || user.role === 'super_admin').length;

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Users"
        description="Manage organisation users, roles, and pending invitations"
        icon={Users}
        actions={
          <Button asChild size="sm">
            <Link href="/settings/users/invite">
              <UserPlus data-icon="inline-start" />
              Invite User
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>{activeUsers}</CardTitle>
            <CardDescription>Active users</CardDescription>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>{pending.length}</CardTitle>
            <CardDescription>Pending invitations</CardDescription>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>{adminUsers}</CardTitle>
            <CardDescription>Admin users</CardDescription>
          </CardHeader>
        </Card>
      </div>
      {pending && pending.length > 0 && <PendingInvitationsTable pending={pending} />}
      <UserTable users={users} />
    </div>
  );
}
