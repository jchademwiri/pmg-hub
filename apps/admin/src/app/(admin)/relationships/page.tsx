import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Relationships' }

export default function RelationshipsOverviewPage() {
  return (
    <ComingSoonPage
      title="Relationships"
      purpose="Client, lead, and division relationship management."
      description="This overview will summarise relationship activity across clients, leads, and divisions with quick links into each relationship workspace."
      backHref="/relationships"
      backLabel="Back to Relationships"
    />
  )
}
