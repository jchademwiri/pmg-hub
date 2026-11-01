import { redirect } from 'next/navigation';

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const query = params?.period ? `?period=${encodeURIComponent(params.period)}` : '';
  redirect(`/finance${query}`);
}
