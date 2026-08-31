import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { getDb, leads, divisions, bridgeDatabaseEnv } from '@pmg/db';
import { eq } from '@pmg/db';
import { checkBotProtection } from '@pmg/utils/bot-protection';
import {
  sendEmail,
  AdminNewLeadEmail,
  AutoReplyEmail,
  resolveBrandEmailConfig,
  toResendConfig,
} from '@pmg/emails';
import * as React from 'react';

const TES_WHATSAPP = '27745017094';

export const server = {
  enquireLead: defineAction({
    accept: 'form',
    input: z.object({
      name: z.string().min(1, 'Name is required'),
      phone: z.string().min(7, 'Phone number is required'),
      email: z.string().email().optional().or(z.literal('')).nullable(),
      companyName: z.string().optional().or(z.literal('')).nullable(),
      serviceInterest: z.string().min(1, 'Please select a service'),
      _website: z.string().optional().or(z.literal('')).nullable(),
      _loadedAt: z.string().optional().or(z.literal('')).nullable(),
      _turnstile: z.string().optional().or(z.literal('')).nullable(),
    }),
    handler: async (input) => {
      // ── Bot protection ──────────────────────────────────────────────
      const botCheck = await checkBotProtection({
        honeypot: input._website,
        loadedAt: input._loadedAt,
        turnstile: input._turnstile,
        honeypotFieldName: '_website',
        successMessage: 'Enquiry sent successfully.',
      });
      if (botCheck.blocked) return botCheck.response!;

      const env = import.meta.env as Record<string, string | undefined>;
      bridgeDatabaseEnv(env);

      const brand = resolveBrandEmailConfig('tes', env);
      const db = getDb();
      let dbSaved = false;
      let isUpdate = false;

      try {
        const [tesDivision] = await db
          .select({ id: divisions.id })
          .from(divisions)
          .where(eq(divisions.name, 'Tender Edge Solutions'))
          .limit(1);

        const existingLead = await db.query.leads.findFirst({
          where: (cols, { and, or, eq }) =>
            and(
              eq(cols.divisionId, tesDivision?.id ?? null),
              or(
                eq(cols.phone, input.phone),
                ...(input.email ? [eq(cols.email, input.email)] : []),
              ),
            ),
        });

        const leadValues = {
          name: input.name,
          phone: input.phone,
          email: input.email || null,
          message: input.companyName ? `Company: ${input.companyName}` : null,
          serviceInterest: input.serviceInterest,
          source: 'tes' as const,
          status: 'new' as const,
          divisionId: tesDivision?.id ?? null,
        };

        if (existingLead) {
          isUpdate = true;
          await db
            .update(leads)
            .set({ ...leadValues, updatedAt: new Date() })
            .where(eq(leads.id, existingLead.id));
        } else {
          await db.insert(leads).values(leadValues);
        }
        dbSaved = true;
      } catch (dbErr) {
        console.error('[enquireLead] Database persistence failed:', dbErr);
      }

      if (!brand.apiKey) {
        console.error('[enquireLead] TES_RESEND_API_KEY is not configured');
        return {
          success: dbSaved,
          message: dbSaved
            ? 'Enquiry saved. Email notifications are temporarily unavailable.'
            : 'Unable to process your enquiry. Please contact us on WhatsApp.',
        };
      }

      const resendConfig = toResendConfig(brand);
      const dbNote = !dbSaved
        ? '\n\n⚠️ NOTE: This lead was NOT saved to the database due to a technical error.'
        : '';

      try {
        const adminResult = await sendEmail(resendConfig, {
          to: brand.adminEmail,
          subject: `${isUpdate ? '[UPDATE] ' : ''}New TES Enquiry - ${input.name}`,
          replyTo: input.email || undefined,
          react: React.createElement(AdminNewLeadEmail, {
            name: input.name,
            email: input.email || 'Not provided',
            phone: input.phone,
            companyName_lead: input.companyName || undefined,
            package_name: input.serviceInterest,
            package_price: 'TBC',
            package_type: 'TES Enquiry',
            message: dbNote || undefined,
            companyName: brand.companyName,
            primaryColor: brand.primaryColor,
            websiteUrl: brand.websiteUrl,
          }),
        });

        if (adminResult.error) {
          console.error('[enquireLead] Admin email failed:', adminResult.error.message);
        }

        if (input.email) {
          const autoReplyResult = await sendEmail(resendConfig, {
            to: input.email,
            subject: `We've received your enquiry - ${brand.companyName}`,
            react: React.createElement(AutoReplyEmail, {
              name: input.name,
              whatsappNumber: TES_WHATSAPP,
              companyName: brand.companyName,
              primaryColor: brand.primaryColor,
              websiteUrl: brand.websiteUrl,
            }),
          });

          if (autoReplyResult.error) {
            console.error('[enquireLead] Auto-reply failed:', autoReplyResult.error.message);
          }
        }
      } catch (err) {
        console.error('[enquireLead] Email send failed:', err);
      }

      return {
        success: true,
        message: dbSaved
          ? 'Enquiry sent successfully.'
          : 'Enquiry received. We will follow up shortly.',
      };
    },
  }),

  submitOnboarding: defineAction({
    accept: 'form',
    input: z.object({
      contactName: z.string().min(1, 'Contact person name is required'),
      companyName: z.string().min(1, 'Business or company name is required'),
      email: z.string().email('Please enter a valid email address'),
      phone: z.string().min(7, 'Please enter a valid phone number'),
      registrationNumber: z.string().optional().or(z.literal('')).nullable(),
      notes: z.string().optional().or(z.literal('')).nullable(),
      leadId: z.string().optional().or(z.literal('')).nullable(),
      _website: z.string().optional().or(z.literal('')).nullable(),
      _loadedAt: z.string().optional().or(z.literal('')).nullable(),
      _turnstile: z.string().optional().or(z.literal('')).nullable(),
    }),
    handler: async (input) => {
      // ── Bot protection ──────────────────────────────────────────────
      const botCheck = await checkBotProtection({
        honeypot: input._website,
        loadedAt: input._loadedAt,
        turnstile: input._turnstile,
        honeypotFieldName: '_website',
        successMessage: 'Onboarding submitted successfully.',
      });
      if (botCheck.blocked) return botCheck.response!;

      const env = import.meta.env as Record<string, string | undefined>;
      bridgeDatabaseEnv(env);

      const brand = resolveBrandEmailConfig('tes', env);
      const db = getDb();
      let dbSaved = false;

      try {
        const [tesDivision] = await db
          .select({ id: divisions.id })
          .from(divisions)
          .where(eq(divisions.name, 'Tender Edge Solutions'))
          .limit(1);

        const { clientOnboardings } = await import('@pmg/db');

        await db.insert(clientOnboardings).values({
          contactName: input.contactName,
          companyName: input.companyName,
          email: input.email,
          phone: input.phone,
          registrationNumber: input.registrationNumber || null,
          notes: input.notes || null,
          divisionId: tesDivision?.id ?? null,
          leadId: input.leadId || null,
          status: 'pending',
        });

        dbSaved = true;
      } catch (dbErr) {
        console.error('[submitOnboarding] Database persistence failed:', dbErr);
      }

      if (brand.apiKey) {
        const resendConfig = toResendConfig(brand);
        const { AdminOnboardingNotificationEmail, ClientOnboardingConfirmationEmail } = await import(
          '@pmg/emails'
        );

        try {
          // 1. Admin Alert
          await sendEmail(resendConfig, {
            to: brand.adminEmail,
            subject: `🚀 New TES Client Onboarding: ${input.companyName} (${input.contactName})`,
            replyTo: input.email,
            react: React.createElement(AdminOnboardingNotificationEmail, {
              contactName: input.contactName,
              clientCompanyName: input.companyName,
              email: input.email,
              phone: input.phone,
              registrationNumber: input.registrationNumber || undefined,
              divisionName: 'Tender Edge Solutions',
              notes: input.notes || undefined,
              adminReviewUrl: 'https://admin.playhousemedia.co.za/relationships/onboarding',
              companyName: brand.companyName,
              primaryColor: brand.primaryColor,
              websiteUrl: brand.websiteUrl,
              logoUrl: brand.logoUrl,
            }),
          });

          // 2. Client Confirmation
          await sendEmail(resendConfig, {
            to: input.email,
            subject: `Account Setup Received - ${brand.companyName}`,
            replyTo: brand.adminEmail,
            react: React.createElement(ClientOnboardingConfirmationEmail, {
              contactName: input.contactName,
              clientCompanyName: input.companyName,
              email: input.email,
              phone: input.phone,
              whatsappNumber: TES_WHATSAPP,
              companyName: brand.companyName,
              primaryColor: brand.primaryColor,
              websiteUrl: brand.websiteUrl,
              logoUrl: brand.logoUrl,
            }),
          });
        } catch (emailErr) {
          console.error('[submitOnboarding] Email dispatch failed:', emailErr);
        }
      }

      return {
        success: true,
        message: dbSaved
          ? 'Your business profile has been submitted successfully!'
          : 'Submission received. We will follow up shortly.',
      };
    },
  }),
};
