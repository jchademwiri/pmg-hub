// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExportPdfButton } from './export-pdf-button';

const { downloadElementPdfMock, downloadServerPdfMock } = vi.hoisted(() => ({
  downloadElementPdfMock: vi.fn(),
  downloadServerPdfMock: vi.fn(),
}));

vi.mock('@/lib/pdf-export', () => ({
  downloadElementPdf: downloadElementPdfMock,
  downloadServerPdf: downloadServerPdfMock,
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ExportPdfButton', () => {
  beforeEach(() => {
    downloadElementPdfMock.mockReset();
    downloadServerPdfMock.mockReset();
    downloadElementPdfMock.mockResolvedValue(undefined);
    downloadServerPdfMock.mockResolvedValue(undefined);
  });

  it('exports the explicit printable element id', async () => {
    render(<ExportPdfButton elementId="statement-printable" fileName="Statement PMG" />);

    await userEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(downloadElementPdfMock).toHaveBeenCalledWith('statement-printable', 'Statement PMG');
    });
  });

  it('defaults to printable-area', async () => {
    render(<ExportPdfButton fileName="Invoice PMG" />);

    await userEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(downloadElementPdfMock).toHaveBeenCalledWith('printable-area', 'Invoice PMG');
    });
  });

  it('uses the server PDF URL when provided', async () => {
    render(<ExportPdfButton pdfUrl="/api/billing/pdf/invoice/123" fileName="Invoice PMG" />);

    await userEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(downloadServerPdfMock).toHaveBeenCalledWith('/api/billing/pdf/invoice/123', 'Invoice PMG');
    });
    expect(downloadElementPdfMock).not.toHaveBeenCalled();
  });
});
