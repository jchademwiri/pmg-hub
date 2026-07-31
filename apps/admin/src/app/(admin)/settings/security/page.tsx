import type { Metadata } from 'next'
import { Shield, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { SettingsSection } from '@/components/settings/settings-section'
import { getSignInLogs, getSystemAuditLogs, getActiveSessions } from '@/lib/audit-log'
import { PaginatedLogTable, PaginatedActiveSessions } from './security-logs-client'

export const metadata: Metadata = { title: 'Security Settings' }

export default async function SecuritySettingsPage() {
  const [signInLogs, systemAuditLogs, sessions] = await Promise.all([
    getSignInLogs(),
    getSystemAuditLogs(),
    getActiveSessions(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Security"
        description="Sessions, authentication, and audit log"
        icon={Shield}
      />
      <Alert>
        <Shield />
        <AlertTitle>System Security & Activity Log</AlertTitle>
        <AlertDescription>
          Review active sessions, authentication history, and recent administrative actions taken across the system.
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

      {/* Audit log */}
      <SettingsSection
        title="Audit Log"
        description="Recent actions taken in the system."
      >
        <PaginatedLogTable
          entries={systemAuditLogs}
          emptyMessage="No system audit log activity recorded yet."
          pageSize={5}
        />
      </SettingsSection>

      {/* Sign-In History */}
      <SettingsSection
        title="Sign-In Log"
        description="Recent authentication activity and sign-in history."
      >
        <PaginatedLogTable
          entries={signInLogs}
          emptyMessage="No sign-in records found."
          pageSize={5}
        />
      </SettingsSection>

      {/* Active sessions */}
      <SettingsSection
        title="Active Sessions"
        description="Devices currently signed in to your account."
      >
        <PaginatedActiveSessions sessions={sessions} pageSize={5} />
      </SettingsSection>
    </div>
  )
}



