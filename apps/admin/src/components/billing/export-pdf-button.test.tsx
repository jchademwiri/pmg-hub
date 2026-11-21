// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExportPdfButton } from './export-pdf-button';

const { downloadServerPdfMock, toastMock } = vi.hoisted(() => ({
  downloadServerPdfMock: vi.fn(),
  toastMock: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/pdf-export', () => ({
  downloadServerPdf: downloadServerPdfMock,
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

describe('ExportPdfButton', () => {
  beforeEach(() => {
    downloadServerPdfMock.mockReset();
    toastMock.loading.mockClear();
    toastMock.success.mockClear();
    toastMock.error.mockClear();
    downloadServerPdfMock.mockResolvedValue(undefined);
  });

  it('downloads the server-rendered pdfcn document', async () => {
    render(<ExportPdfButton pdfUrl="/api/billing/pdf/invoice/123" fileName="Invoice PMG" />);

    await userEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(downloadServerPdfMock).toHaveBeenCalledWith(
        '/api/billing/pdf/invoice/123',
        'Invoice PMG',
      );
    });
    expect(toastMock.success).toHaveBeenCalledWith('PDF downloaded successfully!', {
      id: 'toast-id',
    });
  });

  it('shows an error toast when the server PDF download fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    downloadServerPdfMock.mockRejectedValueOnce(new Error('PDF download failed (500).'));

    render(<ExportPdfButton pdfUrl="/api/billing/pdf/invoice/123" fileName="Invoice PMG" />);

    await userEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Failed to generate PDF. Please try again.', {
        id: 'toast-id',
      });
    });
    consoleErrorSpy.mockRestore();
  });
});
