'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface LeadStatusTabsProps {
  counts: { all: number; new: number; contacted: number; converted: number; lost: number }
  currentStatus?: string
  currentDivisionId?: string
  currentSource?: string
}

const TABS: { key: string; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'new',       label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost',      label: 'Lost' },
]

export function LeadStatusTabs({
  counts,
  currentStatus,
  currentDivisionId,
  currentSource,
}: LeadStatusTabsProps) {
  const router = useRouter()
  const activeTab = currentStatus ?? 'all'

  function handleTabChange(value: string) {
    const params = new URLSearchParams()
    if (value !== 'all') params.set('status', value)
    if (currentDivisionId) params.set('divisionId', currentDivisionId)
    if (currentSource) params.set('source', currentSource)
    const qs = params.toString()
    router.push(qs ? `/relationships/leads?${qs}` : '/relationships/leads')
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
            {tab.label}
            <Badge variant="secondary">{counts[tab.key as keyof typeof counts]}</Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
