import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { getDb, leads, divisions, bridgeDatabaseEnv } from '@pmg/db';
import { eq } from '@pmg/db';
import { checkBotProtection } from '@pmg/utils';
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
      name:            z.string().min(1, 'Name is required'),
      phone:           z.string().min(7, 'Phone number is required'),
      email:           z.string().email().optional().or(z.literal('')),
      companyName:     z.string().optional().or(z.literal('')),
      serviceInterest: z.string().min(1, 'Please select a service'),
      _website:        z.string().optional().or(z.literal('')),
      _loadedAt:       z.string().optional().or(z.literal('')),
      _turnstile:      z.string().optional().or(z.literal('')),
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
          where: (cols, { and, or, eq }) => and(
            eq(cols.divisionId, tesDivision?.id ?? null),
            or(
              eq(cols.phone, input.phone),
              ...(input.email ? [eq(cols.email, input.email)] : []),
            ),
          ),
        });

        const leadValues = {
          name:            input.name,
          phone:           input.phone,
          email:           input.email || null,
          message:         input.companyName ? `Company: ${input.companyName}` : null,
          serviceInterest: input.serviceInterest,
          source:          'tes' as const,
          status:          'new' as const,
          divisionId:      tesDivision?.id ?? null,
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
          to:      brand.adminEmail,
          subject: `${isUpdate ? '[UPDATE] ' : ''}New TES Enquiry - ${input.name}`,
          replyTo: input.email || undefined,
          react:   React.createElement(AdminNewLeadEmail, {
            name:             input.name,
            email:            input.email || 'Not provided',
            phone:            input.phone,
            companyName_lead: input.companyName || undefined,
            package_name:     input.serviceInterest,
            package_price:    'TBC',
            package_type:     'TES Enquiry',
            message:          dbNote || undefined,
            companyName:      brand.companyName,
            primaryColor:     brand.primaryColor,
            websiteUrl:       brand.websiteUrl,
          }),
        });

        if (adminResult.error) {
          console.error('[enquireLead] Admin email failed:', adminResult.error.message);
        }

        if (input.email) {
          const autoReplyResult = await sendEmail(resendConfig, {
            to:      input.email,
            subject: `We've received your enquiry - ${brand.companyName}`,
            react:   React.createElement(AutoReplyEmail, {
              name:           input.name,
              whatsappNumber: TES_WHATSAPP,
              companyName:    brand.companyName,
              primaryColor:   brand.primaryColor,
              websiteUrl:     brand.websiteUrl,
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
        message: dbSaved ? 'Enquiry sent successfully.' : 'Enquiry received. We will follow up shortly.',
      };
    },
  }),
};
