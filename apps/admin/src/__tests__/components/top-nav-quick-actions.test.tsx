import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const mockUsePathname = vi.fn<() => string>();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { TopNavQuickActions } from '@/components/navigation/top-nav-quick-actions';
import { useOpenOnNewParam } from '@/hooks/use-open-on-new-param';

function TestDialogHost({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = React.useState(false);
  useOpenOnNewParam(setOpen, enabled);
  return <div data-testid="dialog-state">{open ? 'open' : 'closed'}</div>;
}

describe('TopNavQuickActions', () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  it('renders Quote, Invoice, Payment, and Expense on /dashboard without Client or Lead', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<TopNavQuickActions />);

    expect(screen.getByRole('link', { name: /quote/i })).toHaveAttribute(
      'href',
      '/billing/quotes/new',
    );
    expect(screen.getByRole('link', { name: /invoice/i })).toHaveAttribute(
      'href',
      '/billing/invoices/new',
    );
    expect(screen.getByRole('link', { name: /payment/i })).toHaveAttribute(
      'href',
      '/billing/payments/add',
    );
    expect(screen.getByRole('link', { name: /expense/i })).toHaveAttribute(
      'href',
      '/finance/expenses?new=1',
    );
    expect(screen.queryByRole('link', { name: /client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /lead/i })).not.toBeInTheDocument();
  });

  it('renders Billing group quick actions on /billing', () => {
    mockUsePathname.mockReturnValue('/billing');
    render(<TopNavQuickActions />);

    expect(screen.getByRole('link', { name: /quote/i })).toHaveAttribute(
      'href',
      '/billing/quotes/new',
    );
    expect(screen.getByRole('link', { name: /invoice/i })).toHaveAttribute(
      'href',
      '/billing/invoices/new',
    );
    expect(screen.getByRole('link', { name: /payment/i })).toHaveAttribute(
      'href',
      '/billing/payments/add',
    );
    expect(screen.getByRole('link', { name: /credit/i })).toHaveAttribute(
      'href',
      '/billing/credits?new=1',
    );
    expect(screen.getByRole('link', { name: /item/i })).toHaveAttribute(
      'href',
      '/billing/items?new=1',
    );
  });

  it('renders Relationships group quick actions on /relationships', () => {
    mockUsePathname.mockReturnValue('/relationships');
    render(<TopNavQuickActions />);

    expect(screen.getByRole('link', { name: /client/i })).toHaveAttribute(
      'href',
      '/relationships/clients?new=1',
    );
    expect(screen.getByRole('link', { name: /lead/i })).toHaveAttribute(
      'href',
      '/relationships/leads?new=1',
    );
    expect(screen.getByRole('link', { name: /division/i })).toHaveAttribute(
      'href',
      '/relationships/divisions?new=1',
    );
  });

  it('renders only Expense on /finance', () => {
    mockUsePathname.mockReturnValue('/finance');
    render(<TopNavQuickActions />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/finance/expenses?new=1');
    expect(links[0]).toHaveTextContent(/expense/i);
  });

  it('renders nothing on /insights', () => {
    mockUsePathname.mockReturnValue('/insights');
    const { container } = render(<TopNavQuickActions />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on sub-routes like /billing/invoices or /settings', () => {
    mockUsePathname.mockReturnValue('/billing/invoices');
    const { container: c1 } = render(<TopNavQuickActions />);
    expect(c1).toBeEmptyDOMElement();

    mockUsePathname.mockReturnValue('/settings');
    const { container: c2 } = render(<TopNavQuickActions />);
    expect(c2).toBeEmptyDOMElement();
  });
});

describe('useOpenOnNewParam', () => {
  it('opens the dialog when ?new=1 is present and strips the param', () => {
    window.history.replaceState(null, '', '/finance/expenses?new=1&tab=all');
    render(<TestDialogHost />);

    expect(screen.getByTestId('dialog-state')).toHaveTextContent('open');
    expect(window.location.search).toBe('?tab=all');
  });

  it('stays closed when ?new=1 is absent', () => {
    window.history.replaceState(null, '', '/finance/expenses');
    render(<TestDialogHost />);

    expect(screen.getByTestId('dialog-state')).toHaveTextContent('closed');
  });
});
