'use client'

import { useEffect, useState } from 'react'
import type { MoMSnapshot } from '@/lib/financial'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Info, Sparkles, Loader2 } from 'lucide-react'
import { generateCommentaryAction } from '@/app/actions/reports'

interface ReportCommentaryProps {
  momData: MoMSnapshot[]
  currentMonthLabel: string
  previousMonthLabel: string
}

export function ReportCommentary({
  momData,
  currentMonthLabel,
  previousMonthLabel,
}: ReportCommentaryProps) {
  const [loading, setLoading] = useState(momData.length > 0)
  const [commentary, setCommentary] = useState<string | null>(null)
  const [isAi, setIsAi] = useState(false)

  useEffect(() => {
    let active = true

    if (momData.length === 0) {
      return () => {
        active = false
      }
    }

    generateCommentaryAction(momData, { currentMonthLabel, previousMonthLabel })
      .then((res) => {
        if (active) {
          setCommentary(res.text)
          setIsAi(res.isAi)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) {
          setCommentary('Failed to generate commentary.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [currentMonthLabel, momData, previousMonthLabel])

  if (momData.length === 0) return null

  return (
    <Card className="rounded-xl border border-border bg-gradient-to-tr from-card to-card/75 backdrop-blur-md shadow-none hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-blue-600" />
            <span>Executive Commentary — Month-over-Month</span>
          </div>
          {isAi && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 px-2 py-0.5 rounded-full border border-purple-200/50">
              <Sparkles className="size-3" />
              AI Generated
            </div>
          )}
        </CardTitle>
        <CardDescription>
          Executive variance analysis comparing performance indicators with the preceding period.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-foreground min-h-[60px] flex items-center">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="size-4 animate-spin text-blue-600" />
            <span className="text-xs">Generating report analysis...</span>
          </div>
        ) : (
          <p className="whitespace-pre-line leading-relaxed">{commentary}</p>
        )}
      </CardContent>
    </Card>
  )
}
