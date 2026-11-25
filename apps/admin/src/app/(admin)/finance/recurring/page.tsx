import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  getDb,
  divisions,
  getAllRecurringInvoices,
  getAllRecurringExpenses,
  getActiveClients,
  getAllExpenseCategories,
  getActiveItems,
  getRecurringInvoiceHistory,
} from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { getSASTToday } from '@/lib/format';
import { RecurringClient } from './recurring-client';
import { toMonthlyAmount } from './recurring-utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Recurring Billing & Subscriptions' };

export default async function RecurringFinancePage() {
  const db = getDb();
  const todayStr = getSASTToday();

  const [
    invoicesData,
    expensesData,
    clientsData,
    divisionsData,
    itemsData,
    categoriesData,
    historyInvoicesData,
  ] = await Promise.all([
    getAllRecurringInvoices(),
    getAllRecurringExpenses(),
    getActiveClients(),
    db.select({ id: divisions.id, name: divisions.name }).from(divisions),
    getActiveItems(),
    getAllExpenseCategories(),
    getRecurringInvoiceHistory(),
  ]);

  const activeInboundMRR = invoicesData
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + toMonthlyAmount(parseFloat(i.total), i.frequency), 0);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal
        value={`R${activeInboundMRR.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} MRR`}
      />

      <div>
        <h2 className="text-lg font-semibold">Recurring Billing &amp; Subscriptions</h2>
        <p className="text-sm text-muted-foreground">
          Manage client retainers you bill on repeat and track software, hosting, and domain
          renewals (yours or client-linked).
        </p>
      </div>

      <Suspense
        fallback={
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading recurring schedules...
          </div>
        }
      >
        <RecurringClient
          recurringInvoices={invoicesData}
          recurringExpenses={expensesData}
          historyInvoices={historyInvoicesData}
          clients={clientsData.map((c) => ({
            id: c.id,
            name: c.name,
            businessName: c.businessName,
            divisionId: c.divisionId,
          }))}
          divisions={divisionsData}
          activeItems={itemsData}
          categories={categoriesData.map((cat) => cat.name)}
          todayStr={todayStr}
        />
      </Suspense>
    </div>
  );
}
