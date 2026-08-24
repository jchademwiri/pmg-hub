'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  ArrowDownLeft,
  TrendingDown,
  Layers,
  Zap,
  Target,
} from 'lucide-react';
import { formatZAR } from '@/lib/format';
import { generateGrowthAdvisoryReport, type GrowthAdvisorResult } from '@/lib/ai/growth-advisor';

interface AiGrowthCockpitProps {
  initialData?: GrowthAdvisorResult | null;
}

export function AiGrowthCockpit({ initialData }: AiGrowthCockpitProps) {
  const [data, setData] = useState<GrowthAdvisorResult | null>(initialData || null);
  const [isPending, startTransition] = useTransition();

  const handleRunAnalysis = () => {
    startTransition(async () => {
      const result = await generateGrowthAdvisoryReport();
      setData(result);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border border-blue-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-bold text-foreground">AI Growth & Runway Advisor</h3>
            {data && (
              <Badge variant={data.isAi ? 'default' : 'secondary'} className="text-xs">
                {data.modelUsed}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Proactive financial health diagnostics, monthly recurring runway forecasting, and
            strategic cashflow optimization powered by Gemini AI.
          </p>
        </div>

        <Button
          onClick={handleRunAnalysis}
          disabled={isPending}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending
            ? 'Generating Analysis...'
            : data
              ? 'Regenerate AI Report'
              : 'Run Growth Analysis'}
        </Button>
      </div>

      {!data && !isPending && (
        <div className="text-center py-16 border border-dashed rounded-xl p-8 bg-muted/20">
          <Sparkles className="h-12 w-12 text-blue-500 mx-auto mb-4 opacity-70 animate-pulse" />
          <h3 className="text-lg font-semibold">AI Growth Intelligence is Ready</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 mb-6">
            Click &quot;Run Growth Analysis&quot; to synthesize your MRR retainers, software burn,
            and open receivables into strategic recommendations.
          </p>
          <Button onClick={handleRunAnalysis} className="gap-2">
            <Zap className="h-4 w-4" /> Run Growth Analysis Now
          </Button>
        </div>
      )}

      {isPending && !data && (
        <div className="text-center py-20">
          <RefreshCw className="h-8 w-8 text-blue-500 mx-auto mb-3 animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">
            Evaluating financial model and synthesizing growth intelligence...
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <Card className="border-blue-500/30 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Executive Synthesis
              </CardDescription>
              <CardTitle className="text-lg">CFO Strategic Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-line border-l-2 border-blue-500 pl-4 py-1 italic bg-blue-500/5 rounded-r-md">
                {data.executiveSummary}
              </div>
            </CardContent>
          </Card>

          {/* Runway Projection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-1">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" /> Inbound Retainers (MRR)
                </CardDescription>
                <CardTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatZAR(data.cashflowRunway.mrr)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] text-muted-foreground">
                Committed client subscriptions
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" /> Software & VPS Burn
                </CardDescription>
                <CardTitle className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {formatZAR(data.cashflowRunway.softwareBurn)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] text-muted-foreground">
                Claude, Antigravity, Hetzner VPS
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-blue-500" /> Net Baseline Surplus
                </CardDescription>
                <CardTitle className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatZAR(data.cashflowRunway.netMonthlyBaseline)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] text-muted-foreground">
                Monthly profit before project fees
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-medium uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" /> 90-Day Projected Cash
                </CardDescription>
                <CardTitle className="text-xl font-bold text-foreground">
                  {formatZAR(data.cashflowRunway.projected90DayCash)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] text-muted-foreground">
                Net 3-month projected cashflow surplus
              </CardContent>
            </Card>
          </div>

          {/* Strategic Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.growthRecommendations.map((rec, i) => (
              <Card
                key={i}
                className="flex flex-col justify-between border-t-4 border-t-blue-500 hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge
                      variant={rec.impact === 'high' ? 'default' : 'secondary'}
                      className="text-[10px] uppercase"
                    >
                      {rec.impact} Impact
                    </Badge>
                    <span className="text-[11px] text-muted-foreground capitalize">
                      {rec.category}
                    </span>
                  </div>
                  <CardTitle className="text-base font-semibold">{rec.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {rec.description}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Receivables Risk & Client Intelligence */}
          {data.clientProfitability.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" /> Client Balance & Cashflow
                  Intelligence
                </CardTitle>
                <CardDescription className="text-xs">
                  Clients with outstanding invoices impacting current cash collection velocity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-2.5">Client Name</th>
                        <th className="px-4 py-2.5">Outstanding Balance</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.clientProfitability.map((c, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium">{c.clientName}</td>
                          <td className="px-4 py-2.5 font-semibold">{formatZAR(c.totalRevenue)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <Badge
                              variant={c.status === 'Overdue Risk' ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {c.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
