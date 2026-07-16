import type { Metadata } from 'next';
import {
  getAllExpenses,
  getAllDivisions,
  getAllExpenseCategories,
  getDistinctExpenseMonths,
  getAllClients,
  getExpenseMonthlySummaries,
} from '@pmg/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, CheckCircle2, AlertCircle } from 'lucide-react';
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

  const currentMonthIdx = new Date().getMonth();
  const currentCalendarYear = new Date().getFullYear();
  const fyStartYear = currentMonthIdx < 2 ? currentCalendarYear - 1 : currentCalendarYear;

  const monthlySummaries = await getExpenseMonthlySummaries(fyStartYear, filters.divisionId, filters.category);
  const globalTotal = monthlySummaries.reduce((sum, m) => sum + m.totalExpenses, 0);
  const globalCategorized = monthlySummaries.reduce((sum, m) => sum + m.totalCategorized, 0);
  const globalUncategorized = monthlySummaries.reduce((sum, m) => sum + m.totalUncategorized, 0);

  return (
    <div className="flex flex-col gap-6">
      <ExpenseFilterBar
        divisions={divisions}
        categories={categories}
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

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <Receipt className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZAR(globalTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">For the current financial year</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorized</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatZAR(globalCategorized)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valid expense categories</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uncategorized</CardTitle>
            <AlertCircle className={`size-4 ${globalUncategorized > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${globalUncategorized > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatZAR(globalUncategorized)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires review</p>
          </CardContent>
        </Card>
      </div>

      <Accordion type="single" collapsible defaultValue="current-month" className="w-full space-y-4">
        {/* CURRENT MONTH */}
        <AccordionItem value="current-month" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
            <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
              Current Month ({new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })})
            </span>
            
            {/* Summary Badges */}
            {(() => {
              const summary = monthlySummaries.find(s => s.month === currentMonthStr);
              if (!summary) return null;
              return (
                <div className="flex items-center gap-3 pr-2">
                  <div className="px-2.5 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground border border-border/50 hidden sm:block">
                    {summary.count} {summary.count === 1 ? 'expense' : 'expenses'}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium border border-primary/20">
                    Total: {formatZAR(summary.totalExpenses)}
                  </div>
                  {summary.totalUncategorized > 0 && (
                    <div className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                      Uncategorized: {formatZAR(summary.totalUncategorized)}
                    </div>
                  )}
                </div>
              );
            })()}
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
              <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
                <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                  {m.label}
                </span>

                {/* Summary Badges */}
                {(() => {
                  const summary = monthlySummaries.find(s => s.month === val.replace('month-', ''));
                  if (!summary) return null;
                  return (
                    <div className="flex items-center gap-3 pr-2">
                      <div className="px-2.5 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground border border-border/50 hidden sm:block">
                        {summary.count} {summary.count === 1 ? 'expense' : 'expenses'}
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium border border-primary/20">
                        Total: {formatZAR(summary.totalExpenses)}
                      </div>
                      {summary.totalUncategorized > 0 && (
                        <div className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                          Uncategorized: {formatZAR(summary.totalUncategorized)}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
            <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
              <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                Previous Financial Year (Mar {previousYearGroup.year} - Feb {previousYearGroup.year + 1})
              </span>
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
