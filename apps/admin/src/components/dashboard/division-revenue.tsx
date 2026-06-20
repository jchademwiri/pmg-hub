import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatZAR } from '@/lib/format'
import type { DivisionRevenue } from '@/lib/financial'

type DivisionRevenueProps = {
  divisions: DivisionRevenue[]
  divisionExpenseMap: Map<string, number>
}

export function DivisionRevenue({ divisions, divisionExpenseMap }: DivisionRevenueProps) {
  if (divisions.length === 0) {
    return (
      <Card className="rounded-xl border border-border bg-card shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-card-foreground text-sm font-medium">
            Revenue by Division
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground/50 text-xs">No income recorded yet.</p>
        </CardContent>
      </Card>
    )
  }

  // Find max revenue for proportional bars
  const maxRevenue = Math.max(...divisions.map((d) => d.total), 1)

  // Attach expenses and compute net per division
  const enriched = divisions.map((div) => {
    const expenses = divisionExpenseMap.get(div.divisionName) ?? 0
    const net = div.total - expenses
    return { ...div, expenses, net }
  })

  return (
    <Card className="rounded-xl border border-border bg-gradient-to-tr from-card to-card/75 backdrop-blur-md shadow-none hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground text-sm font-semibold tracking-tight">
            Revenue by Division
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/75 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-chart-2" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/75 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-chart-3" />
              Expenses
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-64">
          <div className="space-y-4">
            {enriched.map((div) => {
              const revPct  = (div.total    / maxRevenue) * 100
              const expPct  = (div.expenses / maxRevenue) * 100
              const isProfit = div.net >= 0

              const content = (
                <>
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <span className="text-card-foreground text-sm font-medium group-hover/row:text-primary transition-colors">
                      {div.divisionName}
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isProfit ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {isProfit ? '+' : ''}{formatZAR(div.net)} net
                    </span>
                  </div>
                  {/* Revenue bar */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-chart-2 transition-all duration-500"
                          style={{ width: `${revPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold tabular-nums w-24 text-right">
                        {formatZAR(div.total)}
                      </span>
                    </div>
                    {/* Expense bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-chart-3 transition-all duration-500"
                          style={{ width: `${expPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-red-600 font-semibold tabular-nums w-24 text-right">
                        {formatZAR(div.expenses)}
                      </span>
                    </div>
                  </div>
                </>
              )

              if (div.divisionId) {
                return (
                  <Link
                    key={div.divisionName}
                    href={`/billing/invoices?divisionId=${div.divisionId}`}
                    className="block space-y-1.5 transition-all duration-200 hover:translate-x-0.5 group/row"
                  >
                    {content}
                  </Link>
                )
              }

              return (
                <div
                  key={div.divisionName}
                  className="block space-y-1.5"
                >
                  {content}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}