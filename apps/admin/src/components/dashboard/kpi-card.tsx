import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card'
import { formatZAR } from '@/lib/financial'

type KpiCardProps = {
  label: string
  value: number
  sub?: string
  icon?: React.ReactNode
}

export function KpiCard({ label, value, sub, icon }: KpiCardProps) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <CardDescription className="text-muted-foreground text-sm flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-foreground text-2xl font-semibold">{formatZAR(value)}</p>
        {sub && <p className="text-muted-foreground/70 text-xs mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}
