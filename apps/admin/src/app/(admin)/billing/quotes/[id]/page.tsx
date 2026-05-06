import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Quotation' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">Quotation <code>{id}</code> detail coming soon.</p>
    </div>
  )
}
