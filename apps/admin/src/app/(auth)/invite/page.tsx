import { getDb, invitations, eq } from '@pmg/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { InviteAcceptClient } from './invite-accept-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Accept Invitation' }

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold text-destructive">Invalid Invitation</h1>
          <p className="text-muted-foreground">No invitation token was provided.</p>
        </div>
      </div>
    )
  }

  const db = getDb()

  // Look up the invitation by token
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1)

  if (!invitation) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold text-destructive">Invalid Invitation</h1>
          <p className="text-muted-foreground">This invitation link is invalid or has been revoked.</p>
        </div>
      </div>
    )
  }

  // Check if already accepted
  if (invitation.acceptedAt) {
    // Already accepted — just redirect to login
    redirect('/login')
  }

  // Check if expired
  if (new Date() > invitation.expiresAt) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold text-destructive">Invitation Expired</h1>
          <p className="text-muted-foreground">
            This invitation has expired. Please ask your administrator to send a new one.
          </p>
        </div>
      </div>
    )
  }

  // Valid invitation — show the accept UI which triggers the magic link sign-in
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome to PMG Control Center</h1>
          <p className="mt-2 text-muted-foreground">
            Hi {invitation.name}, you have been invited as <strong>{invitation.role}</strong>.
          </p>
        </div>
        <InviteAcceptClient email={invitation.email} />
      </div>
    </div>
  )
}
