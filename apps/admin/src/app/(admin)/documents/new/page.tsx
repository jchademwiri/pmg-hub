import { getSessionOrRedirect } from '@/lib/auth';
import { DocumentEditorForm } from '../DocumentEditorForm';

export default async function NewDocumentPage() {
  await getSessionOrRedirect();
  return <DocumentEditorForm />;
}
