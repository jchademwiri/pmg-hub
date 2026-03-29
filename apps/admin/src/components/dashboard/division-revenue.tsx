import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { formatZAR, type DivisionRevenue } from '@/lib/financial'

type DivisionRevenueProps = { divisions: DivisionRevenue[] }

export function DivisionRevenue({ divisions }: DivisionRevenueProps) {
  const max = Math.max(...divisions.map(d => d.total), 1)

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-card-foreground text-sm font-medium">
          Revenue by Division
        </CardTitle>
      </CardHeader>
      <CardContent>
        {divisions.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No income recorded yet.</p>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="space-y-3">
              {divisions.map(div => (
                <div key={div.divisionName} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-card-foreground text-sm">{div.divisionName}</span>
                    <span className="text-muted-foreground text-xs">{formatZAR(div.total)}</span>
                  </div>
                  <Progress
                    value={Math.round((div.total / max) * 100)}
                    className="[&>div]:bg-chart-2 bg-muted h-1.5"
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
