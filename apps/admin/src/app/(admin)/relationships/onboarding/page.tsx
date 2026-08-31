import type { Metadata } from 'next';
import { getSessionOrRedirect } from '@/lib/auth';
import { getAllOnboardings, getOnboardingCountsByStatus, getAllDivisions } from '@pmg/db';
import { OnboardingClient } from './onboarding-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Client Onboarding — PMG Admin',
};

interface OnboardingPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  await getSessionOrRedirect();
  const { status = 'pending' } = await searchParams;

  const [entries, counts, divisions] = await Promise.all([
    getAllOnboardings({ status }),
    getOnboardingCountsByStatus(),
    getAllDivisions(),
  ]);

  return (
    <OnboardingClient
      entries={entries}
      counts={counts}
      divisions={divisions.map((d) => ({ id: d.id, name: d.name }))}
    />
  );
}
