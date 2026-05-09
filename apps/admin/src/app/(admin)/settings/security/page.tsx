import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Shield, LogOut, KeyRound, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = { title: 'Security Settings' }

// Placeholder session rows
const sessions = [
  { device: 'Chrome on Windows', location: 'Current session', lastActive: 'Now', current: true },
]

// Placeholder audit log rows
const auditLog = [
  { action: 'Signed in', user: '—', timestamp: '—', ip: '—' },
  { action: 'Invoice created', user: '—', timestamp: '—', ip: '—' },
  { action: 'User invited', user: '—', timestamp: '—', ip: '—' },
]

export default function SecuritySettingsPage() {
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
          <Shield className="size-4 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Security</h2>
              <Badge variant="secondary" className="text-xs">Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Sessions, authentication, and audit log</p>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Password</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your account password.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Current Password</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  ••••••••
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">New Password</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  —
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Confirm New Password</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  —
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" disabled title="Coming soon">
                <KeyRound className="size-4" />
                Update Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Two-factor auth */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Two-Factor Authentication</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an extra layer of security to your account.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex items-center justify-between gap-4 pt-6 pb-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Authenticator App</span>
              <span className="text-xs text-muted-foreground">Use an app like Google Authenticator or Authy</span>
            </div>
            <Button variant="outline" size="sm" disabled title="Coming soon">Enable 2FA</Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Active sessions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Active Sessions</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Devices currently signed in to your account.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col divide-y divide-border pt-2 pb-2">
            {sessions.map((session) => (
              <div key={session.device} className="flex items-center justify-between gap-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{session.device}</span>
                    {session.current && (
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {session.location} · Last active {session.lastActive}
                  </span>
                </div>
                {!session.current && (
                  <Button variant="ghost" size="sm" disabled title="Coming soon">
                    <LogOut className="size-4" />
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Audit log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Audit Log</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent actions taken in the system.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLog.map((entry, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-sm">{entry.action}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{entry.user}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{entry.timestamp}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{entry.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
