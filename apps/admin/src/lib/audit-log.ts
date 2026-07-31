import { db, desc, session, user, invoices, invitations, quotations, eq, sql } from '@pmg/db';

export interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  ip: string;
  createdAt: Date;
}

export interface UserSessionEntry {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
  ipAddress: string;
}

function formatIp(ip?: string | null): string {
  if (!ip) return 'Dashboard';
  if (
    ip === '0000:0000:0000:0000:0000:0000:0000:0000' ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip === '::'
  ) {
    return 'Localhost';
  }
  return ip;
}

/** Fetches sign-in history logs from session records */
export async function getSignInLogs(limit = 100): Promise<AuditLogEntry[]> {
  const entries: AuditLogEntry[] = [];

  try {
    const dbSessions = await db
      .select({
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        userName: user.name,
        userEmail: user.email,
      })
      .from(session)
      .leftJoin(user, eq(session.userId, user.id))
      .orderBy(desc(session.createdAt))
      .limit(limit);

    for (const s of dbSessions) {
      entries.push({
        id: `session-${s.id}`,
        action: 'Signed in',
        user: s.userName || s.userEmail || 'System User',
        timestamp: s.createdAt ? new Date(s.createdAt).toLocaleString() : 'Recently',
        ip: formatIp(s.ipAddress),
        createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
      });
    }
  } catch (err) {
    console.error('Failed to fetch sign in logs:', err);
  }

  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Fetches system actions audit logs (Invoices, Quotes, Invitations) */
export async function getSystemAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const entries: AuditLogEntry[] = [];

  try {
    // 1. Invoices created
    const dbInvoices = await db
      .select({
        id: invoices.id,
        documentNumber: invoices.documentNumber,
        createdAt: invoices.createdAt,
        createdBy: invoices.createdBy,
        creatorName: user.name,
        creatorEmail: user.email,
      })
      .from(invoices)
      .leftJoin(user, eq(invoices.createdBy, user.id))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);

    for (const inv of dbInvoices) {
      entries.push({
        id: `invoice-${inv.id}`,
        action: `Invoice created (${inv.documentNumber})`,
        user: inv.creatorName || inv.creatorEmail || inv.createdBy || 'Admin',
        timestamp: inv.createdAt ? new Date(inv.createdAt).toLocaleString() : 'Recently',
        ip: 'Dashboard',
        createdAt: inv.createdAt ? new Date(inv.createdAt) : new Date(),
      });
    }
  } catch (err) {
    console.error('Failed to fetch invoice audit log:', err);
  }

  try {
    // 2. User invitations sent
    const dbInvitations = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        createdAt: invitations.createdAt,
        inviterName: user.name,
        inviterEmail: user.email,
      })
      .from(invitations)
      .leftJoin(user, sql`${invitations.invitedBy}::text = ${user.id}`)
      .orderBy(desc(invitations.createdAt))
      .limit(limit);

    for (const inv of dbInvitations) {
      entries.push({
        id: `invite-${inv.id}`,
        action: `User invited (${inv.email} - ${inv.role})`,
        user: inv.inviterName || inv.inviterEmail || 'Admin',
        timestamp: inv.createdAt ? new Date(inv.createdAt).toLocaleString() : 'Recently',
        ip: 'Dashboard',
        createdAt: inv.createdAt ? new Date(inv.createdAt) : new Date(),
      });
    }
  } catch (err) {
    console.error('Failed to fetch invitation audit log:', err);
  }

  try {
    // 3. Quotations created
    const dbQuotes = await db
      .select({
        id: quotations.id,
        documentNumber: quotations.documentNumber,
        createdAt: quotations.createdAt,
        createdBy: quotations.createdBy,
        creatorName: user.name,
        creatorEmail: user.email,
      })
      .from(quotations)
      .leftJoin(user, eq(quotations.createdBy, user.id))
      .orderBy(desc(quotations.createdAt))
      .limit(limit);

    for (const q of dbQuotes) {
      entries.push({
        id: `quote-${q.id}`,
        action: `Quotation created (${q.documentNumber})`,
        user: q.creatorName || q.creatorEmail || q.createdBy || 'Admin',
        timestamp: q.createdAt ? new Date(q.createdAt).toLocaleString() : 'Recently',
        ip: 'Dashboard',
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
      });
    }
  } catch (err) {
    console.error('Failed to fetch quotation audit log:', err);
  }

  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getActiveSessions(limit = 100): Promise<UserSessionEntry[]> {
  try {
    const dbSessions = await db
      .select({
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        userId: session.userId,
        userName: user.name,
      })
      .from(session)
      .leftJoin(user, eq(session.userId, user.id))
      .orderBy(desc(session.updatedAt))
      .limit(limit);

    if (dbSessions.length === 0) {
      return [
        {
          id: 'current-session',
          device: 'Current Web Session',
          location: 'Active now',
          lastActive: 'Now',
          current: true,
          ipAddress: '127.0.0.1',
        },
      ];
    }

    return dbSessions.map((s, index) => {
      let device = 'Web Browser';
      if (s.userAgent) {
        if (s.userAgent.includes('Windows')) device = 'Chrome on Windows';
        else if (s.userAgent.includes('Mac')) device = 'Safari on macOS';
        else if (s.userAgent.includes('iPhone') || s.userAgent.includes('Android')) device = 'Mobile Browser';
      }

      return {
        id: s.id,
        device: `${device} (${s.userName || 'User'})`,
        location: formatIp(s.ipAddress),
        lastActive: s.updatedAt ? new Date(s.updatedAt).toLocaleString() : 'Recently',
        current: index === 0,
        ipAddress: formatIp(s.ipAddress),
      };
    });
  } catch (err) {
    console.error('Failed to fetch active sessions:', err);
    return [
      {
        id: 'current-session',
        device: 'Current Web Session',
        location: 'Active now',
        lastActive: 'Now',
        current: true,
        ipAddress: 'Localhost',
      },
    ];
  }
}
