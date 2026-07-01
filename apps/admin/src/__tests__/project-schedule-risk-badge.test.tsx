/**
 * Component tests for ProjectRiskBadge risk calculation logic.
 *
 * Validates all risk states returned by the calculateRisk function:
 * - submitted/completed → "Done"
 * - cancelled → "Cancelled"
 * - past closing date → "Overdue"
 * - past target + in_progress → "At Risk"
 * - past start + planned → "Start Due"
 * - tight buffer (target leaves less than configured buffer) → "Tight"
 * - on track → "On Track"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

// ─── Test data factory ───────────────────────────────────────────────────────

interface TenderOverride {
  status?: string
  closingDate?: string
  targetCompletionDate?: string
  startDate?: string
  bufferDays?: number
}

function makeTender(overrides: TenderOverride) {
  return {
    id: 'tender-1',
    clientId: 'client-1',
    divisionId: null,
    projectReference: 'T01/2026',
    closingDate: overrides.closingDate ?? '2026-07-14',
    effortDays: 3,
    bufferDays: overrides.bufferDays ?? 5,
    startDate: overrides.startDate ?? '2026-07-01',
    targetCompletionDate: overrides.targetCompletionDate ?? '2026-07-04',
    status: (overrides.status ?? 'planned') as any,
    priority: 'normal' as any,
    notes: null,
    blockers: null,
    outcome: null,
    description: null,
    createdBy: 'user-1',
    actualEffortDays: null,
    actualCompletionDate: null,
    submissionDate: null,
    sortOrder: null,
    createdAt: new Date('2026-06-01'),
    updatedAt: null,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('ProjectRiskBadge — status-based risk', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows "Done" for submitted tenders', async () => {
    const { ProjectRiskBadge } = await import('@/components/projects/project-risk-badge')
    render(<ProjectRiskBadge tender={makeTender({ status: 'submitted' })} />)
    expect(screen.getByTestId('badge')).toHaveTextContent('Done')
  })

  it('shows "Done" for completed tenders', async () => {
    const { ProjectRiskBadge } = await import('@/components/projects/project-risk-badge')
    render(<ProjectRiskBadge tender={makeTender({ status: 'completed' })} />)
    expect(screen.getByTestId('badge')).toHaveTextContent('Done')
  })

  it('shows "Cancelled" for cancelled tenders', async () => {
    const { ProjectRiskBadge } = await import('@/components/projects/project-risk-badge')
    render(<ProjectRiskBadge tender={makeTender({ status: 'cancelled' })} />)
    expect(screen.getByTestId('badge')).toHaveTextContent('Cancelled')
  })
})

describe('ProjectRiskBadge — time-based risk', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows "Overdue" when closing date is past', async () => {
    const { ProjectRiskBadge } = await import('@/components/projects/project-risk-badge')
    // Far future start/target dates, but closing date is yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const closing = yesterday.toISOString().split('T')[0]
    render(<ProjectRiskBadge tender={makeTender({ status: 'planned', closingDate: closing })} />)
    expect(screen.getByTestId('badge')).toHaveTextContent('Overdue')
  })

  it('shows "At Risk" when past target completion and in_progress', async () => {
    const { ProjectRiskBadge } = await import('@/components/projects/project-risk-badge')
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const pastTarget = yesterday.toISOString().split('T')[0]

    render(
      <ProjectRiskBadge
        tender={makeTender({
          status: 'in_progress',
          closingDate: '2026-12-31', // far future so not overdue
          targetCompletionDate: pastTarget,
          startDate: '2026-01-01',
        })}
      />,
    )
    expect(screen.getByTestId('badge')).toHaveTextContent('At Risk')
  })

  it('shows "Start Due" when past start date and still planned', async () => {
    const { ProjectRiskBadge } = await import('@/components/projects/project-risk-badge')
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const pastStart = yesterday.toISOString().split('T')[0]

    render(
      <ProjectRiskBadge
        tender={makeTender({
          status: 'planned',
          closingDate: '2026-12-31', // far future so not overdue
          startDate: pastStart,
          targetCompletionDate: '2026-12-15', // far future so not overdue on target
        })}
      />,
    )
    expect(screen.getByTestId('badge')).toHaveTextContent('Start Due')
  })

  it('shows "Impossible" when target completion is after closing', async () => {
    const { ProjectRiskBadge } = await import('@/components/projects/project-risk-badge')

    render(
      <ProjectRiskBadge
        tender={makeTender({
          status: 'planned',
          closingDate: '2026-07-06',
          targetCompletionDate: '2026-07-07',
        })}
      />,
    )
    expect(screen.getByTestId('badge')).toHaveTextContent('Impossible')
  })

  it('shows "Tight" when target completion leaves less than the configured buffer', async () => {
    const { ProjectRiskBadge } = await import('@/components/projects/project-risk-badge')

    render(
      <ProjectRiskBadge
        tender={makeTender({
          status: 'planned',
          bufferDays: 5,
          closingDate: '2026-07-10',
          targetCompletionDate: '2026-07-07',
        })}
      />,
    )
    expect(screen.getByTestId('badge')).toHaveTextContent('Tight')
  })

  it('shows "On Track" for healthy planned tender', async () => {
    const { ProjectRiskBadge } = await import('@/components/projects/project-risk-badge')

    render(
      <ProjectRiskBadge
        tender={makeTender({
          status: 'planned',
          closingDate: '2026-07-14',
          startDate: '2026-07-01',
          targetCompletionDate: '2026-07-05', // 9 days before closing → not tight
        })}
      />,
    )
    expect(screen.getByTestId('badge')).toHaveTextContent('On Track')
  })
})
