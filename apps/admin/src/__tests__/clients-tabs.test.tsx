import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/app/actions/clients', () => ({
  sendPortalInvitation: vi.fn().mockResolvedValue({}),
}));

import ClientsPageClient from '@/app/(admin)/relationships/clients/clients-client';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ClientWithIncomeCount } from '@pmg/db';

const mockClients: ClientWithIncomeCount[] = [
  {
    id: 'client-active-1',
    name: 'John Doe',
    businessName: 'Acme Active Corp',
    email: 'john@acme.com',
    phone: '+27 82 111 2222',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    incomeCount: 2,
    portalInvitationSentAt: null,
    userId: null,
    isRetainer: false,
    excludeFromAutoStatements: false,
  },
  {
    id: 'client-inactive-1',
    name: 'Jane Smith',
    businessName: 'Dormant Enterprise',
    email: 'jane@dormant.co.za',
    phone: '+27 82 333 4444',
    isActive: false,
    createdAt: new Date('2026-01-02'),
    incomeCount: 0,
    portalInvitationSentAt: null,
    userId: null,
    isRetainer: false,
    excludeFromAutoStatements: false,
  },
];

const mockDivisions = [{ id: 'div-1', name: 'PMG' }];

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('ClientsPageClient Status Tabs', () => {
  it('defaults to Active tab and only renders active clients', () => {
    renderWithProviders(
      <ClientsPageClient
        clients={mockClients}
        divisions={mockDivisions}
        createAction={vi.fn()}
        deleteAction={vi.fn()}
        toggleActiveAction={vi.fn()}
      />,
    );

    // Active tab is selected by default
    expect(screen.getAllByText('Acme Active Corp').length).toBeGreaterThan(0);
    expect(screen.queryByText('Dormant Enterprise')).not.toBeInTheDocument();
  });

  it('switches to Inactive tab and renders inactive clients with activate option', async () => {
    const user = userEvent.setup();
    const mockToggle = vi.fn().mockResolvedValue({});

    renderWithProviders(
      <ClientsPageClient
        clients={mockClients}
        divisions={mockDivisions}
        createAction={vi.fn()}
        deleteAction={vi.fn()}
        toggleActiveAction={mockToggle}
      />,
    );

    // Click on Inactive tab
    const inactiveTab = screen.getByRole('tab', { name: /inactive/i });
    await user.click(inactiveTab);

    // Now Dormant Enterprise should be visible
    expect(screen.getAllByText('Dormant Enterprise').length).toBeGreaterThan(0);
    expect(screen.queryByText('Acme Active Corp')).not.toBeInTheDocument();
  });

  it('switches to All tab and renders all clients', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ClientsPageClient
        clients={mockClients}
        divisions={mockDivisions}
        createAction={vi.fn()}
        deleteAction={vi.fn()}
        toggleActiveAction={vi.fn()}
      />,
    );

    // Click on All tab
    const allTab = screen.getByRole('tab', { name: /all/i });
    await user.click(allTab);

    expect(screen.getAllByText('Acme Active Corp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dormant Enterprise').length).toBeGreaterThan(0);
  });
});
