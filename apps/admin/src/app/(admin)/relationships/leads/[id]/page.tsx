import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLeadById } from '@pmg/db';
import { updateLeadStatus, updateLeadNotes } from '@/app/actions/leads';
import { fmtDate } from '@/lib/format';
import { LeadStatusForm } from '@/components/leads/lead-status-form';
import { LeadNotesForm } from '@/components/leads/lead-notes-form';
import { ConvertToClientButton } from '@/components/leads/convert-to-client-button';
import { ShareOnboardingLinkDialog } from '@/components/onboarding/share-onboarding-link-dialog';
import { BackButton } from '@/components/ui/back-button';
import { SetPageLabel } from '@/components/navigation/page-header-context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Lead Detail' };

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  return (
    <div className="flex flex-col gap-6">
      <SetPageLabel value={lead.name ?? 'Lead Detail'} />
      <div className="flex items-center gap-4">
        <BackButton href="/relationships/leads" label="Leads" />
        <h1 className="text-2xl font-semibold">{lead.name ?? 'Lead Detail'}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-lg font-medium">Contact Information</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{lead.name ?? '-'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Company Name</dt>
              <dd>{lead.companyName ?? '-'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Email</dt>
              <dd>
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                    {lead.email}
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                    {lead.phone}
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Message</dt>
              <dd className="whitespace-pre-wrap">{lead.message ?? '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-lg font-medium">Lead Information</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Source</dt>
              <dd>{lead.source ?? '-'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Service Interest</dt>
              <dd>{lead.serviceInterest ?? '-'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Division</dt>
              <dd>{lead.divisionName ?? '-'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{lead.status}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Received</dt>
              <dd>{fmtDate(lead.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {lead.status !== 'converted' ? (
        <div className="flex flex-col gap-4 rounded-lg border p-4 bg-emerald-500/5 border-emerald-500/20">
          <h2 className="text-lg font-medium text-emerald-800 dark:text-emerald-300">Actions</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="max-w-xs">
              <ConvertToClientButton leadId={id} leadStatus={lead.status} />
            </div>
            <ShareOnboardingLinkDialog
              leadId={id}
              leadName={lead.name ?? undefined}
              leadPhone={lead.phone ?? undefined}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-lg border p-4 bg-muted/20">
          <h2 className="text-lg font-medium text-muted-foreground">Actions</h2>
          <p className="text-sm text-muted-foreground">
            This lead has been successfully converted into an active client profile.{' '}
            <Link
              href="/relationships/clients"
              className="text-primary hover:underline font-medium"
            >
              View Clients →
            </Link>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Update Status</h2>
        <LeadStatusForm
          currentStatus={lead.status}
          updateAction={updateLeadStatus.bind(null, id)}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Notes</h2>
        <LeadNotesForm currentNotes={lead.notes} updateAction={updateLeadNotes.bind(null, id)} />
      </div>
    </div>
  );
}
