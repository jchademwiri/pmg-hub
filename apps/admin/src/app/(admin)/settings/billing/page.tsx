import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Receipt, Mail, AlertCircle } from 'lucide-react';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BillingSettingsClient } from './billing-settings-client';
import { saveDivisionBillingSettings } from '@/app/actions/settings';
import { DEFAULT_EMAIL_FROM, resolveDivisionAdminEmail } from '@pmg/emails';
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

/** Mirrors the resolveFromEmail helper used in all email actions */
function resolveFromEmail(divisionWebsite: string | null | undefined, fallback: string): string {
  if (!divisionWebsite) return fallback;
  const domain = divisionWebsite
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase();
  if (!domain) return fallback;
  return domain.startsWith('info.') ? `noreply@${domain}` : `noreply@info.${domain}`;
}

export default async function BillingSettingsPage() {
  const [divisions, allSettings] = await Promise.all([
    getAllDivisions(),
    getAllDivisionBillingSettings(),
  ]);

  const defaultFrom = process.env.EMAIL_FROM_ADDRESS || DEFAULT_EMAIL_FROM;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ChevronLeft className="size-4" />
            Settings
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <Receipt className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Billing & Invoicing</h2>
            <p className="text-sm text-muted-foreground">
              Configure billing defaults per division
            </p>
          </div>
        </div>
      </div>

      {/* ── Email Configuration Summary ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Email Configuration</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Sender and CC addresses used when emails are dispatched per division.
            The CC address is the division&apos;s <strong>salesRepEmail</strong> if set, otherwise the brand&apos;s default admin inbox.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Division</TableHead>
              <TableHead>Contact Email (salesRepEmail)</TableHead>
              <TableHead>Sends From</TableHead>
              <TableHead>CC (Admin)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisions.map((div) => {
              const s = allSettings[div.id];
              const fromEmail = resolveFromEmail(s?.divisionWebsite, defaultFrom);
              const adminCc = resolveDivisionAdminEmail(div.name, s?.salesRepEmail ?? null);
              const hasContactEmail = !!s?.salesRepEmail;

              return (
                <TableRow key={div.id}>
                  <TableCell className="pl-4 font-medium">{div.name}</TableCell>
                  <TableCell>
                    {hasContactEmail ? (
                      <span className="font-mono text-xs text-foreground">{s.salesRepEmail}</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs">
                        <AlertCircle className="size-3.5 shrink-0" />
                        Not configured
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-foreground">{fromEmail}</span>
                    {!s?.divisionWebsite && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">fallback</Badge>
                    )}
                  </TableCell>
                  <TableCell>
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
                <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
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
