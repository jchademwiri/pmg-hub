import type { Metadata } from 'next'
import { Shield, LogOut, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { SettingsSection } from '@/components/settings/settings-section'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Security Settings' }

// Placeholder session rows
const sessions = [
  { device: 'Chrome on Windows', location: 'Current session', lastActive: 'Now', current: true },
]

// Placeholder audit log rows
const auditLog = [
  { action: 'Signed in', user: '-', timestamp: '-', ip: '-' },
  { action: 'Invoice created', user: '-', timestamp: '-', ip: '-' },
  { action: 'User invited', user: '-', timestamp: '-', ip: '-' },
]

export default function SecuritySettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Security"
        description="Sessions, authentication, and audit log"
        icon={Shield}
        badge="Soon"
      />
      <Alert>
        <Shield />
        <AlertTitle>Security controls are read-only for now</AlertTitle>
        <AlertDescription>
          This page previews the controls that will live here. Nothing can be changed yet.
        </AlertDescription>
      </Alert>

      {/* Password */}
      <SettingsSection title="Password" description="Update your account password.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel>Current Password</FieldLabel>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  ••••••••
                </div>
              </Field>
              <Field>
                <FieldLabel>New Password</FieldLabel>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  -
                </div>
              </Field>
              <Field>
                <FieldLabel>Confirm New Password</FieldLabel>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  -
                </div>
              </Field>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" disabled title="Coming soon">
                <KeyRound data-icon="inline-start" />
                Update Password
              </Button>
            </div>
      </SettingsSection>

      <Separator />

      {/* Two-factor auth */}
      <SettingsSection
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account."
      >
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Authenticator App</span>
              <span className="text-xs text-muted-foreground">Use an app like Google Authenticator or Authy</span>
            </div>
            <Button variant="outline" size="sm" disabled title="Coming soon">Enable 2FA</Button>
          </div>
      </SettingsSection>

      <Separator />

      {/* Active sessions */}
      <SettingsSection
        title="Active Sessions"
        description="Devices currently signed in to your account."
      >
          <div className="flex flex-col divide-y divide-border">
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
                    <LogOut data-icon="inline-start" />
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
      </SettingsSection>

      <Separator />

      {/* Audit log */}
      <SettingsSection title="Audit Log" description="Recent actions taken in the system.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-4 pl-4">Action</TableHead>
                <TableHead className="py-4">User</TableHead>
                <TableHead className="py-4">Time</TableHead>
                <TableHead className="py-4">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLog.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell className="py-4 pl-4 text-sm font-medium">{entry.action}</TableCell>
                  <TableCell className="py-4 text-sm text-muted-foreground">{entry.user}</TableCell>
                  <TableCell className="py-4 text-sm text-muted-foreground">{entry.timestamp}</TableCell>
                  <TableCell className="py-4 text-sm text-muted-foreground">{entry.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </SettingsSection>
    </div>
  )
}
