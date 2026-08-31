import type { AgingRow } from '@pmg/db';

export function summarizeAging(rows: AgingRow[]) {
  const current = rows.find((r) => r.bucket === 'current')?.total ?? 0;
  const over15 = rows.reduce(
    (sum, r) => sum + (['15_30', '31_60', '61_plus'].includes(r.bucket) ? r.total : 0),
    0,
  );
  const overdue = rows.reduce((sum, r) => sum + (r.bucket !== 'current' ? r.total : 0), 0);
  const totalOutstanding = rows.reduce((sum, r) => sum + r.total, 0);

  return { current, over15, overdue, totalOutstanding };
}
