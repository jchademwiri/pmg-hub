'use client'

import { useState } from 'react'
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
  const [hoveredId, setHoveredId] = useState<string | null>(null)

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
    {
      id: 'gross',
      label: 'Gross Revenue',
      val: revenue,
      pct: '100%',
      x: 50,
      y: 180,
      w: 155,
      h: 48,
      activeColor: 'border-emerald-500 bg-emerald-500/15 text-emerald-400 stroke-emerald-500',
      activeText: 'fill-emerald-400',
      dimColor: 'border-border/60 bg-card/60 text-muted-foreground stroke-border/60',
    },
    { 
      id: 'pmg', 
      label: 'PMG Share', 
      val: pmgShare, 
      pct: `${pmgPct.toFixed(1)}%`,
      x: 340, 
      y: ledgerBalances ? 90 : 110, 
      w: 160, 
      h: ledgerBalances ? 68 : 48, 
      activeColor: 'border-blue-500 bg-blue-500/15 text-blue-400 stroke-blue-500',
      activeText: 'fill-blue-400',
      dimColor: 'border-border/60 bg-card/60 text-muted-foreground stroke-border/60',
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
      w: 160, 
      h: 48, 
      activeColor: 'border-emerald-500 bg-emerald-500/15 text-emerald-400 stroke-emerald-500',
      activeText: 'fill-emerald-400',
      dimColor: 'border-border/60 bg-card/60 text-muted-foreground stroke-border/60',
    },
    { 
      id: 'expenses', 
      label: 'Expenses', 
      val: expenses, 
      pct: `${expPct.toFixed(1)}%`,
      x: 620, 
      y: 110, 
      w: 160, 
      h: 48, 
      activeColor: 'border-amber-500 bg-amber-500/15 text-amber-400 stroke-amber-500',
      activeText: 'fill-amber-400',
      dimColor: 'border-border/60 bg-card/60 text-muted-foreground stroke-border/60',
    },
    { 
      id: 'pool', 
      label: isProfitable ? 'Profit Pool' : 'Net Deficit', 
      val: Math.abs(profitPool), 
      pct: `${poolPct.toFixed(1)}%`,
      x: 620, 
      y: 260, 
      w: 160, 
      h: 48, 
      activeColor: isProfitable 
        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 stroke-emerald-500' 
        : 'border-red-500 bg-red-500/15 text-red-400 stroke-red-500', 
      activeText: isProfitable ? 'fill-emerald-400' : 'fill-red-400',
      dimColor: 'border-border/60 bg-card/60 text-muted-foreground stroke-border/60',
    },
  ]

  // Links definitions
  const links = [
    { 
      id: 'link-gross-pmg',
      source: 'gross', 
      target: 'pmg', 
      val: pmgShare, 
      pct: `${pmgPct.toFixed(1)}%`, 
      activeStroke: 'stroke-blue-500/70 dark:stroke-blue-400/80',
      dimStroke: 'stroke-muted-foreground/20 dark:stroke-border/40',
    },
    { 
      id: 'link-gross-net',
      source: 'gross', 
      target: 'net', 
      val: netRevenue, 
      pct: `${netPct.toFixed(1)}%`, 
      activeStroke: 'stroke-emerald-500/70 dark:stroke-emerald-400/80',
      dimStroke: 'stroke-muted-foreground/20 dark:stroke-border/40',
    },
    { 
      id: 'link-net-expenses',
      source: 'net', 
      target: 'expenses', 
      val: expenses, 
      pct: `${expPct.toFixed(1)}%`, 
      activeStroke: 'stroke-amber-500/70 dark:stroke-amber-400/80',
      dimStroke: 'stroke-muted-foreground/20 dark:stroke-border/40',
    },
    { 
      id: 'link-net-pool',
      source: 'net', 
      target: 'pool', 
      val: Math.abs(profitPool), 
      pct: `${poolPct.toFixed(1)}%`, 
      activeStroke: isProfitable ? 'stroke-emerald-500/70 dark:stroke-emerald-400/80' : 'stroke-red-500/70 dark:stroke-red-400/80',
      dimStroke: 'stroke-muted-foreground/20 dark:stroke-border/40',
    },
  ]

  // Link helper (cubic bezier link paths)
  const getLinkPath = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = Math.abs(x1 - x0) / 2
    return `M ${x0} ${y0} C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`
  }

  // Max stroke width for styling links
  const maxStroke = 32
  const getStrokeWidth = (val: number) => {
    const ratio = revenue !== 0 ? val / revenue : 0
    return Math.max(3, ratio * maxStroke)
  }

  // Hover helper logic
  const isLinkActive = (link: typeof links[0]) => {
    if (!hoveredId) return false
    if (hoveredId === link.id) return true
    return hoveredId === link.source || hoveredId === link.target
  }

  const isNodeActive = (nodeId: string) => {
    if (!hoveredId) return false
    if (hoveredId === nodeId) return true
    const activeLink = links.find((l) => l.id === hoveredId)
    if (activeLink) return activeLink.source === nodeId || activeLink.target === nodeId
    return links.some((l) => (l.source === hoveredId && l.target === nodeId) || (l.target === hoveredId && l.source === nodeId))
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
              Interactive income flow routing. Hover over nodes or flow lines to highlight distribution paths.
            </CardDescription>
          </div>
          
          {/* Summary Percentage Distribution Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              PMG Share: {pmgPct.toFixed(1)}%
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Expenses: {expPct.toFixed(1)}%
            </span>
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              isProfitable 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
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
            {links.map((link) => {
              const srcNode = nodes.find((n) => n.id === link.source)!
              const tgtNode = nodes.find((n) => n.id === link.target)!
              
              const x0 = srcNode.x + srcNode.w
              const y0 = srcNode.y + srcNode.h / 2
              const x1 = tgtNode.x
              const y1 = tgtNode.y + tgtNode.h / 2
              
              const baseWidth = getStrokeWidth(link.val)
              const active = isLinkActive(link)
              const strokeWidth = active ? baseWidth + 3 : baseWidth
              const midX = (x0 + x1) / 2
              const midY = (y0 + y1) / 2

              return (
                <g 
                  key={link.id} 
                  className="cursor-pointer group/link"
                  onMouseEnter={() => setHoveredId(link.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <path
                    d={getLinkPath(x0, y0, x1, y1)}
                    fill="none"
                    className={cn(
                      "transition-all duration-300",
                      active ? link.activeStroke : link.dimStroke
                    )}
                    strokeWidth={strokeWidth}
                    style={{ strokeLinecap: 'round' }}
                  />
                  {/* Link Percentage Label Badge */}
                  <rect
                    x={midX - 20}
                    y={midY - 9}
                    width={40}
                    height={18}
                    rx="9"
                    className={cn(
                      "transition-all duration-300 stroke-[1px]",
                      active 
                        ? "fill-card stroke-primary shadow-sm" 
                        : "fill-muted/70 dark:fill-zinc-900/80 stroke-border/50"
                    )}
                  />
                  <text
                    x={midX}
                    y={midY + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn(
                      "text-[9px] font-bold tabular-nums transition-colors duration-300",
                      active ? "fill-foreground" : "fill-muted-foreground/80"
                    )}
                  >
                    {link.pct}
                  </text>
                </g>
              )
            })}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const active = isNodeActive(node.id)

              return (
                <g 
                  key={node.id} 
                  className="cursor-pointer group/node"
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Outer Box */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.w}
                    height={node.h}
                    rx="8"
                    className={cn(
                      "transition-all duration-300 border-[1.5px] stroke-[1.5px]",
                      active ? node.activeColor : node.dimColor
                    )}
                  />

                  {/* Node Label */}
                  <text
                    x={node.x + 10}
                    y={node.y + 15}
                    className={cn(
                      "text-[9.5px] font-semibold transition-colors duration-300",
                      active ? "fill-foreground" : "fill-muted-foreground/75"
                    )}
                  >
                    {node.label}
                  </text>

                  {/* Vertically Centered Percentage Badge on Card */}
                  <g>
                    <rect
                      x={node.x + node.w - 48}
                      y={node.y + node.h / 2 - 10}
                      width={38}
                      height={20}
                      rx="10"
                      className={cn(
                        "transition-all duration-300 stroke-[1px]",
                        active 
                          ? "fill-card/90 stroke-current shadow-sm" 
                          : "fill-muted/60 dark:fill-zinc-800/80 stroke-border/50"
                      )}
                    />
                    <text
                      x={node.x + node.w - 29}
                      y={node.y + node.h / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={cn(
                        "text-[9.5px] font-bold tabular-nums transition-colors duration-300",
                        active ? node.activeText : "fill-muted-foreground/80"
                      )}
                    >
                      {node.pct}
                    </text>
                  </g>

                  {/* Node Value */}
                  <text
                    x={node.x + 10}
                    y={node.hasBalances ? node.y + 30 : node.y + 33}
                    className={cn(
                      "text-[10.5px] font-bold tabular-nums transition-colors duration-300",
                      active ? "fill-foreground" : "fill-foreground/80"
                    )}
                  >
                    {formatZAR(node.val)}
                  </text>

                  {/* Secondary States (Withdrawn & Available) */}
                  {node.hasBalances && (
                    <>
                      <text
                        x={node.x + 10}
                        y={node.y + 46}
                        className="text-[8px] font-medium fill-muted-foreground/75 tabular-nums"
                      >
                        Withdrawn: {formatZAR(node.spent ?? 0)}
                      </text>
                      <text
                        x={node.x + 10}
                        y={node.y + 57}
                        className={cn(
                          "text-[8px] font-semibold tabular-nums transition-colors",
                          active
                            ? (node.available ?? 0) >= 0 ? "fill-emerald-400" : "fill-red-400"
                            : (node.available ?? 0) >= 0 ? "fill-emerald-500/80" : "fill-red-400/80"
                        )}
                      >
                        Balance: {formatZAR(node.available ?? 0)}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}

