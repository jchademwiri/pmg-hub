'use server';

import { getMonthlyFinancialsForYear } from '@pmg/db';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function exportFinancialsCsv(
  year: number
): Promise<string | { error: string }> {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    return { error: 'Invalid year' };
  }

  try {
    const rows = await getMonthlyFinancialsForYear(year);

    // Build a lookup map from 'YYYY-MM' → { revenue, expenses }
    const dataByMonth = new Map<string, { revenue: number; expenses: number }>();
    for (const row of rows) {
      dataByMonth.set(row.month, { revenue: row.revenue, expenses: row.expenses });
    }

    const header = 'Month,Revenue,Expenses,PMG Share,Profit Pool,Salary,Reinvest,Reserve,Flex';
    const dataRows = MONTH_NAMES.map((name, i) => {
      const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
      const { revenue, expenses } = dataByMonth.get(monthKey) ?? { revenue: 0, expenses: 0 };

      const pmgShare   = revenue * 0.20;
      const profitPool = revenue - expenses - pmgShare;
      const salary     = profitPool * 0.35;
      const reinvest   = profitPool * 0.30;
      const reserve    = profitPool * 0.30;
      const flex       = profitPool * 0.05;

      return `${name},${revenue},${expenses},${pmgShare},${profitPool},${salary},${reinvest},${reserve},${flex}`;
    });

    return [header, ...dataRows].join('\n');
  } catch (err) {
    return { error: (err as Error).message };
  }
}
