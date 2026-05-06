import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Quotation' }

export default function NewQuotePage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">New quotation form coming soon.</p>
    </div>
  )
}
