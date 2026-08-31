'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  db,
  clients,
  income,
  eq,
  quotations,
  invoices,
  projectScheduleEntries,
  divisionBillingSettings,
  divisions,
} from '@pmg/db';
import { setClientActive } from '@pmg/db';
import {
  createEmailClient,
  PortalInvitationEmail,
  DEFAULT_REPLY_TO,
  resolveResendApiKey,
  resolveDefaultFromEmail,
  resolveFromEmail,
  resolveDivisionSenderName,
} from '@pmg/emails';
import React from 'react';
import { getSessionOrRedirect } from '@/lib/auth';
import { getPortalBaseUrl } from '@/lib/portal-url';
import { ClientSchema } from './schemas';

export async function createClient(formData: FormData): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.businessName === '') delete raw.businessName;
    if (raw.email === '') delete raw.email;
    if (raw.phone === '') delete raw.phone;
    if (raw.divisionId === '__none__') delete raw.divisionId;
    const isExcluded = raw.excludeFromAutoStatements === 'on';
    const isRetainer = raw.isRetainer === 'on';
    const result = ClientSchema.safeParse({
      ...raw,
      excludeFromAutoStatements: isExcluded,
      isRetainer,
    });
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    await db.insert(clients).values({
      name: parsed.name,
      businessName: parsed.businessName ?? null,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      divisionId: parsed.divisionId ?? null,
      isRetainer: parsed.isRetainer,
      excludeFromAutoStatements: parsed.excludeFromAutoStatements,
    });
    revalidatePath('/relationships/clients');
    return {};
  } catch (e) {
    console.error('createClient failed:', e);
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateClient(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.businessName === '') delete raw.businessName;
    if (raw.email === '') delete raw.email;
    if (raw.phone === '') delete raw.phone;
    if (raw.divisionId === '__none__') delete raw.divisionId;

    // Convert checkbox 'on' value to boolean
    const isExcluded = raw.excludeFromAutoStatements === 'on';
    const isRetainer = raw.isRetainer === 'on';

    const result = ClientSchema.safeParse({
      ...raw,
      excludeFromAutoStatements: isExcluded,
      isRetainer,
    });
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    await db
      .update(clients)
      .set({
        name: parsed.name,
        businessName: parsed.businessName ?? null,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null,
        divisionId: parsed.divisionId ?? null,
        isRetainer: parsed.isRetainer,
        excludeFromAutoStatements: parsed.excludeFromAutoStatements,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id));
    revalidatePath('/relationships/clients');
    return {};
  } catch (e) {
    console.error('updateClient failed:', e);
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function toggleClientActive(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    await setClientActive(id, isActive);
    revalidatePath('/relationships/clients');
    return {};
  } catch (e) {
    console.error('toggleClientActive failed:', e);
    return { error: 'Failed to update client status.' };
  }
}

export async function deleteClient(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    // Check for income records
    const [incomeCount] = await db
      .select({ id: income.id })
      .from(income)
      .where(eq(income.clientId, id))
      .limit(1);
    if (incomeCount) {
      return {
        error: 'Cannot delete a client that has payment records. Disable the client instead.',
      };
    }

    // Check for invoices
    const [invoiceCount] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.clientId, id))
      .limit(1);
    if (invoiceCount) {
      return { error: 'Cannot delete a client that has invoices. Disable the client instead.' };
    }

    // Check for quotes
    const [quoteCount] = await db
      .select({ id: quotations.id })
      .from(quotations)
      .where(eq(quotations.clientId, id))
      .limit(1);
    if (quoteCount) {
      return { error: 'Cannot delete a client that has quotes. Disable the client instead.' };
    }

    // Check for tender schedule entries
    const [tenderCount] = await db
      .select({ id: projectScheduleEntries.id })
      .from(projectScheduleEntries)
      .where(eq(projectScheduleEntries.clientId, id))
      .limit(1);
    if (tenderCount) {
      return {
        error:
          'Cannot delete a client that has tender schedule entries. Disable the client instead.',
      };
    }

    await db.delete(clients).where(eq(clients.id, id));
    revalidatePath('/relationships/clients');
    return {};
  } catch (e) {
    console.error('deleteClient failed:', e);
    return { error: 'Failed to delete. Please try again.' };
  }
}

export async function sendPortalInvitation(
  clientId: string,
): Promise<{ error?: string; success?: boolean }> {
  try {
    await getSessionOrRedirect();

    if (!clientId) {
      return { error: 'Client ID is required.' };
    }

    // Fetch the client
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);

    if (!client) {
      return { error: 'Client not found.' };
    }

    if (!client.email) {
      return { error: 'Client does not have an email address.' };
    }

    const portalUrl = getPortalBaseUrl();

    // Resolve division branding if available
    let fromName = 'Playhouse Media Group';
    let fromEmail = 'noreply@info.playhousemedia.co.za';
    let divisionName = 'Playhouse Media Group';
    let websiteUrl: string | undefined;
    let logoUrl: string | undefined;
    let apiKey = process.env.PMG_RESEND_API_KEY!;

    if (client.divisionId) {
      const [billingConfig] = await db
        .select()
        .from(divisionBillingSettings)
        .where(eq(divisionBillingSettings.divisionId, client.divisionId))
        .limit(1);

      const [divRow] = await db
        .select({ name: divisions.name })
        .from(divisions)
        .where(eq(divisions.id, client.divisionId))
        .limit(1);

      if (divRow) {
        divisionName = divRow.name;
        apiKey = resolveResendApiKey(divRow.name);
        const defaultFrom = resolveDefaultFromEmail(divRow.name);
        fromName = resolveDivisionSenderName(divRow.name);
        fromEmail = resolveFromEmail(billingConfig?.divisionWebsite, defaultFrom);
        websiteUrl = billingConfig?.divisionWebsite || undefined;
        logoUrl = billingConfig?.logoUrl || undefined;
      }
    }

    const emailClient = createEmailClient({
      apiKey,
      from: `${fromName} <${fromEmail}>`,
      adminEmail: fromEmail,
    });

    const { error: mailError } = await emailClient({
      to: client.email,
      subject: `Welcome to your ${divisionName} Client Portal`,
      react: React.createElement(PortalInvitationEmail, {
        recipientName: client.name,
        portalUrl,
        companyName: divisionName,
        primaryColor: '#1d4ed8',
        websiteUrl,
        logoUrl,
      }),
      replyTo: DEFAULT_REPLY_TO,
    });

    if (mailError) {
      return { error: `Failed to send email: ${mailError.message}` };
    }

    // Update the client record
    await db
      .update(clients)
      .set({
        portalInvitationSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId));

    revalidatePath('/relationships/clients');
    revalidatePath(`/relationships/clients/${clientId}`);

    return { success: true };
  } catch (e: unknown) {
    console.error('sendPortalInvitation failed:', e);
    const message =
      e instanceof Error ? e.message : 'Failed to send portal invitation. Please try again.';
    return { error: message };
  }
}
