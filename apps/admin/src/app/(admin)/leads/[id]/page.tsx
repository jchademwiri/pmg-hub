import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeadById } from '@pmg/db'
import { updateLeadStatus, updateLeadNotes } from '@/app/actions/leads'
import { LeadStatusForm } from '@/components/leads/lead-status-form'
import { LeadNotesForm } from '@/components/leads/lead-notes-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Lead Detail' }

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params
  const lead = await getLeadById(id)
  if (!lead) notFound()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/leads"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Leads
        </Link>
        <h1 className="text-2xl font-semibold">Lead Detail</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-lg font-medium">Contact Information</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{lead.name ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{lead.email ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{lead.phone ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Message</dt>
              <dd className="whitespace-pre-wrap">{lead.message ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-lg font-medium">Lead Information</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Source</dt>
              <dd>{lead.source ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Service Interest</dt>
              <dd>{lead.serviceInterest ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Division</dt>
              <dd>{lead.divisionName ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{lead.status}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Received</dt>
              <dd>{lead.createdAt.toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Update Status</h2>
        <LeadStatusForm
          currentStatus={lead.status}
          updateAction={updateLeadStatus.bind(null, id)}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Notes</h2>
        <LeadNotesForm
          currentNotes={lead.notes}
          updateAction={updateLeadNotes.bind(null, id)}
        />
      </div>
    </div>
  )
}
