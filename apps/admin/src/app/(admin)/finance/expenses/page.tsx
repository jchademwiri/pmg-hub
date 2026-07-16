import type { Metadata } from 'next';
import {
  getAllExpenses,
  getAllDivisions,
  getAllExpenseCategories,
  getDistinctExpenseMonths,
  getAllClients,
} from '@pmg/db';
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses';
import { ExpenseFilterBar } from '@/components/expenses/expense-filter-bar';
import { formatZAR } from '@/lib/format';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { ExpensesHeader } from './expenses-header';
import { LazyExpensesTable } from './lazy-expenses-table';
import { ExpenseTable } from '@/components/expenses/expense-table';
import { getMinAllowedDate, getClosedPeriodsFromDates } from '@/lib/date-rules';
import { generateFinancialYearGroups, getCurrentMonthString } from '@/lib/billing-groups';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Expenses' };

interface ExpensePageProps {
  searchParams: Promise<{ divisionId?: string; category?: string; month?: string; page?: string }>;
}

export default async function ExpensePage({ searchParams }: ExpensePageProps) {
  const { divisionId, category } = await searchParams;

  const filters = {
    divisionId: divisionId || undefined,
    category: category || undefined,
  };

  const currentMonthStr = getCurrentMonthString();
  const { currentMonths, previousYearGroup } = generateFinancialYearGroups();
  const [currentYear, currentMonth] = currentMonthStr.split('-').map(Number);

  const [currentMonthResult, divisions, categoryObjects, months, clients, minDate] = await Promise.all([
    getAllExpenses({ month: currentMonthStr, ...filters }, { page: 1, pageSize: 5000 }),
    getAllDivisions(),
    getAllExpenseCategories(),
    getDistinctExpenseMonths(),
    getAllClients(),
    getMinAllowedDate(),
  ]);

  const categories = categoryObjects.map((c) => c.name);
  const closedPeriods = await getClosedPeriodsFromDates(currentMonthResult.data.map((r) => r.date));

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(currentMonthResult.sum)} variant="amber" />
      <ExpenseFilterBar
        divisions={divisions}
        categories={categories}
        months={months}
        currentDivisionId={filters.divisionId}
        currentCategory={filters.category}
      />
      <ExpensesHeader
        divisions={divisions}
        categories={categories}
        clients={clients}
        createAction={createExpense}
        minDate={minDate}
      />

      <Accordion type="single" collapsible defaultValue="current-month" className="w-full space-y-4">
        {/* CURRENT MONTH */}
        <AccordionItem value="current-month" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-base">Current Month</span>
              <span className="text-sm text-muted-foreground font-normal">
                {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6">
            {currentMonthResult.data.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-md p-8 text-center bg-card">
                No expense entries yet.
              </div>
            ) : (
              <ExpenseTable
                entries={currentMonthResult.data}
                divisions={divisions}
                categories={categories}
                clients={clients}
                deleteAction={deleteExpense}
                updateAction={updateExpense}
                closedPeriods={closedPeriods}
                minDate={minDate}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* PREVIOUS MONTHS OF CURRENT FY */}
        {currentMonths.map((m) => {
          if (m.year === currentYear && m.month === currentMonth) return null;
          
          const val = `month-${m.year}-${m.month}`;
          return (
            <AccordionItem key={val} value={val} className="border rounded-lg bg-card px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-base">{m.label}</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    {new Date(m.year, m.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6">
                <LazyExpensesTable
                  year={m.year}
                  month={m.month}
                  divisionId={filters.divisionId}
                  category={filters.category}
                  divisions={divisions}
                  categories={categories}
                  clients={clients}
                  closedPeriods={closedPeriods}
                  minDate={minDate}
                  deleteAction={deleteExpense}
                  updateAction={updateExpense}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}

        {/* PREVIOUS FINANCIAL YEAR */}
        {previousYearGroup && (
          <AccordionItem value="previous-fy" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-base">Previous Financial Year</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Mar {previousYearGroup.year - 1} - Feb {previousYearGroup.year}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <LazyExpensesTable
                year={previousYearGroup.year}
                divisionId={filters.divisionId}
                category={filters.category}
                divisions={divisions}
                categories={categories}
                clients={clients}
                closedPeriods={closedPeriods}
                minDate={minDate}
                deleteAction={deleteExpense}
                updateAction={updateExpense}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
