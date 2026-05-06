import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Invoice' }

export default function NewInvoicePage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">New invoice form coming soon.</p>
    </div>
  )
}
