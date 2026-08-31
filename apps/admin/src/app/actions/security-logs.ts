'use server';

import {
  getPaginatedSignInLogs,
  getPaginatedSystemAuditLogs,
  getPaginatedActiveSessions,
  type DateRangeOption,
} from '@/lib/audit-log';

export async function fetchSignInLogsAction(params: {
  page?: number;
  pageSize?: number;
  dateRange?: DateRangeOption;
}) {
  return await getPaginatedSignInLogs(params);
}

export async function fetchSystemAuditLogsAction(params: {
  page?: number;
  pageSize?: number;
  dateRange?: DateRangeOption;
}) {
  return await getPaginatedSystemAuditLogs(params);
}

export async function fetchActiveSessionsAction(params: { page?: number; pageSize?: number }) {
  return await getPaginatedActiveSessions(params);
}
