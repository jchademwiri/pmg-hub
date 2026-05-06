import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">Settings coming soon.</p>
    </div>
  )
}
