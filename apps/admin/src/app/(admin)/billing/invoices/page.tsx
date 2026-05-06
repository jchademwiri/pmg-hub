import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Invoices' }

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Invoices will appear here.</p>
      </div>
    </div>
  )
}
