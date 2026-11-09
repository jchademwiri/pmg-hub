import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { IncomeKpiCards } from '../app/(admin)/finance/income/income-kpi-cards';
import { ExpensesKpiCards } from '../app/(admin)/finance/expenses/expenses-kpi-cards';

describe('Finance KPI Cards', () => {
  describe('IncomeKpiCards', () => {
    it('renders all 4 cards with formatted values and rates', () => {
      render(
        <IncomeKpiCards
          globalReceived={150000}
          globalAllocated={120000}
          globalUnallocated={30000}
          totalCount={25}
        />,
      );

      expect(screen.getByText('Total Received')).toBeInTheDocument();
      expect(screen.getByText('Total Allocated')).toBeInTheDocument();
      expect(screen.getByText('Unallocated Deposits')).toBeInTheDocument();
      expect(screen.getByText('Allocation Rate')).toBeInTheDocument();

      // Check values
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Requires matching')).toBeInTheDocument();
      const percentages = screen.getAllByText('80%');
      expect(percentages.length).toBe(2); // Badge on Card 2 & Value on Card 4
    });

    it('shows clean state when unallocated is 0', () => {
      render(
        <IncomeKpiCards
          globalReceived={100000}
          globalAllocated={100000}
          globalUnallocated={0}
          totalCount={10}
        />,
      );

      expect(screen.queryByText('Requires matching')).not.toBeInTheDocument();
      expect(screen.getByText('All funds matched')).toBeInTheDocument();
      const percentages = screen.getAllByText('100%');
      expect(percentages.length).toBe(2);
      expect(screen.getByText('Strong matching rate')).toBeInTheDocument();
    });
  });

  describe('ExpensesKpiCards', () => {
    it('renders all 4 cards and handles Uncategorized filter link', () => {
      render(
        <ExpensesKpiCards
          globalTotal={80000}
          globalCategorized={72000}
          globalUncategorized={8000}
          totalCount={40}
          categorizedCount={36}
          uncategorizedCount={4}
          currentCategory={undefined}
          divisionId="div-1"
        />,
      );

      expect(screen.getByText('Total Expenses')).toBeInTheDocument();
      expect(screen.getByText('Categorized')).toBeInTheDocument();
      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
      expect(screen.getByText('Audit Health')).toBeInTheDocument();

      expect(screen.getByText('40')).toBeInTheDocument();
      expect(screen.getByText('36')).toBeInTheDocument();
      expect(screen.getByText('4 items')).toBeInTheDocument();
      const percentages = screen.getAllByText('90%');
      expect(percentages.length).toBe(2);

      // Link to filter uncategorized expenses
      const uncategorizedLink = screen.getByText('Uncategorized').closest('a');
      expect(uncategorizedLink).toHaveAttribute(
        'href',
        '/finance/expenses?divisionId=div-1&category=Uncategorized',
      );
    });
  });
});
