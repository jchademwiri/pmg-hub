import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Client Statement' }

interface Props {
  params: Promise<{ clientId: string }>
}

export default async function ClientStatementPage({ params }: Props) {
  const { clientId } = await params

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">Statement for client <code>{clientId}</code> coming soon.</p>
    </div>
  )
}
