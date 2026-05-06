import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Statements' }

export default function StatementsPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">Client statements will appear here.</p>
    </div>
  )
}
