import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { checkBotProtection } from '@pmg/utils';
import {
  createEmailClient,
  AdminNewLeadEmail,
  AutoReplyEmail,
  DOMAINS,
  BRAND_FROM_EMAIL,
  BRAND_REPLY_TO,
  getResendApiKey
} from '@pmg/emails';
import { getDb, leads, divisions, bridgeDatabaseEnv, eq } from '@pmg/db';
import React from 'react';

// Sourced API keys and verified branding from @pmg/emails central config
const apiKey = import.meta.env.PMG_RESEND_API_KEY || getResendApiKey('pmg') || '';
const fromEmail = BRAND_FROM_EMAIL.pmg; // noreply@info.playhousemedia.co.za
const adminEmail = BRAND_REPLY_TO.pmg;  // info@playhousemedia.co.za
const websiteUrl = `https://${DOMAINS.pmg}`;

const emailClient = createEmailClient({
  apiKey,
  from: fromEmail,
  adminEmail,
});

function dbFailureNote(dbSaved: boolean) {
  return !dbSaved
    ? '\n\n⚠️ NOTE: This lead was NOT saved to the database due to a technical error.'
    : '';
}

export const server = {
  submitContactForm: defineAction({
    accept: 'form',
    input: z.object({
      name:         z.string().min(1, 'Name is required'),
      phone:        z.string().optional().nullable(),
      email:        z.string().email('Invalid email address'),
      message:      z.string().min(1, 'Message is required'),
      _company_url: z.string().optional().or(z.literal('')).nullable(),
      _loadedAt:    z.string().optional().or(z.literal('')).nullable(),
      _turnstile:   z.string().optional().or(z.literal('')).nullable(),
    }),
    handler: async (input) => {
      // ── Bot protection ──────────────────────────────────────────────
      const botCheck = await checkBotProtection({
        honeypot: input._company_url,
        loadedAt: input._loadedAt,
        turnstile: input._turnstile,
        honeypotFieldName: '_company_url',
        successMessage: 'Submission received.',
      });
      if (botCheck.blocked) return botCheck.response!;

      // Load environment variables for the database
      const env = import.meta.env as Record<string, string | undefined>;
      bridgeDatabaseEnv(env);

      // Attempt to save to the database first
      const db = getDb();
      let dbSaved = false;
      let isUpdate = false;

      try {
        const [pmgDivision] = await db
          .select({ id: divisions.id })
          .from(divisions)
          .where(eq(divisions.name, 'Playhouse Media Group'))
          .limit(1);

        const existingLead = await db.query.leads.findFirst({
          where: (cols, { and, eq }) => and(
            eq(cols.email, input.email),
            eq(cols.divisionId, pmgDivision?.id ?? null),
          ),
        });

        if (existingLead) {
          isUpdate = true;
          await db
            .update(leads)
            .set({
              name: input.name,
              phone: input.phone || existingLead.phone || null,
              message: input.message,
              updatedAt: new Date(),
            })
            .where(eq(leads.id, existingLead.id));
        } else {
          await db
            .insert(leads)
            .values({
              name: input.name,
              email: input.email,
              phone: input.phone || null,
              message: input.message,
              source: 'pmg',
              status: 'new',
              divisionId: pmgDivision?.id ?? null,
            });
        }
        dbSaved = true;
      } catch (dbErr) {
        console.error('[submitContactForm] Database persistence failed:', dbErr);
      }

      if (!apiKey) {
        console.error('PMG_RESEND_API_KEY is not configured.');
        throw new Error('Email dispatch is currently offline.');
      }

      const emailMessage = `${input.message}${dbFailureNote(dbSaved)}`;

      // 1. Send Admin Alert Email (New Corporate Lead)
      const adminResult = await emailClient({
        to: adminEmail,
        subject: `${isUpdate ? '[UPDATE] ' : '[NEW LEAD] '} Corporate Enquiry: ${input.name}`,
        replyTo: input.email,
        react: React.createElement(AdminNewLeadEmail, {
          name: input.name,
          email: input.email,
          phone: input.phone || 'Not provided',
          companyName_lead: undefined,
          package_name: 'Corporate General Enquiry',
          package_price: 'N/A',
          package_type: 'General Enquiry',
          message: emailMessage,
          companyName: 'Playhouse Media Group',
          primaryColor: '#f97316',
          websiteUrl,
        }),
      });

      if (adminResult.error) {
        console.error('Failed to send admin notification:', adminResult.error.message);
        throw new Error('Failed to submit your enquiry. Please try again later.');
      }

      // 2. Send Auto-Reply to the customer
      const clientResult = await emailClient({
        to: input.email,
        subject: `Thank you for contacting Playhouse Media Group`,
        replyTo: adminEmail,
        react: React.createElement(AutoReplyEmail, {
          name: input.name,
          companyName: 'Playhouse Media Group',
          primaryColor: '#f97316',
          websiteUrl,
          whatsappNumber: '27740491433',
        }),
      });

      if (clientResult.error) {
        console.warn('Customer auto-reply failed to send:', clientResult.error.message);
      }

      return {
        success: true,
        message: dbSaved ? 'Enquiry sent successfully.' : 'Enquiry received (DB save pending).',
      };
    },
  }),
};
