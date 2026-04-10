'use client'

import { useRouter } from 'next/navigation'

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
    router.push('/leads?' + params.toString())
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg w-fit border border-border">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => handleTabChange(tab.key)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
            activeTab === tab.key
              ? 'bg-card text-foreground shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          {tab.label}
          <span
            className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium min-w-5 ${
              activeTab === tab.key
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {counts[tab.key as keyof typeof counts]}
          </span>
        </button>
      ))}
    </div>
  )
}
