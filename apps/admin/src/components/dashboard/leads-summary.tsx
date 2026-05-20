import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { type LeadStatusCount } from '@/lib/financial'

type LeadsSummaryProps = { leads: LeadStatusCount[] }

const STATUS_CONFIG: Record<
  string,
  { label: string; barClass: string; badgeClass: string; order: number }
> = {
  new:       { label: 'New',       barClass: '[&>div]:bg-chart-2 bg-muted h-1.5', badgeClass: 'bg-chart-2/20 text-chart-2 border-chart-2/30',   order: 1 },
  contacted: { label: 'Contacted', barClass: '[&>div]:bg-chart-1 bg-muted h-1.5', badgeClass: 'bg-chart-1/20 text-chart-1 border-chart-1/30',   order: 2 },
  converted: { label: 'Converted', barClass: '[&>div]:bg-emerald-500 bg-muted h-1.5', badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', order: 3 },
  lost:      { label: 'Lost',      barClass: '[&>div]:bg-muted-foreground/30 bg-muted h-1.5', badgeClass: 'bg-muted text-muted-foreground border-border', order: 4 },
}

export function LeadsSummary({ leads }: LeadsSummaryProps) {
  const total     = leads.reduce((sum, l) => sum + l.count, 0)
  const converted = leads.find((l) => l.status === 'converted')?.count ?? 0
  const lost      = leads.find((l) => l.status === 'lost')?.count ?? 0
  const newLeads  = leads.find((l) => l.status === 'new')?.count ?? 0
  const closedTotal = converted + lost
  const conversionRate = closedTotal > 0 ? Math.round((converted / closedTotal) * 100) : null

  // Sort by predefined order
  const sorted = [...leads].sort(
    (a, b) =>
      (STATUS_CONFIG[a.status]?.order ?? 99) -
      (STATUS_CONFIG[b.status]?.order ?? 99)
  )

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-card-foreground text-sm font-medium">
            Leads by Status
          </CardTitle>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              {total} total
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No leads yet.</p>
        ) : (
          <div className="space-y-4">
            {/* Summary metrics row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-chart-2/10 border border-chart-2/20 p-2.5 text-center">
                <p className="text-chart-2 text-xl font-bold tabular-nums">{newLeads}</p>
                <p className="text-chart-2/70 text-xs mt-0.5">New</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-center">
                <p className="text-emerald-400 text-xl font-bold tabular-nums">{converted}</p>
                <p className="text-emerald-400/70 text-xs mt-0.5">Converted</p>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-2.5 text-center">
                {conversionRate !== null ? (
                  <>
                    <p className="text-foreground text-xl font-bold tabular-nums">{conversionRate}%</p>
                    <p className="text-muted-foreground text-xs mt-0.5">Win rate</p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-xl font-bold">-</p>
                    <p className="text-muted-foreground text-xs mt-0.5">Win rate</p>
                  </>
                )}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="space-y-2.5">
              {sorted.map((lead) => {
                const config = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.lost
                const pct = total > 0 ? Math.round((lead.count / total) * 100) : 0

                return (
                  <div key={lead.status} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={config.badgeClass}
                      >
                        {config.label}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {pct}%
                        </span>
                        <span className="text-xs font-medium text-foreground tabular-nums w-4 text-right">
                          {lead.count}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={pct}
                      className={config.barClass}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}