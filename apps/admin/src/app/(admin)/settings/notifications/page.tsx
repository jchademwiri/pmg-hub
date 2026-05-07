import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = { title: 'Notification Settings' }

const billingAlerts = [
  { label: 'Invoice overdue', description: 'Alert when an invoice passes its due date' },
  { label: 'Invoice paid', description: 'Confirm when a payment is recorded' },
  { label: 'Quote expiring', description: 'Remind when a quote is about to expire' },
  { label: 'Quote accepted', description: 'Notify when a client accepts a quote' },
]

const financeAlerts = [
  { label: 'Monthly snapshot ready', description: 'Notify when a new financial snapshot is created' },
  { label: 'Expense limit exceeded', description: 'Alert when expenses exceed a set threshold' },
  { label: 'New lead added', description: 'Notify when a new lead is created' },
]

const systemAlerts = [
  { label: 'New user invited', description: 'Notify admins when a new user is invited' },
  { label: 'User role changed', description: 'Alert when a user\'s role is updated' },
  { label: 'Failed login attempt', description: 'Security alert for failed sign-in attempts' },
]

function AlertRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <div className="h-5 w-9 rounded-full bg-muted border border-border shrink-0" title="Toggle coming soon" />
    </div>
  )
}

export default function NotificationsSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ChevronLeft className="size-4" />
            Settings
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <Badge variant="secondary" className="text-xs">Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Configure email and in-app alerts</p>
          </div>
        </div>
      </div>

      {/* Delivery channel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Delivery Channel</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Where notifications are sent.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Notification Email</label>
              <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                —
              </div>
              <p className="text-xs text-muted-foreground">All alerts will be sent to this address</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Billing alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Billing Alerts</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Notifications related to invoices and quotes.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="divide-y divide-border pt-2 pb-2">
            {billingAlerts.map((alert) => (
              <AlertRow key={alert.label} {...alert} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Finance alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Finance Alerts</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Notifications for financial events and thresholds.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="divide-y divide-border pt-2 pb-2">
            {financeAlerts.map((alert) => (
              <AlertRow key={alert.label} {...alert} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* System alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">System Alerts</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            User and security-related notifications.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="divide-y divide-border pt-2 pb-2">
            {systemAlerts.map((alert) => (
              <AlertRow key={alert.label} {...alert} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button disabled>Save Changes</Button>
      </div>
    </div>
  )
}
