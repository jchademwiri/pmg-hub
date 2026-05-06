import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Invoice' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">Invoice <code>{id}</code> detail coming soon.</p>
    </div>
  )
}
