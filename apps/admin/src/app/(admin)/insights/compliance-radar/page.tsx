import type { Metadata } from 'next';
import {
  getAllComplianceRecordsGlobal,
  getComplianceDocumentTypes,
  db,
  clients,
  asc,
} from '@pmg/db';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';
import { getSASTToday } from '@/lib/format';
import { getStatutoryDeadlines } from '@/lib/compliance/statutory-calendar';
import { AddComplianceRecordDialog } from './add-compliance-record-dialog';
import { ComplianceRadarClient, type ComplianceRadarRow } from './compliance-radar-client';

export const metadata: Metadata = {
  title: 'Compliance Radar | PMG Hub',
};

export const dynamic = 'force-dynamic';

function diffDaysISO(targetDateStr: string, todayStr: string): number {
  const [ty, tm, td] = targetDateStr.split('-').map(Number);
  const [ny, nm, nd] = todayStr.split('-').map(Number);
  if (!ty || !tm || !td || !ny || !nm || !nd) return 0;
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(ny, nm - 1, nd)) / 86_400_000);
}

export default async function ComplianceRadarPage() {
  const [records, allClients, activeTypes] = await Promise.all([
    getAllComplianceRecordsGlobal(),
    db
      .select({
        id: clients.id,
        name: clients.name,
        businessName: clients.businessName,
        phone: clients.phone,
      })
      .from(clients)
      .orderBy(asc(clients.name)),
    getComplianceDocumentTypes({ activeOnly: true }),
  ]);

  const documentTypes = activeTypes.map((t) => t.name);

  const todayStr = getSASTToday();
  const statutoryDeadlines = getStatutoryDeadlines(todayStr);

  const clientMap = new Map(
    allClients.map((c) => [c.id, { name: c.businessName || c.name, phone: c.phone ?? null }]),
  );

  const radarRows: ComplianceRadarRow[] = records.map((r) => {
    const client = clientMap.get(r.clientId);
    return {
      id: r.id,
      clientId: r.clientId,
      clientName: client?.name || 'Unknown Client',
      clientPhone: client?.phone ?? null,
      documentType: r.documentType,
      customName: r.customName ?? null,
      expiryDate: r.expiryDate,
      daysLeft: diffDaysISO(r.expiryDate, todayStr),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title="Compliance Radar"
        description="Monitor upcoming expirations across all clients globally."
        actions={<AddComplianceRecordDialog clients={allClients} documentTypes={documentTypes} />}
      />

      <ComplianceRadarClient
        records={radarRows}
        statutoryDeadlines={statutoryDeadlines}
        documentTypes={documentTypes}
      />
    </div>
  );
}
