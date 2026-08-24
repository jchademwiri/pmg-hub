import type { Metadata } from 'next';
import {
  getDb,
  divisions,
  getAllRecurringInvoices,
  getAllRecurringExpenses,
  getActiveClients,
  getAllExpenseCategories,
  getAllItems,
} from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { RecurringClient } from './recurring-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Recurring Subscriptions & Retainers' };

export default async function RecurringFinancePage() {
  const db = getDb();

  const [invoicesData, expensesData, clientsData, divisionsData, itemsData, categoriesData] =
    await Promise.all([
      getAllRecurringInvoices(),
      getAllRecurringExpenses(),
      getActiveClients(),
      db.select({ id: divisions.id, name: divisions.name }).from(divisions),
      getAllItems({ status: 'active' }),
      getAllExpenseCategories(),
    ]);

  const activeInboundTotal = invoicesData
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + parseFloat(i.total), 0);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`R${activeInboundTotal.toLocaleString()} MRR`} />

      <div>
        <h2 className="text-lg font-semibold">Recurring Retainers & Subscriptions</h2>
        <p className="text-sm text-muted-foreground">
          Manage monthly client retainers (auto-billed on 25th) and track outbound software/hosting
          subscriptions (Claude, Antigravity, Hetzner VPS).
        </p>
      </div>

      <RecurringClient
        recurringInvoices={invoicesData}
        recurringExpenses={expensesData}
        clients={clientsData.map((c) => ({ id: c.id, name: c.name, businessName: c.businessName }))}
        divisions={divisionsData}
        billingItems={itemsData.map((i) => ({ id: i.id, name: i.name, unitPrice: i.unitPrice }))}
        categories={categoriesData.map((cat) => cat.name)}
      />
    </div>
  );
}
