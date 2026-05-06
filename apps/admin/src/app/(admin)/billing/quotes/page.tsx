import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Quotations' }

export default function QuotesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Quotations will appear here.</p>
      </div>
    </div>
  )
}
