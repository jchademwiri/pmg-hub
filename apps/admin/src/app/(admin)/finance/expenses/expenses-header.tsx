'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ExpenseAddForm } from '@/components/expenses/expense-add-form';
import { DownloadReportDialog } from '@/components/reports/download-report-dialog';

interface ExpensesHeaderProps {
  divisions: { id: string; name: string }[];
  categories: string[];
  clients: { id: string; name: string; businessName?: string | null }[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  minDate: string;
  initialDivisionId?: string;
  initialCategory?: string;
  initialClientId?: string;
}

export function ExpensesHeader({
  divisions,
  categories,
  clients,
  createAction,
  minDate,
  initialDivisionId,
  initialCategory,
  initialClientId,
}: ExpensesHeaderProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Expenses</h2>
        <p className="text-sm text-muted-foreground">
          Monitor general expense entries and record outgoing cash
        </p>
      </div>
      <div className="flex items-center gap-2">
        <DownloadReportDialog
          defaultReportType="expenses"
          clients={clients}
          divisions={divisions}
          categories={categories}
          initialDivisionId={initialDivisionId}
          initialCategory={initialCategory}
          initialClientId={initialClientId}
        />
        <Button onClick={() => setIsOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Expense
        </Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
              <DialogDescription>
                Log a business expense, select division & category, and attach receipt proof of
                payment.
              </DialogDescription>
            </DialogHeader>

            <ExpenseAddForm
              divisions={divisions}
              categories={categories}
              clients={clients}
              minDate={minDate}
              createAction={async (fd) => {
                const result = await createAction(fd);
                if (!result.error) setIsOpen(false);
                return result;
              }}
              onCancel={() => setIsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
