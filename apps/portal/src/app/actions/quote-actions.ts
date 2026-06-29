'use server';

import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, quotations, divisionBillingSettings, organisationSettings, divisions, eq, and } from '@pmg/db';
import { revalidatePath } from 'next/cache';
import { createEmailClient, DEFAULT_EMAIL_FROM, AdminQuoteAcceptedEmail } from '@pmg/emails';
import React from 'react';
import { getClientIp, checkRateLimit } from '@/lib/rate-limit';

export async function acceptQuoteAction(quoteId: string): Promise<{ error?: string }> {
  try {
    const { client, session } = await getPortalSessionOrRedirect();
    
    // Rate limit quote responses (max 5 per minute per IP/Client)
    const ip = await getClientIp();
    const limitResult = await checkRateLimit(`quote-respond:${client.id}:${ip}`, 5, '60 s');
    if (!limitResult.success) {
      return { error: 'Too many requests. Please try again in a minute.' };
    }

    const db = getDb();

    // Verify quote ownership
    const [quote] = await db
      .select()
      .from(quotations)
      .where(and(eq(quotations.id, quoteId), eq(quotations.clientId, client.id)))
      .limit(1);

    if (!quote) return { error: 'Quote not found.' };
    if (quote.status !== 'sent') return { error: 'This quote has already been responded to.' };

    // Update quote in database
    await db
      .update(quotations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        clientActionBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, quote.id));

    // Resolve sales rep / admin email
    const [divSettings] = await db
      .select()
      .from(divisionBillingSettings)
      .where(eq(divisionBillingSettings.divisionId, quote.divisionId))
      .limit(1);

    const [orgSettings] = await db.select().from(organisationSettings).limit(1);

    const recipient = divSettings?.salesRepEmail || orgSettings?.email;

    if (recipient) {
      try {
        const emailClient = createEmailClient({
          apiKey: process.env.PMG_RESEND_API_KEY!,
          from: `PMG Portal <${DEFAULT_EMAIL_FROM}>`,
          adminEmail: DEFAULT_EMAIL_FROM,
        });

        const [divRow] = quote.divisionId
          ? await db
              .select({ name: divisions.name })
              .from(divisions)
              .where(eq(divisions.id, quote.divisionId))
              .limit(1)
          : [null];

        const adminUrl = process.env.ADMIN_URL || 'https://control.playhousemedia.co.za';
        const viewUrl = `${adminUrl}/billing/quotes/${quoteId}`;
        const totalFormatted = `ZAR ${Number(quote.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

        await emailClient({
          to: recipient,
          subject: `Quote #${quote.documentNumber} has been ACCEPTED by ${client.businessName || client.name}`,
          react: React.createElement(AdminQuoteAcceptedEmail, {
            clientName: client.businessName || client.name,
            documentNumber: quote.documentNumber,
            totalAmount: totalFormatted,
            acceptedAt: new Date().toLocaleString('en-ZA'),
            viewUrl,
            companyName: divRow?.name || 'Playhouse Media Group',
            primaryColor: undefined,
            websiteUrl: divSettings?.divisionWebsite || undefined,
            logoUrl: divSettings?.logoUrl || undefined,
          }),
        });
      } catch (emailErr) {
        console.error('Failed to send quote acceptance email:', emailErr);
      }
    }

    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath('/quotes');
    revalidatePath('/dashboard');
    return {};
  } catch (e) {
    console.error('acceptQuoteAction failed:', e);
    return { error: 'Failed to accept quote. Please try again.' };
  }
}

export async function declineQuoteAction(
  quoteId: string,
  reason: string,
): Promise<{ error?: string }> {
  try {
    const { client, session } = await getPortalSessionOrRedirect();

    // Rate limit quote responses (max 5 per minute per IP/Client)
    const ip = await getClientIp();
    const limitResult = await checkRateLimit(`quote-respond:${client.id}:${ip}`, 5, '60 s');
    if (!limitResult.success) {
      return { error: 'Too many requests. Please try again in a minute.' };
    }

    const db = getDb();

    // Verify quote ownership
    const [quote] = await db
      .select()
      .from(quotations)
      .where(and(eq(quotations.id, quoteId), eq(quotations.clientId, client.id)))
      .limit(1);

    if (!quote) return { error: 'Quote not found.' };
    if (quote.status !== 'sent') return { error: 'This quote has already been responded to.' };

    // Update quote in database
    await db
      .update(quotations)
      .set({
        status: 'declined',
        declinedAt: new Date(),
        declineReason: reason || null,
        clientActionBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, quote.id));

    // Resolve sales rep / admin email
    const [divSettings] = await db
      .select()
      .from(divisionBillingSettings)
      .where(eq(divisionBillingSettings.divisionId, quote.divisionId))
      .limit(1);

    const [orgSettings] = await db.select().from(organisationSettings).limit(1);

    const recipient = divSettings?.salesRepEmail || orgSettings?.email;

    if (recipient) {
      try {
        const emailClient = createEmailClient({
          apiKey: process.env.PMG_RESEND_API_KEY!,
          from: `PMG Portal <${DEFAULT_EMAIL_FROM}>`,
          adminEmail: DEFAULT_EMAIL_FROM,
        });

        await emailClient({
          to: recipient,
          subject: `Quote #${quote.documentNumber} has been DECLINED by ${client.businessName || client.name}`,
          react: React.createElement('div', { style: { fontFamily: 'sans-serif', padding: '20px' } },
            React.createElement('p', {}, 'Hi there,'),
            React.createElement('p', {}, `Client `, React.createElement('strong', {}, client.businessName || client.name), ` has declined Quote #${quote.documentNumber} on ${new Date().toLocaleString()}.`),
            React.createElement('p', {}, `Reason given: `, React.createElement('em', {}, reason || 'None provided'), '.'),
            React.createElement('p', {}, 'You can view this quote in the PMG Control Center.'),
            React.createElement('p', {}, 'Best regards,'),
            React.createElement('p', {}, 'PMG Portal')
          ),
        });
      } catch (emailErr) {
        console.error('Failed to send quote decline email:', emailErr);
      }
    }

    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath('/quotes');
    revalidatePath('/dashboard');
    return {};
  } catch (e) {
    console.error('declineQuoteAction failed:', e);
    return { error: 'Failed to decline quote. Please try again.' };
  }
}
