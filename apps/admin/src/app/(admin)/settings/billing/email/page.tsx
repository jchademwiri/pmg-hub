import type { Metadata } from 'next';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { DEFAULT_EMAIL_FROM, resolveDivisionAdminEmail, resolveFromEmail, resolveDefaultFromEmail } from '@pmg/emails';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Email Delivery · Settings' };

export default async function BillingEmailPage() {
  const [divisions, allSettings] = await Promise.all([
    getAllDivisions(),
    getAllDivisionBillingSettings(),
  ]);

  const defaultFrom = process.env.EMAIL_FROM_ADDRESS || DEFAULT_EMAIL_FROM;
  const configuredEmailCount = divisions.filter((division) => {
    const s = allSettings[division.id];
    return Boolean(s?.salesRepEmail);
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Email Delivery & Routing"
        description="Sender and CC addresses used when invoices and quotes are emailed per division"
        icon={Mail}
      />

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>{configuredEmailCount} of {divisions.length}</CardTitle>
              <CardDescription>Divisions with contact email</CardDescription>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle className="font-mono text-xs">{defaultFrom}</CardTitle>
              <CardDescription>Fallback sender address</CardDescription>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                {configuredEmailCount === divisions.length && divisions.length > 0 ? 'Ready' : 'Needs review'}
              </CardTitle>
              <CardDescription>Email routing status</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-4 pl-4">Division</TableHead>
              <TableHead className="py-4">Contact Email</TableHead>
              <TableHead className="py-4">Sends From</TableHead>
              <TableHead className="py-4 pr-4">CC Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisions.map((div) => {
              const s = allSettings[div.id];
              const fromEmail = resolveFromEmail(s?.divisionWebsite, resolveDefaultFromEmail(div.name));
              const adminCc = resolveDivisionAdminEmail(div.name, s?.salesRepEmail ?? null);
              const hasContactEmail = !!s?.salesRepEmail;

              return (
                <TableRow key={div.id}>
                  <TableCell className="py-4 pl-4 font-medium">{div.name}</TableCell>
                  <TableCell className="py-4">
                    {hasContactEmail ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-mono text-xs text-foreground">{s.salesRepEmail}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                        Not configured
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="font-mono text-xs text-foreground">{fromEmail}</span>
                    {!s?.divisionWebsite && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">fallback</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-4 pr-4">
                    <span className="font-mono text-xs text-foreground">{adminCc}</span>
                    {!s?.salesRepEmail && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">brand default</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {divisions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 py-4 text-center text-sm text-muted-foreground">
                  No divisions configured yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
