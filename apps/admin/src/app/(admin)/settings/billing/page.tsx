import type { Metadata } from 'next';
import { AlertCircle, CheckCircle2, Mail, Receipt } from 'lucide-react';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { BillingSettingsClient } from './billing-settings-client';
import { saveDivisionBillingSettings } from '@/app/actions/settings';
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
export const metadata: Metadata = { title: 'Billing & Invoicing Settings' };



export default async function BillingSettingsPage() {
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
        title="Billing & Invoicing"
        description="Configure billing defaults per division"
        icon={Receipt}
      />

      {/* ── Email Configuration Summary ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground" />
            <h3 className="text-lg font-semibold">Email Configuration</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Sender and CC addresses used when emails are dispatched per division.
            The CC address is the division&apos;s <strong>salesRepEmail</strong> if set, otherwise the brand&apos;s default admin inbox.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>{configuredEmailCount} of {divisions.length}</CardTitle>
              <CardDescription>Divisions with contact email</CardDescription>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>{defaultFrom}</CardTitle>
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
              <TableHead className="py-4">CC Admin</TableHead>
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
                        <CheckCircle2 className="text-muted-foreground" />
                        <span className="font-mono text-xs text-foreground">{s.salesRepEmail}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="shrink-0" />
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
                  <TableCell className="py-4">
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

      <BillingSettingsClient
        divisions={divisions}
        allSettings={allSettings}
        saveAction={saveDivisionBillingSettings}
      />
    </div>
  );
}
