import { db, publicDocuments } from '@pmg/db';
import { desc } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { UploadDocumentButton } from './UploadDocumentButton';

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function DocumentsAdminPage() {
  const documents = await db
    .select()
    .from(publicDocuments)
    .orderBy(desc(publicDocuments.downloadCount));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
        <div className="flex items-center space-x-2">
          <UploadDocumentButton />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public Documents (SBD Forms)</CardTitle>
          <CardDescription>
            Manage the standard bidding documents hosted on Cloudflare R2 and track live lead
            downloads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Website URL</TableHead>
                <TableHead className="text-right">Total Downloads</TableHead>
                <TableHead className="text-right">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                    No documents found. Start by uploading one!
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {doc.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://tenderedgesolutions.co.za/sbd-forms/${doc.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        /sbd-forms/{doc.slug}
                      </a>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {doc.downloadCount}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(doc.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
