'use server';

import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, quotations, divisionBillingSettings, organisationSettings, eq, and } from '@pmg/db';
import { revalidatePath } from 'next/cache';
import { createEmailClient, DEFAULT_EMAIL_FROM } from '@pmg/emails';
import React from 'react';

export async function acceptQuoteAction(quoteId: string): Promise<{ error?: string }> {
  try {
    const { client, session } = await getPortalSessionOrRedirect();
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

        await emailClient({
          to: recipient,
          subject: `Quote #${quote.documentNumber} has been ACCEPTED by ${client.businessName || client.name}`,
          react: React.createElement('div', { style: { fontFamily: 'sans-serif', padding: '20px' } },
            React.createElement('p', {}, 'Hi there,'),
            React.createElement('p', {}, `Client `, React.createElement('strong', {}, client.businessName || client.name), ` has accepted Quote #${quote.documentNumber} in the amount of ZAR ${quote.total} on ${new Date().toLocaleString()}.`),
            React.createElement('p', {}, 'You can view this quote in the PMG Control Center.'),
            React.createElement('p', {}, 'Best regards,'),
            React.createElement('p', {}, 'PMG Portal')
          ),
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
