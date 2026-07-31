'use client'

import Link from 'next/link'
import {
  TrendingUp,
  BarChart3,
  Camera,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { AnalysisKpiStrip } from '@/components/analysis/analysis-kpi-strip'

interface InsightsOverviewClientProps {
  overviewData: any
  snapshotCount: number
}

export function InsightsOverviewClient({
  overviewData,
  snapshotCount,
}: InsightsOverviewClientProps) {
  const modules = [
    {
      href: '/insights/analysis',
      title: 'Business Analysis',
      description: 'Deep dive YoY performance, revenue trends, division breakdown, and client concentration.',
      icon: TrendingUp,
      badge: 'Core Analytics',
      color: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      accent: 'border-blue-500/20 hover:border-blue-500/40',
    },
    {
      href: '/insights/reports',
      title: 'Insights Reports',
      description: 'Comprehensive financial reports, month-on-month trends, budget analysis, and ledger balances.',
      icon: BarChart3,
      badge: 'Financials',
      color: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
      accent: 'border-violet-500/20 hover:border-violet-500/40',
    },
    {
      href: '/insights/snapshots',
      title: 'Closed Month Snapshots',
      description: 'Locked point-in-time monthly snapshots for historical reporting and audit verification.',
      icon: Camera,
      badge: `${snapshotCount} Saved`,
      color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      accent: 'border-emerald-500/20 hover:border-emerald-500/40',
    },
    {
      href: '/insights/compliance-radar',
      title: 'Compliance Radar',
      description: 'Monitor client compliance status, document expiry timelines, and operational risks.',
      icon: Shield,
      badge: 'Client Health',
      color: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      accent: 'border-amber-500/20 hover:border-amber-500/40',
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* High-level KPI Strip */}
      {overviewData && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Executive KPI Highlights
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Live Performance Data
            </span>
          </div>
          <AnalysisKpiStrip data={overviewData} />
        </section>
      )}

      {/* Reports & Insights Modules Hub Cards */}
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold">Reports & Analytics Hub</h3>
          <p className="text-xs text-muted-foreground">
            Select a module to view detailed performance metrics, generated statements, or audit records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={`group relative flex flex-col justify-between rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md ${mod.accent}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${mod.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {mod.badge}
                    </span>
                  </div>

                  <h4 className="text-base font-semibold group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {mod.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t flex items-center justify-between text-xs font-medium text-primary">
                  <span>Open Module</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
