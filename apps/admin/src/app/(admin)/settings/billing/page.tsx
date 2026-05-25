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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <CardTitle>Email Configuration</CardTitle>
          </div>
          <CardDescription>
            Sender and CC addresses used when emails are dispatched per division.
            The CC address is the division&apos;s <strong>salesRepEmail</strong> if set, otherwise the brand&apos;s default admin inbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Division</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Email (salesRepEmail)</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sends From</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">CC (Admin)</th>
                </tr>
              </thead>
              <tbody>
                {divisions.map((div) => {
                  const s = allSettings[div.id];
                  const fromEmail = resolveFromEmail(s?.divisionWebsite, defaultFrom);
                  const adminCc = resolveDivisionAdminEmail(div.name, s?.salesRepEmail ?? null);
                  const hasContactEmail = !!s?.salesRepEmail;

                  return (
                    <tr key={div.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{div.name}</td>
                      <td className="px-4 py-3">
                        {hasContactEmail ? (
                          <span className="font-mono text-xs text-foreground">{s.salesRepEmail}</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs">
                            <AlertCircle className="size-3.5 shrink-0" />
                            Not configured
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-foreground">{fromEmail}</span>
                        {!s?.divisionWebsite && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">fallback</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-foreground">{adminCc}</span>
                        {!s?.salesRepEmail && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">brand default</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {divisions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No divisions configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <BillingSettingsClient
        divisions={divisions}
        allSettings={allSettings}
        saveAction={saveDivisionBillingSettings}
      />
    </div>
  );
}
