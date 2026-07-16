'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseAddForm } from '@/components/expenses/expense-add-form';

interface ExpensesHeaderProps {
  divisions: { id: string; name: string }[];
  categories: string[];
  clients: { id: string; name: string }[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  minDate: string;
}

export function ExpensesHeader({
  divisions,
  categories,
  clients,
  createAction,
  minDate,
}: ExpensesHeaderProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Expenses</h2>
          <p className="text-sm text-muted-foreground">Monitor general expense entries and record outgoing cash</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Record New Expense</h3>
            <p className="text-xs text-muted-foreground">Log a general business expense, category, and associated division</p>
          </div>
          <ExpenseAddForm
            divisions={divisions}
            categories={categories}
            clients={clients}
            minDate={minDate}
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

    </div>
  );
}
