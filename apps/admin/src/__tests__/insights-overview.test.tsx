import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { InsightsOverviewClient } from '../app/(admin)/insights/insights-overview-client';
import InsightsOverviewPage from '../app/(admin)/insights/page';
import { getAnalysisOverview, getAllSnapshots } from '@pmg/db';

vi.mock('server-only', () => ({}));

vi.mock('@pmg/db', () => ({
  getAnalysisOverview: vi.fn(),
  getAllSnapshots: vi.fn(),
}));

vi.mock('@/components/navigation/page-header-context', () => ({
  SetPageTotal: ({ value }: { value: string }) => <div data-testid="page-total">{value}</div>,
}));

vi.mock('@/components/analysis/analysis-kpi-strip', () => ({
  AnalysisKpiStrip: () => <div data-testid="kpi-strip">KPI Strip</div>,
}));

describe('Insights Overview', () => {
  describe('InsightsOverviewClient', () => {
    it('renders KPI strip and snapshot count when both requests succeed', () => {
      render(
        <InsightsOverviewClient
          overviewData={{ ytd: { currentRevenue: 100000 } }}
          overviewStatus="fulfilled"
          snapshotCount={5}
          snapshotsStatus="fulfilled"
        />,
      );

      expect(screen.getByTestId('kpi-strip')).toBeInTheDocument();
      expect(screen.getByText('5 Saved')).toBeInTheDocument();
    });

    it('renders unavailable badge for snapshots when snapshot request is rejected', () => {
      render(
        <InsightsOverviewClient
          overviewData={{ ytd: { currentRevenue: 100000 } }}
          overviewStatus="fulfilled"
          snapshotCount={0}
          snapshotsStatus="rejected"
        />,
      );

      expect(screen.getByText('Unavailable')).toBeInTheDocument();
      expect(screen.queryByText('0 Saved')).not.toBeInTheDocument();
    });

    it('renders retrieval failure state when overview request is rejected', () => {
      render(
        <InsightsOverviewClient
          overviewData={null}
          overviewStatus="rejected"
          snapshotCount={3}
          snapshotsStatus="fulfilled"
        />,
      );

      expect(screen.getByTestId('overview-retrieval-failure')).toBeInTheDocument();
      expect(screen.getByText('Failed to load overview KPI data.')).toBeInTheDocument();
      expect(screen.queryByTestId('kpi-strip')).not.toBeInTheDocument();
    });
  });

  describe('InsightsOverviewPage server component', () => {
    it('passes rejected status correctly when DB queries fail', async () => {
      vi.mocked(getAnalysisOverview).mockRejectedValueOnce(new Error('DB Error'));
      vi.mocked(getAllSnapshots).mockRejectedValueOnce(new Error('DB Error'));

      const pageEl = await InsightsOverviewPage();
      render(pageEl);

      expect(screen.getByTestId('page-total')).toHaveTextContent('YTD Revenue: Unavailable');
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Failed to load overview KPI data.')).toBeInTheDocument();
    });
  });
});
