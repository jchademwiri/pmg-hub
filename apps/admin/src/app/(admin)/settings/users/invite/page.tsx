import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { getSessionOrRedirect, requireRole } from '@/lib/auth'
import { InviteUserForm } from '@/components/users/invite-form'
import { SettingsPageHeader } from '@/components/settings/settings-page-header'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Invite User' }

export default async function InviteUserPage() {
  const session = await getSessionOrRedirect()

  if (!requireRole(session, 'super_admin')) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Invite User"
        description="Send an invitation and choose the user's starting role"
        icon={UserPlus}
        backHref="/settings/users"
        backLabel="Users"
      />
      <InviteUserForm />
    </div>
  )
}
