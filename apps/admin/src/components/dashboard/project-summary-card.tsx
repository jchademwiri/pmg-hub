'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CalendarClock,
  AlertTriangle,
  Clock,
  CalendarRange,
  ListTodo,
} from 'lucide-react'

export type TenderSummaryData = {
  inProgress: number
  planned: number
  upcomingDeadlines: number
  atRisk: number
  overdue: number
}

type StatItem = {
  key: string
  label: string
  value: number
  icon: React.ReactNode
  variant: 'default' | 'secondary' | 'destructive' | 'success' | 'outline' | 'ghost' | 'link'
  highlight?: boolean
}

export function ProjectSummaryCard({ data }: { data: TenderSummaryData }) {
  const total = data.inProgress + data.planned

  const stats: StatItem[] = [
    {
      key: 'inProgress',
      label: 'In Progress',
      value: data.inProgress,
      icon: <Clock className="size-3.5" />,
      variant: 'success',
      highlight: data.inProgress > 0,
    },
    {
      key: 'planned',
      label: 'Planned',
      value: data.planned,
      icon: <ListTodo className="size-3.5" />,
      variant: 'secondary',
    },
    {
      key: 'upcomingDeadlines',
      label: 'Deadlines ≤ 7d',
      value: data.upcomingDeadlines,
      icon: <CalendarRange className="size-3.5" />,
      variant: 'outline',
      highlight: data.upcomingDeadlines > 0,
    },
    {
      key: 'atRisk',
      label: 'At Risk',
      value: data.atRisk,
      icon: <AlertTriangle className="size-3.5" />,
      variant: 'destructive',
      highlight: data.atRisk > 0,
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: data.overdue,
      icon: <CalendarClock className="size-3.5" />,
      variant: 'destructive',
      highlight: data.overdue > 0,
    },
  ]

  return (
    <Card className="rounded-xl border border-border bg-gradient-to-tr from-card to-card/75 backdrop-blur-md shadow-none hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-card-foreground text-sm font-semibold tracking-tight">
            Tender Scheduling
          </CardTitle>
          {total > 0 && (
            <span className="text-xs text-muted-foreground/75 font-medium">
              {total} active
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 && data.overdue === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No active tenders.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Metric bubbles row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
              {stats.map((stat) => (
                <div
                  key={stat.key}
                  className={`rounded-lg border p-2 text-center transition-all duration-300 hover:scale-[1.04] ${
                    stat.highlight
                      ? stat.variant === 'destructive'
                        ? 'bg-red-500/10 border-red-500/20'
                        : stat.variant === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-chart-2/10 border-chart-2/20'
                      : 'bg-muted/30 border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <span
                      className={`${
                        stat.highlight
                          ? stat.variant === 'destructive'
                            ? 'text-red-400'
                            : stat.variant === 'success'
                              ? 'text-emerald-400'
                              : 'text-chart-2'
                          : 'text-muted-foreground/50'
                      }`}
                    >
                      {stat.icon}
                    </span>
                    <span
                      className={`text-base font-bold tabular-nums ${
                        stat.highlight
                          ? stat.variant === 'destructive'
                            ? 'text-red-500'
                            : stat.variant === 'success'
                              ? 'text-emerald-500'
                              : 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {stat.value}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/70 leading-tight truncate">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div className="flex items-center gap-2 mt-0.5">
              <a
                href="/projects"
                className="text-[10px] sm:text-xs text-muted-foreground/60 hover:text-foreground transition-colors underline underline-offset-4 decoration-muted-foreground/20 hover:decoration-foreground/40"
              >
                View all tenders →
              </a>
              {data.atRisk > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                  {data.atRisk} at risk
                </Badge>
              )}
              {data.overdue > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                  {data.overdue} overdue
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
