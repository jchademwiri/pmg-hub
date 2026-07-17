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

  // SVG coordinate configuration
  const width = 800
  const height = 400

  // Nodes definition
  const nodes = [
    // Column 0: Gross
    { id: 'gross', label: 'Gross Revenue', val: revenue, x: 80, y: 180, w: 120, h: 42, color: 'border-emerald-500 bg-emerald-500/10 text-emerald-500' },
    
    // Column 1: L1 splits
    { 
      id: 'pmg', 
      label: 'PMG Share (25%)', 
      val: pmgShare, 
      x: 340, 
      y: ledgerBalances ? 100 : 120, 
      w: 125, 
      h: ledgerBalances ? 64 : 42, 
      color: 'border-blue-500 bg-blue-500/10 text-blue-500',
      hasBalances: !!ledgerBalances,
      spent: ledgerBalances?.pmg_share.spent,
      available: ledgerBalances?.pmg_share.available,
    },
    { id: 'net', label: 'Net Revenue', val: netRevenue, x: 340, y: 260, w: 120, h: 42, color: 'border-emerald-500 bg-emerald-500/10 text-emerald-500' },
    
    // Column 2: L1 Net splits
    { id: 'expenses', label: 'Expenses', val: expenses, x: 600, y: 120, w: 120, h: 42, color: 'border-amber-500 bg-amber-500/10 text-amber-500' },
    { 
      id: 'pool', 
      label: isProfitable ? 'Profit Pool' : 'Net Deficit', 
      val: Math.abs(profitPool), 
      x: 600, 
      y: 260, 
      w: 120, 
      h: 42, 
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
    { source: 'gross', target: 'pmg', val: pmgShare, color: 'stroke-blue-500/20 dark:stroke-blue-500/10' },
    { source: 'gross', target: 'net', val: netRevenue, color: 'stroke-emerald-500/20 dark:stroke-emerald-500/10' },
    
    // Col 1 -> Col 2
    { source: 'net', target: 'expenses', val: expenses, color: 'stroke-amber-500/20 dark:stroke-amber-500/10' },
    { source: 'net', target: 'pool', val: Math.abs(profitPool), color: isProfitable ? 'stroke-emerald-500/20 dark:stroke-emerald-500/10' : 'stroke-red-500/20 dark:stroke-red-500/10' },
  ]

  // Max stroke width for styling links
  const maxStroke = 30
  const getStrokeWidth = (val: number) => {
    const ratio = revenue !== 0 ? val / revenue : 0
    return Math.max(2, ratio * maxStroke)
  }

  return (
    <Card className="rounded-xl border border-border bg-gradient-to-tr from-card to-card/75 backdrop-blur-md shadow-none hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span>Allocation Route — Flow Diagram</span>
        </CardTitle>
        <CardDescription>
          Visual routing of gross income stream flowing down to PMG Share, expenses, and net profit.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="w-full overflow-x-auto">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full min-w-[720px] h-auto overflow-visible select-none"
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

              return (
                <path
                  key={`link-${i}`}
                  d={getLinkPath(x0, y0, x1, y1)}
                  fill="none"
                  className={cn("transition-all duration-300 hover:stroke-opacity-80", link.color)}
                  strokeWidth={strokeWidth}
                  style={{ strokeLinecap: 'round' }}
                />
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

                {/* Node Label */}
                <text
                  x={node.x + 8}
                  y={node.hasBalances ? node.y + 14 : node.y + 16}
                  className="text-[9px] font-semibold fill-muted-foreground group-hover/node:fill-foreground transition-colors"
                >
                  {node.label}
                </text>

                {/* Node Value */}
                <text
                  x={node.x + 8}
                  y={node.hasBalances ? node.y + 26 : node.y + 30}
                  className="text-[10px] font-bold tabular-nums fill-foreground"
                >
                  {formatZAR(node.val)}
                </text>

                {/* Secondary States (Withdrawn & Available) */}
                {node.hasBalances && (
                  <>
                    <text
                      x={node.x + 8}
                      y={node.y + 41}
                      className="text-[8px] font-medium fill-muted-foreground tabular-nums"
                    >
                      Withdrawn: {formatZAR(node.spent ?? 0)}
                    </text>
                    <text
                      x={node.x + 8}
                      y={node.y + 52}
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

