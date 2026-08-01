import { db, session, user, invoices, invitations, quotations } from '@pmg/db';
import { count, gte, and, eq, desc, sql } from 'drizzle-orm';

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

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export type DateRangeOption = 'all' | 'today' | '7days' | '30days';

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

function getDateBoundary(range: DateRangeOption): Date | null {
  const now = new Date();
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === '7days') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === '30days') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

/** DB-Layer Paginated & Date-Filtered Sign-In Logs */
export async function getPaginatedSignInLogs({
  page = 1,
  pageSize = 5,
  dateRange = 'all',
}: {
  page?: number;
  pageSize?: number;
  dateRange?: DateRangeOption;
}): Promise<PaginatedResult<AuditLogEntry>> {
  const dateBoundary = getDateBoundary(dateRange);
  const offset = (page - 1) * pageSize;

  const whereClause = dateBoundary ? gte(session.createdAt, dateBoundary) : undefined;

  try {
    // 1. Count total sign-in records at DB level
    const countResult = await db
      .select({ total: count() })
      .from(session)
      .where(whereClause);
    const totalCount = Number(countResult[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // 2. Fetch page slice at DB level using LIMIT and OFFSET
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
      .where(whereClause)
      .orderBy(desc(session.createdAt))
      .limit(pageSize)
      .offset(offset);

    const data: AuditLogEntry[] = dbSessions.map((s) => ({
      id: `session-${s.id}`,
      action: 'Signed in',
      user: s.userName || s.userEmail || 'System User',
      timestamp: s.createdAt ? new Date(s.createdAt).toLocaleString() : 'Recently',
      ip: formatIp(s.ipAddress),
      createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
    }));

    return {
      data,
      totalCount,
      totalPages,
      page,
      pageSize,
    };
  } catch (err) {
    console.error('Failed to fetch paginated sign in logs:', err);
    return { data: [], totalCount: 0, totalPages: 1, page: 1, pageSize };
  }
}

/** DB-Layer Paginated & Date-Filtered System Audit Logs (Invoices, Quotes, Invitations) */
export async function getPaginatedSystemAuditLogs({
  page = 1,
  pageSize = 5,
  dateRange = 'all',
}: {
  page?: number;
  pageSize?: number;
  dateRange?: DateRangeOption;
}): Promise<PaginatedResult<AuditLogEntry>> {
  const dateBoundary = getDateBoundary(dateRange);
  const entries: AuditLogEntry[] = [];

  try {
    const invWhere = dateBoundary ? gte(invoices.createdAt, dateBoundary) : undefined;
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
      .where(invWhere)
      .orderBy(desc(invoices.createdAt))
      .limit(50);

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

    const inviteWhere = dateBoundary ? gte(invitations.createdAt, dateBoundary) : undefined;
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
      .where(inviteWhere)
      .orderBy(desc(invitations.createdAt))
      .limit(50);

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

    const quoteWhere = dateBoundary ? gte(quotations.createdAt, dateBoundary) : undefined;
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
      .where(quoteWhere)
      .orderBy(desc(quotations.createdAt))
      .limit(50);

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

    // Sort combined entries by timestamp descending
    const sorted = entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const offset = (page - 1) * pageSize;
    const data = sorted.slice(offset, offset + pageSize);

    return {
      data,
      totalCount,
      totalPages,
      page,
      pageSize,
    };
  } catch (err) {
    console.error('Failed to fetch paginated system audit logs:', err);
    return { data: [], totalCount: 0, totalPages: 1, page: 1, pageSize };
  }
}

/** DB-Layer Paginated Active Sessions */
export async function getPaginatedActiveSessions({
  page = 1,
  pageSize = 5,
}: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<UserSessionEntry>> {
  const offset = (page - 1) * pageSize;

  try {
    const countResult = await db.select({ total: count() }).from(session);
    const totalCount = Number(countResult[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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
      .limit(pageSize)
      .offset(offset);

    if (dbSessions.length === 0 && totalCount === 0) {
      return {
        data: [
          {
            id: 'current-session',
            device: 'Current Web Session',
            location: 'Active now',
            lastActive: 'Now',
            current: true,
            ipAddress: '127.0.0.1',
          },
        ],
        totalCount: 1,
        totalPages: 1,
        page: 1,
        pageSize,
      };
    }

    const data: UserSessionEntry[] = dbSessions.map((s, index) => {
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
        current: index === 0 && page === 1,
        ipAddress: formatIp(s.ipAddress),
      };
    });

    return {
      data,
      totalCount,
      totalPages,
      page,
      pageSize,
    };
  } catch (err) {
    console.error('Failed to fetch active sessions:', err);
    return {
      data: [
        {
          id: 'current-session',
          device: 'Current Web Session',
          location: 'Active now',
          lastActive: 'Now',
          current: true,
          ipAddress: 'Localhost',
        },
      ],
      totalCount: 1,
      totalPages: 1,
      page: 1,
      pageSize,
    };
  }
}
