// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExportPdfButton } from './export-pdf-button';

const { downloadElementPdfMock } = vi.hoisted(() => ({
  downloadElementPdfMock: vi.fn(),
}));

vi.mock('@/lib/pdf-export', () => ({
  downloadElementPdf: downloadElementPdfMock,
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
    downloadElementPdfMock.mockResolvedValue(undefined);
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
});
