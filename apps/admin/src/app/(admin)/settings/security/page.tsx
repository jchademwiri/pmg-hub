import type { Metadata } from 'next'
import { Shield, KeyRound, Lock, History, LogIn, Laptop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { SettingsSection } from '@/components/settings/settings-section'
import {
  getPaginatedSignInLogs,
  getPaginatedSystemAuditLogs,
  getPaginatedActiveSessions,
} from '@/lib/audit-log'
import { PaginatedLogPanel, PaginatedSessionsPanel } from './security-logs-client'

export const metadata: Metadata = { title: 'Security Settings' }

export default async function SecuritySettingsPage() {
  const [systemAuditLogs, signInLogs, sessions] = await Promise.all([
    getPaginatedSystemAuditLogs({ page: 1, pageSize: 5 }),
    getPaginatedSignInLogs({ page: 1, pageSize: 5 }),
    getPaginatedActiveSessions({ page: 1, pageSize: 5 }),
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

      <Tabs defaultValue="audit-log" className="w-full">
        <TabsList className="w-full justify-start rounded-lg bg-muted/40 p-1">
          <TabsTrigger value="audit-log" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="signin-log" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Sign-In Log
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Laptop className="h-4 w-4" />
            Active Sessions
          </TabsTrigger>
        </TabsList>

        {/* Audit Log Tab */}
        <TabsContent value="audit-log" className="mt-4">
          <PaginatedLogPanel
            initialData={systemAuditLogs}
            type="system"
            title="Audit Log"
            description="Recent actions taken in the system."
          />
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password" className="mt-4">
          <SettingsSection title="Password" description="Update your account password (Password management coming soon).">
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
        </TabsContent>

        {/* Sign-In Log Tab */}
        <TabsContent value="signin-log" className="mt-4">
          <PaginatedLogPanel
            initialData={signInLogs}
            type="signin"
            title="Sign-In Log"
            description="Recent authentication activity and sign-in history."
          />
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="mt-4">
          <PaginatedSessionsPanel
            initialData={sessions}
            title="Active Sessions"
            description="Devices currently signed in to your account."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}





