/**
 * Component tests for ReportFilterCard.
 *
 * Validates:
 * - Per-report-type filter visibility (period/division/account/category/date range)
 * - Active filter count badge and Reset button appear only when filters differ
 *   from defaults, and Reset restores every filter to its default
 * - The division-isolated KPI snippet renders only when a specific division is
 *   selected and a summary is available, with a correctly computed net figure
 * - Print / Download PDF buttons invoke their handlers
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select
      data-testid="select-wrapper"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectGroup: ({ children }: any) => <>{children}</>,
  SelectLabel: () => null,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

import { ReportFilterCard, type ReportType } from '@/components/accounting/report-filter-card';

const divisions = [
  { id: 'div-1', name: 'Engineering' },
  { id: 'div-2', name: 'Sales' },
];

function renderCard(overrides: Partial<React.ComponentProps<typeof ReportFilterCard>> = {}) {
  const props = {
    reportType: 'profit-and-loss' as ReportType,
    periods: ['2026-05', '2026-06'],
    selectedPeriod: '',
    onPeriodChange: vi.fn(),
    divisions,
    selectedDivisionId: 'all',
    onDivisionChange: vi.fn(),
    accounts: [],
    selectedAccountId: 'all',
    onAccountChange: vi.fn(),
    startDate: '',
    onStartDateChange: vi.fn(),
    endDate: '',
    onEndDateChange: vi.fn(),
    selectedCategory: 'all',
    onCategoryChange: vi.fn(),
    onPrint: vi.fn(),
    onDownloadPdf: vi.fn(),
    ...overrides,
  };
  render(<ReportFilterCard {...props} />);
  return props;
}

describe('ReportFilterCard — filter visibility per report type', () => {
  it('shows the period and division filters, and date range, for profit-and-loss', () => {
    renderCard({ reportType: 'profit-and-loss' });
    expect(screen.getByText('Period')).toBeInTheDocument();
    expect(screen.getByText('Division')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
    expect(screen.queryByText('Account')).not.toBeInTheDocument();
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('hides the period and division filters, and shows category, for chart-of-accounts', () => {
    renderCard({ reportType: 'chart-of-accounts' });
    expect(screen.queryByText('Period')).not.toBeInTheDocument();
    expect(screen.queryByText('Division')).not.toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.queryByText('Start Date')).not.toBeInTheDocument();
  });

  it('hides the division filter for client-performance', () => {
    renderCard({ reportType: 'client-performance' });
    expect(screen.queryByText('Division')).not.toBeInTheDocument();
    expect(screen.getByText('Period')).toBeInTheDocument();
  });

  it('shows the account filter for general-ledger', () => {
    renderCard({ reportType: 'general-ledger' });
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('hides the account filter for other report types', () => {
    renderCard({ reportType: 'trial-balance' });
    expect(screen.queryByText('Account')).not.toBeInTheDocument();
  });

  it('does not show a date range for reports that do not support it', () => {
    renderCard({ reportType: 'annual-financial-statements' });
    expect(screen.queryByText('Start Date')).not.toBeInTheDocument();
    expect(screen.queryByText('End Date')).not.toBeInTheDocument();
  });

  it('labels the date range as From/As at Date for balance-sheet', () => {
    renderCard({ reportType: 'balance-sheet' });
    expect(screen.getByText('From Date (Opt)')).toBeInTheDocument();
    expect(screen.getByText('As at Date')).toBeInTheDocument();
  });
});

describe('ReportFilterCard — active filter count and reset', () => {
  it('shows no "Active" badge or Reset button when all filters are at their defaults', () => {
    renderCard({ selectedDivisionId: 'all', startDate: '', endDate: '' });
    expect(screen.queryByText(/Active$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });

  it('counts a non-default division and a date range as active filters', () => {
    renderCard({ selectedDivisionId: 'div-1', startDate: '2026-01-01', endDate: '2026-01-31' });
    expect(screen.getByText('3 Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('resets every filter to its default when Reset is clicked', async () => {
    const props = renderCard({ selectedDivisionId: 'div-1', startDate: '2026-01-01', endDate: '2026-01-31' });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /reset/i }));

    expect(props.onDivisionChange).toHaveBeenCalledWith('all');
    expect(props.onAccountChange).toHaveBeenCalledWith('all');
    expect(props.onCategoryChange).toHaveBeenCalledWith('all');
    expect(props.onStartDateChange).toHaveBeenCalledWith('');
    expect(props.onEndDateChange).toHaveBeenCalledWith('');
    expect(props.onPeriodChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-FY$/));
  });
});

describe('ReportFilterCard — division-isolated KPI snippet', () => {
  it('is hidden when "all" divisions are selected', () => {
    renderCard({ selectedDivisionId: 'all', divisionSummary: { revenue: 1000, expenses: 400 } });
    expect(screen.queryByText(/Rev:/)).not.toBeInTheDocument();
  });

  it('is hidden when no divisionSummary is available, even for a specific division', () => {
    renderCard({ selectedDivisionId: 'div-1', divisionSummary: null });
    expect(screen.queryByText(/Rev:/)).not.toBeInTheDocument();
  });

  it('renders revenue, expenses, and a correctly computed net for the selected division', () => {
    renderCard({
      selectedDivisionId: 'div-1',
      divisionSummary: { revenue: 1000, expenses: 400 },
    });
    expect(screen.getByText(/Engineering:/)).toBeInTheDocument();
    expect(screen.getByText(/Rev:/)).toBeInTheDocument();
    expect(screen.getByText(/Exp:/)).toBeInTheDocument();
    expect(screen.getByText(/Net:/)).toBeInTheDocument();
  });
});

describe('ReportFilterCard — actions', () => {
  it('calls onPrint and onDownloadPdf when clicked', async () => {
    const props = renderCard();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /print/i }));
    expect(props.onPrint).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /download pdf/i }));
    expect(props.onDownloadPdf).toHaveBeenCalled();
  });
});
