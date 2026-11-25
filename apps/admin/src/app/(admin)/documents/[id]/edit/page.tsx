import { notFound } from 'next/navigation';
import { db, publicDocuments, eq } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { DocumentEditorForm } from '../../DocumentEditorForm';

interface EditDocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDocumentPage({ params }: EditDocumentPageProps) {
  await getSessionOrRedirect();
  const { id } = await params;

  const [doc] = await db.select().from(publicDocuments).where(eq(publicDocuments.id, id)).limit(1);

  if (!doc) {
    notFound();
  }

  return <DocumentEditorForm document={doc} />;
}
