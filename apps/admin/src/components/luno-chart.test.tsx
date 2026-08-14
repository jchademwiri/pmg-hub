// @vitest-environment jsdom

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';

import { LunoChart, balanceFormatter } from './luno-chart';

// jsdom can't measure layout, so ResponsiveContainer never reports dimensions.
// Provide fixed ones so the LineChart actually renders an SVG.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactElement<{ width?: number; height?: number }>;
    }) => React.cloneElement(children, { width: 800, height: 400 }),
  };
});

const fetchMock = vi.fn();

describe('balanceFormatter', () => {
  it('formats values with exactly two decimal places', () => {
    expect(balanceFormatter(1)).toBe('1.00');
    expect(balanceFormatter(1.5)).toBe('1.50');
    expect(balanceFormatter(1.23456)).toBe('1.23');
    expect(balanceFormatter(0)).toBe('0.00');
    expect(balanceFormatter(-0.5)).toBe('-0.50');
  });

  it('Property 8 — always produces two decimal places — Validates: Requirements 3.7, 3.8', () => {
    fc.assert(
      fc.property(
        // JS's toFixed switches to exponential notation at |v| >= 1e21; crypto
        // balances never approach that, so the property holds within this range.
        fc.float({ noNaN: true, noDefaultInfinity: true }).filter((v) => Math.abs(v) < 1e21),
        (v) => {
          expect(balanceFormatter(v)).toMatch(/^-?\d+\.\d{2}$/);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('LunoChart', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders "No account selected." without fetching when accountId is empty', () => {
    render(<LunoChart accountId="" />);
    expect(screen.getByText('No account selected.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders a skeleton while the fetch is in flight', async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {})); // never resolves

    const { container } = render(<LunoChart accountId="acc-1" />);

    await waitFor(() => {
      expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    });
  });

  it('renders the error message from the response body on a non-2xx response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Upstream timeout' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<LunoChart accountId="acc-1" />);

    expect(await screen.findByText('Upstream timeout')).toBeInTheDocument();
  });

  it('falls back to the default message when a non-2xx body has no error field', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));

    render(<LunoChart accountId="acc-1" />);

    expect(await screen.findByText('Failed to load portfolio data.')).toBeInTheDocument();
  });

  it('renders the fallback message when the fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    render(<LunoChart accountId="acc-1" />);

    expect(await screen.findByText('Failed to load portfolio data.')).toBeInTheDocument();
  });

  it('renders "No transaction history available." for an empty data array', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<LunoChart accountId="acc-1" />);

    expect(await screen.findByText('No transaction history available.')).toBeInTheDocument();
  });

  it('renders a stepAfter line chart when data is present', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { date: '2023-11-14', balance: 0.0035 },
            { date: '2023-11-15', balance: 0.0045 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { container } = render(<LunoChart accountId="acc-1" />);

    await waitFor(() => {
      expect(container.querySelector('.recharts-line-curve')).not.toBeNull();
    });
  });
});
