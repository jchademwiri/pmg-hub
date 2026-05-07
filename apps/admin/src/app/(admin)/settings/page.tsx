import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Building2,
  Bell,
  Shield,
  Palette,
  Receipt,
  Database,
  ChevronRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Settings' }

const sections = [
  {
    id: 'organisation',
    icon: Building2,
    title: 'Organisation',
    description: 'Company name, logo, address, and contact details',
    badge: null,
  },
  {
    id: 'billing',
    icon: Receipt,
    title: 'Billing & Invoicing',
    description: 'Invoice numbering, VAT rate, payment terms, and default notes',
    badge: null,
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications',
    description: 'Email alerts for overdue invoices, new leads, and monthly snapshots',
    badge: 'Soon',
  },
  {
    id: 'appearance',
    icon: Palette,
    title: 'Appearance',
    description: 'Theme preferences and display density',
    badge: 'Soon',
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security',
    description: 'Session management, two-factor authentication, and audit log',
    badge: 'Soon',
  },
  {
    id: 'data',
    icon: Database,
    title: 'Data & Exports',
    description: 'Export financial data, manage backups, and data retention policies',
    badge: 'Soon',
  },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your organisation preferences and system configuration
        </p>
      </div>

      {/* Settings nav cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.id} href={`/settings/${section.id}`}>
            <Card
              size="sm"
              className="cursor-pointer transition-colors hover:bg-muted/40"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <section.icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <CardTitle>{section.title}</CardTitle>
                        {section.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

    </div>
  )
}
