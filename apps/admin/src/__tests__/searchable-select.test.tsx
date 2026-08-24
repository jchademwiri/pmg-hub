import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SearchableClientSelect } from '@/components/billing/searchable-client-select';
import { SearchableItemSelect } from '@/components/billing/searchable-item-select';

const mockClients = [
  {
    id: 'client-1',
    name: 'John Doe',
    businessName: 'Acme Corporation',
    email: 'john@acme.com',
    isActive: true,
  },
  {
    id: 'client-2',
    name: 'Jane Smith',
    businessName: null,
    email: 'jane@personal.com',
    isActive: true,
  },
  {
    id: 'client-3',
    name: 'Bob Marley',
    businessName: 'Zion Media Group',
    email: 'bob@zion.com',
    isActive: false,
  },
];

const mockActiveItems = [
  {
    id: 'item-1',
    name: 'Website Hosting (Annual)',
    description: 'High-speed cloud hosting package with SSL',
    unitPrice: '1200.00',
    unitLabel: 'year',
  },
  {
    id: 'item-2',
    name: 'Domain Registration',
    description: '.co.za domain registration and DNS management',
    unitPrice: '150.00',
    unitLabel: 'domain',
  },
  {
    id: 'item-3',
    name: 'Custom Web Development',
    description: 'Hourly rate for Next.js full-stack development',
    unitPrice: '850.00',
    unitLabel: 'hour',
  },
];

describe('SearchableClientSelect', () => {
  it('renders placeholder when no client is selected', () => {
    render(
      <SearchableClientSelect
        clients={mockClients}
        value=""
        onValueChange={vi.fn()}
        placeholder="Select a client…"
      />,
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Select a client…');
  });

  it('displays Company Name as primary label when selected', () => {
    render(
      <SearchableClientSelect clients={mockClients} value="client-1" onValueChange={vi.fn()} />,
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveTextContent('Acme Corporation');
    expect(combobox).toHaveTextContent('(John Doe)');
  });

  it('falls back to Contact Name when businessName is null', () => {
    render(
      <SearchableClientSelect clients={mockClients} value="client-2" onValueChange={vi.fn()} />,
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Jane Smith');
  });

  it('shows Inactive badge for inactive clients', () => {
    render(
      <SearchableClientSelect clients={mockClients} value="client-3" onValueChange={vi.fn()} />,
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Zion Media Group');
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('filters clients in real-time by company name, contact name, or email', async () => {
    const user = userEvent.setup();
    const handleValueChange = vi.fn();

    render(
      <SearchableClientSelect clients={mockClients} value="" onValueChange={handleValueChange} />,
    );

    // Open combobox
    await user.click(screen.getByRole('combobox'));

    const searchInput = screen.getByPlaceholderText(/search by company/i);
    expect(searchInput).toBeInTheDocument();

    // Type search query matching company name
    await user.type(searchInput, 'acme');

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Zion Media Group')).not.toBeInTheDocument();

    // Type search query matching email
    await user.clear(searchInput);
    await user.type(searchInput, 'jane@personal.com');

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('Acme Corporation')).not.toBeInTheDocument();

    // Click client to select
    await user.click(screen.getByText('Jane Smith'));
    expect(handleValueChange).toHaveBeenCalledWith('client-2');
  });
});

describe('SearchableItemSelect', () => {
  it('renders placeholder when no item is selected', () => {
    render(
      <SearchableItemSelect
        activeItems={mockActiveItems}
        value=""
        onValueChange={vi.fn()}
        placeholder="Select product…"
      />,
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Select product…');
  });

  it('displays selected item name and unit label', () => {
    render(
      <SearchableItemSelect activeItems={mockActiveItems} value="item-1" onValueChange={vi.fn()} />,
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveTextContent('Website Hosting (Annual)');
    expect(combobox).toHaveTextContent('/ year');
  });

  it('filters items in real-time by product name and description', async () => {
    const user = userEvent.setup();
    const handleValueChange = vi.fn();

    render(
      <SearchableItemSelect
        activeItems={mockActiveItems}
        value=""
        onValueChange={handleValueChange}
      />,
    );

    // Open combobox
    await user.click(screen.getByRole('combobox'));

    const searchInput = screen.getByPlaceholderText(/search products/i);
    expect(searchInput).toBeInTheDocument();

    // Search by description keyword
    await user.type(searchInput, 'SSL');

    expect(screen.getByText('Website Hosting (Annual)')).toBeInTheDocument();
    expect(screen.queryByText('Domain Registration')).not.toBeInTheDocument();

    // Click item to select
    await user.click(screen.getByText('Website Hosting (Annual)'));
    expect(handleValueChange).toHaveBeenCalledWith('item-1');
  });
});
