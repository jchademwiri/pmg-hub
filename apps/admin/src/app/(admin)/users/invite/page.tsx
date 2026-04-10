import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSessionOrRedirect, requireRole } from '@/lib/auth'
import { InviteUserForm } from '@/components/users/invite-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Invite User' }

export default async function InviteUserPage() {
  const session = await getSessionOrRedirect()

  if (!requireRole(session, 'super_admin')) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Invite User</h1>
      <InviteUserForm />
    </div>
  )
}
