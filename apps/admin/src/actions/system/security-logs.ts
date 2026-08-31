'use server';

import {
  getPaginatedSignInLogs,
  getPaginatedSystemAuditLogs,
  getPaginatedActiveSessions,
  type DateRangeOption,
} from '@/lib/audit-log';
import { getSessionOrRedirect } from '@/lib/auth';

export async function fetchSignInLogsAction(params: {
  page?: number;
  pageSize?: number;
  dateRange?: DateRangeOption;
}) {
  await getSessionOrRedirect();
  return await getPaginatedSignInLogs(params);
}

export async function fetchSystemAuditLogsAction(params: {
  page?: number;
  pageSize?: number;
  dateRange?: DateRangeOption;
}) {
  await getSessionOrRedirect();
  return await getPaginatedSystemAuditLogs(params);
}

export async function fetchActiveSessionsAction(params: { page?: number; pageSize?: number }) {
  await getSessionOrRedirect();
  return await getPaginatedActiveSessions(params);
}
