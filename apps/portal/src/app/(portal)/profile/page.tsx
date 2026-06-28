import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, divisionBillingSettings } from '@pmg/db';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Mail, Building, Shield } from 'lucide-react';
import { ProfileEditForm } from './profile-edit-form';

export default async function ProfilePage() {
  const { client } = await getPortalSessionOrRedirect();
  const db = getDb();

  // Fetch division billing settings for sales rep contact
  const divSettings = client.divisionId
    ? (await db
        .select()
        .from(divisionBillingSettings)
        .where(eq(divisionBillingSettings.divisionId, client.divisionId))
        .limit(1))[0]
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">My Profile</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Review and update the contact and billing details we have on file for your account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Contact Details */}
        <Card className="bg-[#0a0f1d] border-white/5">
          <CardHeader className="border-b border-white/5 pb-3">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Building className="size-4 text-blue-400" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Business Name
                </p>
                <p className="text-sm font-bold text-white">{client.businessName || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address
                </p>
                <p className="text-sm font-bold text-white">{client.email || '—'}</p>
              </div>
            </div>

            <ProfileEditForm initialClient={{ name: client.name, phone: client.phone }} />

            <div className="rounded-lg bg-white/[0.01] border border-white/5 p-3 flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed mt-4">
              <Shield className="size-4 shrink-0 text-blue-500 mt-0.5" />
              <p>
                To request changes to your company name or registered billing email address, please contact your PMG account manager.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Manager / Sales Rep */}
        {divSettings && (
          <Card className="bg-[#0a0f1d] border-white/5">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <User className="size-4 text-purple-400" />
                Account Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <p className="text-xs text-muted-foreground">
                For queries regarding invoices, projects, or new quotes, please reach out to your assigned account manager:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {divSettings.salesRepName && (
                  <div>
                    <p className="text-muted-foreground font-medium">Name</p>
                    <p className="mt-1 text-sm font-bold text-white">{divSettings.salesRepName}</p>
                  </div>
                )}
                {divSettings.salesRepEmail && (
                  <div>
                    <p className="text-muted-foreground font-medium">Email</p>
                    <a
                      href={`mailto:${divSettings.salesRepEmail}`}
                      className="mt-1 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      <Mail className="size-3.5" />
                      {divSettings.salesRepEmail}
                    </a>
                  </div>
                )}
                {divSettings.salesRepPhone && (
                  <div>
                    <p className="text-muted-foreground font-medium">Phone</p>
                    <a
                      href={`tel:${divSettings.salesRepPhone}`}
                      className="mt-1 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      <Phone className="size-3.5" />
                      {divSettings.salesRepPhone}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
