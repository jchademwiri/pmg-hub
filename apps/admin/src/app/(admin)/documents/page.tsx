import { db, publicDocuments, asc, desc } from '@pmg/db';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';
import { DocumentsTableClient } from './DocumentsTableClient';

export default async function DocumentsAdminPage() {
  const session = await getSessionOrRedirect();
  const canDelete = requireRole(session, 'admin');

  const documents = await db
    .select()
    .from(publicDocuments)
    .orderBy(asc(publicDocuments.sortOrder), desc(publicDocuments.downloadCount));

  return <DocumentsTableClient documents={documents} canDelete={canDelete} />;
}
