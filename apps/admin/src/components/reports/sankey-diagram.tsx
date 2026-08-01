'use client'

import { formatZAR } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SankeyDiagramProps {
  revenue: number
  expenses: number
  pmgShare: number
  profitPool: number
  ledgerBalances?: {
    pmg_share: { expected: number; spent: number; available: number }
  }
}

export function SankeyDiagram({
  revenue,
  expenses,
  pmgShare,
  profitPool,
  ledgerBalances,
}: SankeyDiagramProps) {
  const isProfitable = profitPool > 0
  const netRevenue = revenue - pmgShare

  // Percentage distribution calculations relative to Gross Revenue
  const pmgPct = revenue > 0 ? (pmgShare / revenue) * 100 : 0
  const netPct = revenue > 0 ? (netRevenue / revenue) * 100 : 0
  const expPct = revenue > 0 ? (expenses / revenue) * 100 : 0
  const poolPct = revenue > 0 ? (profitPool / revenue) * 100 : 0

  // SVG coordinate configuration
  const width = 840
  const height = 410

  // Nodes definition
  const nodes = [
    // Column 0: Gross
    {
      id: 'gross',
      label: 'Gross Revenue',
      val: revenue,
      pct: '100%',
      x: 50,
      y: 180,
      w: 145,
      h: 48,
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
    },
    
    // Column 1: L1 splits
    { 
      id: 'pmg', 
      label: 'PMG Share', 
      val: pmgShare, 
      pct: `${pmgPct.toFixed(1)}%`,
      x: 340, 
      y: ledgerBalances ? 90 : 110, 
      w: 155, 
      h: ledgerBalances ? 68 : 48, 
      color: 'border-blue-500 bg-blue-500/10 text-blue-500',
      hasBalances: !!ledgerBalances,
      spent: ledgerBalances?.pmg_share.spent,
      available: ledgerBalances?.pmg_share.available,
    },
    { 
      id: 'net', 
      label: 'Net Revenue', 
      val: netRevenue, 
      pct: `${netPct.toFixed(1)}%`,
      x: 340, 
      y: 260, 
      w: 155, 
      h: 48, 
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
    },
    
    // Column 2: L1 Net splits
    { 
      id: 'expenses', 
      label: 'Expenses', 
      val: expenses, 
      pct: `${expPct.toFixed(1)}%`,
      x: 620, 
      y: 110, 
      w: 155, 
      h: 48, 
      color: 'border-amber-500 bg-amber-500/10 text-amber-500',
    },
    { 
      id: 'pool', 
      label: isProfitable ? 'Profit Pool' : 'Net Deficit', 
      val: Math.abs(profitPool), 
      pct: `${poolPct.toFixed(1)}%`,
      x: 620, 
      y: 260, 
      w: 155, 
      h: 48, 
      color: isProfitable 
        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' 
        : 'border-red-500 bg-red-500/10 text-red-500' 
    },
  ]

  const activeNodes = nodes

  // Link helper (cubic bezier link paths)
  const getLinkPath = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = Math.abs(x1 - x0) / 2
    return `M ${x0} ${y0} C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`
  }

  // Links definitions
  const links = [
    // Col 0 -> Col 1
    { source: 'gross', target: 'pmg', val: pmgShare, pct: `${pmgPct.toFixed(1)}%`, color: 'stroke-blue-500/20 dark:stroke-blue-500/10' },
    { source: 'gross', target: 'net', val: netRevenue, pct: `${netPct.toFixed(1)}%`, color: 'stroke-emerald-500/20 dark:stroke-emerald-500/10' },
    
    // Col 1 -> Col 2
    { source: 'net', target: 'expenses', val: expenses, pct: `${expPct.toFixed(1)}%`, color: 'stroke-amber-500/20 dark:stroke-amber-500/10' },
    { source: 'net', target: 'pool', val: Math.abs(profitPool), pct: `${poolPct.toFixed(1)}%`, color: isProfitable ? 'stroke-emerald-500/20 dark:stroke-emerald-500/10' : 'stroke-red-500/20 dark:stroke-red-500/10' },
  ]

  // Max stroke width for styling links
  const maxStroke = 32
  const getStrokeWidth = (val: number) => {
    const ratio = revenue !== 0 ? val / revenue : 0
    return Math.max(2, ratio * maxStroke)
  }

  return (
    <Card className="rounded-xl border border-border bg-gradient-to-tr from-card to-card/75 backdrop-blur-md shadow-none hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span>Allocation Route — Flow & % Distribution</span>
            </CardTitle>
            <CardDescription>
              Visual routing of gross income stream with percentage breakdown across PMG Share, Expenses, and Profit Pool.
            </CardDescription>
          </div>
          
          {/* Summary Percentage Distribution Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
              PMG Share: {pmgPct.toFixed(1)}%
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Expenses: {expPct.toFixed(1)}%
            </span>
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              isProfitable 
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                : "bg-red-500/10 text-red-600 border-red-500/20"
            )}>
              Net Profit: {poolPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="w-full overflow-x-auto">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full min-w-[760px] h-auto overflow-visible select-none"
          >
            {/* Draw Links */}
            {links.map((link, i) => {
              const srcNode = nodes.find(n => n.id === link.source)!
              const tgtNode = nodes.find(n => n.id === link.target)!
              
              // Anchor link positions at middle-right of source, middle-left of target
              const x0 = srcNode.x + srcNode.w
              const y0 = srcNode.y + srcNode.h / 2
              const x1 = tgtNode.x
              const y1 = tgtNode.y + tgtNode.h / 2
              
              const strokeWidth = getStrokeWidth(link.val)
              const midX = (x0 + x1) / 2
              const midY = (y0 + y1) / 2

              return (
                <g key={`link-group-${i}`}>
                  <path
                    d={getLinkPath(x0, y0, x1, y1)}
                    fill="none"
                    className={cn("transition-all duration-300 hover:stroke-opacity-80", link.color)}
                    strokeWidth={strokeWidth}
                    style={{ strokeLinecap: 'round' }}
                  />
                  {/* Link Percentage Label Badge */}
                  <rect
                    x={midX - 18}
                    y={midY - 8}
                    width={36}
                    height={16}
                    rx="8"
                    className="fill-background/90 stroke-border/60 stroke-[1px]"
                  />
                  <text
                    x={midX}
                    y={midY + 3.5}
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-foreground/80 tabular-nums"
                  >
                    {link.pct}
                  </text>
                </g>
              )
            })}

            {/* Draw Nodes */}
            {activeNodes.map((node) => (
              <g key={node.id} className="group/node">
                {/* Outer Box */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={node.h}
                  rx="6"
                  className={cn(
                    "transition-all duration-300 border-[1.5px] stroke-[1.5px] stroke-current fill-card hover:brightness-105 hover:shadow-md",
                    node.color
                  )}
                  style={{ stroke: 'currentColor' }}
                />

                {/* Node Header Label & Percentage Badge */}
                <text
                  x={node.x + 8}
                  y={node.hasBalances ? node.y + 14 : node.y + 16}
                  className="text-[9px] font-semibold fill-muted-foreground group-hover/node:fill-foreground transition-colors"
                >
                  {node.label}
                </text>
                <text
                  x={node.x + node.w - 8}
                  y={node.hasBalances ? node.y + 14 : node.y + 16}
                  textAnchor="end"
                  className="text-[9px] font-bold fill-primary tabular-nums"
                >
                  {node.pct}
                </text>

                {/* Node Value */}
                <text
                  x={node.x + 8}
                  y={node.hasBalances ? node.y + 28 : node.y + 32}
                  className="text-[10px] font-bold tabular-nums fill-foreground"
                >
                  {formatZAR(node.val)}
                </text>

                {/* Secondary States (Withdrawn & Available) */}
                {node.hasBalances && (
                  <>
                    <text
                      x={node.x + 8}
                      y={node.y + 44}
                      className="text-[8px] font-medium fill-muted-foreground tabular-nums"
                    >
                      Withdrawn: {formatZAR(node.spent ?? 0)}
                    </text>
                    <text
                      x={node.x + 8}
                      y={node.y + 55}
                      className={cn(
                        "text-[8px] font-semibold tabular-nums",
                        (node.available ?? 0) >= 0 ? "fill-emerald-500/90 dark:fill-emerald-400/90" : "fill-red-400"
                      )}
                    >
                      Balance: {formatZAR(node.available ?? 0)}
                    </text>
                  </>
                )}
              </g>
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}

