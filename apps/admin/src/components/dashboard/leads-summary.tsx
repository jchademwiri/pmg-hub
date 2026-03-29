import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { type LeadStatusCount } from '@/lib/financial'

type LeadsSummaryProps = { leads: LeadStatusCount[] }

const BADGE_CLASS: Record<string, string> = {
  new:       'bg-chart-2/20 text-chart-2 border-chart-2/30',
  contacted: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
  converted: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
  lost:      'bg-muted text-muted-foreground border-border',
}

const PROGRESS_CLASS: Record<string, string> = {
  new:       '[&>div]:bg-chart-2 bg-muted h-1.5',
  contacted: '[&>div]:bg-chart-1 bg-muted h-1.5',
  converted: '[&>div]:bg-chart-3 bg-muted h-1.5',
  lost:      '[&>div]:bg-muted-foreground/30 bg-muted h-1.5',
}

export function LeadsSummary({ leads }: LeadsSummaryProps) {
  const total = leads.reduce((sum, l) => sum + l.count, 0)

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-card-foreground text-sm font-medium">
          Leads by Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No leads yet.</p>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="space-y-3">
              {leads.map(lead => (
                <div key={lead.status} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={BADGE_CLASS[lead.status] ?? BADGE_CLASS.lost}
                    >
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{lead.count}</span>
                  </div>
                  <Progress
                    value={Math.round((lead.count / total) * 100)}
                    className={PROGRESS_CLASS[lead.status] ?? PROGRESS_CLASS.lost}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
