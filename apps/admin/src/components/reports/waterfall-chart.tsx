'use client'

import { formatZAR } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface WaterfallChartProps {
  revenue: number
  expenses: number
  pmgShare: number
  profitPool: number
}

export function WaterfallChart({
  revenue,
  expenses,
  pmgShare,
  profitPool,
}: WaterfallChartProps) {
  // Define steps
  // 1. Gross Revenue (+)
  // 2. PMG Share (25%) (-)
  // 3. Operating Expenses (-)
  // 4. Net Profit Pool (=)
  const steps = [
    {
      label: 'Gross Revenue',
      value: revenue,
      type: 'start' as const,
      color: 'fill-emerald-500 dark:fill-emerald-400',
      textClass: 'text-emerald-500 dark:text-emerald-400',
    },
    {
      label: 'PMG Share (25%)',
      value: -pmgShare,
      type: 'decrease' as const,
      color: 'fill-blue-500 dark:fill-blue-400',
      textClass: 'text-blue-500 dark:text-blue-400',
    },
    {
      label: 'Operating Expenses',
      value: -expenses,
      type: 'decrease' as const,
      color: 'fill-amber-500 dark:fill-amber-400',
      textClass: 'text-amber-500 dark:text-amber-400',
    },
    {
      label: profitPool >= 0 ? 'Net Profit Pool' : 'Net Deficit Pool',
      value: profitPool,
      type: 'total' as const,
      color: profitPool >= 0 
        ? 'fill-emerald-500 dark:fill-emerald-400'
        : 'fill-red-500 dark:fill-red-400',
      textClass: profitPool >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
    },
  ]

  // Find max value for scaling
  const maxVal = Math.max(revenue, Math.abs(profitPool), expenses + pmgShare)
  const chartHeight = 220
  const chartWidth = 500
  const paddingY = 30
  const usableHeight = chartHeight - paddingY * 2

  // Math helper to map values to Y scale
  const getY = (val: number) => {
    // 0 is at bottom (or middle if we have negative final values)
    // Scale so maxVal is at paddingY, 0 is at chartHeight - paddingY
    const ratio = val / maxVal
    return chartHeight - paddingY - ratio * usableHeight
  }

  // Calculate coordinates for the waterfall columns
  let currentY = getY(revenue) // Start of waterfall top
  const columns = steps.map((step, i) => {
    const colWidth = 60
    const colGap = 40
    const x = 40 + i * (colWidth + colGap)
    
    let y = 0
    let h = 0
    let topConnectorY = 0

    if (step.type === 'start') {
      y = getY(step.value)
      h = getY(0) - y
      topConnectorY = y
    } else if (step.type === 'decrease') {
      const prevTotal = i === 1 ? revenue : revenue - pmgShare
      const newTotal = prevTotal - Math.abs(step.value)
      y = getY(prevTotal)
      h = getY(newTotal) - y
      topConnectorY = getY(newTotal)
      currentY = getY(newTotal) // Update running total Y
    } else {
      // Total column (Profit Pool)
      const val = step.value
      if (val >= 0) {
        y = getY(val)
        h = getY(0) - y
      } else {
        y = getY(0)
        h = getY(val) - y
      }
      topConnectorY = y
    }

    return {
      ...step,
      x,
      y,
      h: Math.max(2, h), // Ensure at least 2px visible
      width: colWidth,
      topConnectorY,
    }
  })

  return (
    <Card className="rounded-xl border border-border bg-gradient-to-tr from-card to-card/75 backdrop-blur-md shadow-none hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span>Waterfall Ledger — Cash Flow Analysis</span>
        </CardTitle>
        <CardDescription>
          Deconstruction of Gross Revenue showing PMG Share contribution, operating cost reductions, and net pool yield.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="w-full overflow-x-auto">
          <svg 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
            className="w-full min-w-[460px] h-auto overflow-visible select-none"
          >
            {/* Horizontal grid lines */}
            <line 
              x1="20" 
              y1={getY(0)} 
              x2={chartWidth - 20} 
              y2={getY(0)} 
              stroke="var(--border)" 
              strokeWidth="1.5" 
              strokeDasharray="2 2" 
            />
            <line 
              x1="20" 
              y1={getY(revenue)} 
              x2={chartWidth - 20} 
              y2={getY(revenue)} 
              stroke="var(--border)" 
              strokeWidth="1" 
              strokeOpacity="0.4"
              strokeDasharray="3 3" 
            />

            {/* Render connector lines */}
            {columns.map((col, i) => {
              if (i === columns.length - 1) return null
              const nextCol = columns[i + 1]
              const connectorY = i === 0 ? col.y : col.topConnectorY
              return (
                <line
                  key={`conn-${i}`}
                  x1={col.x + col.width}
                  y1={connectorY}
                  x2={nextCol.x}
                  y2={connectorY}
                  stroke="var(--muted-foreground)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  strokeOpacity="0.6"
                />
              )
            })}

            {/* Render columns */}
            {columns.map((col) => (
              <g key={col.label} className="group/col cursor-pointer">
                {/* Main Bar */}
                <rect
                  x={col.x}
                  y={col.y}
                  width={col.width}
                  height={col.h}
                  rx="6"
                  className={cn(
                    "transition-all duration-300 origin-bottom hover:brightness-110",
                    col.color
                  )}
                />

                {/* Amount Labels */}
                <text
                  x={col.x + col.width / 2}
                  y={col.y - 8}
                  textAnchor="middle"
                  className="text-[10px] font-bold tabular-nums fill-white"
                >
                  {formatZAR(Math.abs(col.value))}
                </text>

                {/* Column Labels */}
                <text
                  x={col.x + col.width / 2}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className="text-[9px] font-medium fill-muted-foreground group-hover/col:fill-foreground transition-colors"
                >
                  {col.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
