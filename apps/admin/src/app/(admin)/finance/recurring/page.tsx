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
import { RecurringClient } from './recurring-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Recurring Subscriptions & Retainers' };

export default async function RecurringFinancePage() {
  const db = getDb();

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
    .filter((i) => i.status === 'active' && i.frequency === 'monthly')
    .reduce((sum, i) => sum + parseFloat(i.total), 0);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal
        value={`R${activeInboundMRR.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} MRR`}
      />

      <div>
        <h2 className="text-lg font-semibold">Recurring Retainers & Subscriptions</h2>
        <p className="text-sm text-muted-foreground">
          Manage monthly client retainers (auto-billed on 25th) and track outbound software/hosting
          subscriptions (Claude, Antigravity, Hetzner VPS).
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
        />
      </Suspense>
    </div>
  );
}
