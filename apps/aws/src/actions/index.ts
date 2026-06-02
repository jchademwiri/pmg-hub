import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { getDb, leads, divisions, bridgeDatabaseEnv } from '@pmg/db';
import { eq } from '@pmg/db';
import {
  sendEmail,
  AdminNewLeadEmail,
  AutoReplyEmail,
  resolveBrandEmailConfig,
  toResendConfig,
} from '@pmg/emails';
import * as React from 'react';

const AWS_WHATSAPP = '27740491433';

function dbFailureNote(dbSaved: boolean) {
  return !dbSaved
    ? '\n\n⚠️ NOTE: This lead was NOT saved to the database due to a technical error.'
    : '';
}

export const server = {
  submitContact: defineAction({
    accept: 'form',
    input: z.object({
      name:    z.string().min(1, 'Name is required'),
      email:   z.string().email('Keep it valid'),
      subject: z.string().min(1, 'Subject is required'),
      message: z.string().min(1, 'Message is required'),
    }),
    handler: async (input) => {
      try {
        const env = import.meta.env as Record<string, string | undefined>;
        bridgeDatabaseEnv(env);

        const brand = resolveBrandEmailConfig('aws', env);
        const db = getDb();
        let dbSaved = false;
        let isUpdate = false;

        try {
          const [awsDivision] = await db
            .select({ id: divisions.id })
            .from(divisions)
            .where(eq(divisions.name, 'Apex Web Solutions'))
            .limit(1);

          const existingLead = await db.query.leads.findFirst({
            where: (cols, { and, eq }) => and(
              eq(cols.email, input.email),
              eq(cols.divisionId, awsDivision?.id ?? null),
            ),
          });

          if (existingLead) {
            isUpdate = true;
            await db
              .update(leads)
              .set({
                name:            input.name,
                message:         input.message,
                serviceInterest: input.subject,
                updatedAt:       new Date(),
              })
              .where(eq(leads.id, existingLead.id));
          } else {
            await db
              .insert(leads)
              .values({
                name:            input.name,
                email:           input.email,
                message:         input.message,
                serviceInterest: input.subject,
                source:          'aws',
                status:          'new',
                divisionId:      awsDivision?.id ?? null,
              });
          }
          dbSaved = true;
        } catch (dbErr) {
          console.error('[submitContact] Database persistence failed:', dbErr);
        }

        if (brand.apiKey) {
          const resendConfig = toResendConfig(brand);
          const messageBody = `${input.message}${dbFailureNote(dbSaved)}`;

          const adminResult = await sendEmail(resendConfig, {
            to:      brand.adminEmail,
            subject: `${isUpdate ? '[UPDATE] ' : '[NEW LEAD] '} Contact Inquiry: ${input.subject}`,
            replyTo: input.email,
            react:   React.createElement(AdminNewLeadEmail, {
              name:          input.name,
              email:         input.email,
              package_name:  input.subject,
              package_price: 'N/A',
              package_type:  'Contact Form',
              message:       messageBody,
              companyName:   brand.companyName,
              primaryColor:  brand.primaryColor,
              websiteUrl:    brand.websiteUrl,
              logoUrl:       brand.logoUrl,
            }),
          });

          if (adminResult.error) {
            console.error('[submitContact] Admin email failed:', adminResult.error.message);
          }

          const autoReplyResult = await sendEmail(resendConfig, {
            to:      input.email,
            subject: `We've received your enquiry - ${brand.companyName}`,
            react:   React.createElement(AutoReplyEmail, {
              name:           input.name,
              whatsappNumber: AWS_WHATSAPP,
              companyName:    brand.companyName,
              primaryColor:   brand.primaryColor,
              websiteUrl:     brand.websiteUrl,
              logoUrl:        brand.logoUrl,
            }),
          });

          if (autoReplyResult.error) {
            console.error('[submitContact] Auto-reply failed:', autoReplyResult.error.message);
          }
        } else {
          console.error('[submitContact] AWS_RESEND_API_KEY is not configured');
        }

        return {
          success: true,
          message: dbSaved ? 'Enquiry sent successfully.' : 'Enquiry received (Notifications sent, DB save pending).',
        };
      } catch (error) {
        console.error('[submitContact] FATAL ERROR:', error);
        return { success: false, error: (error as Error).message };
      }
    },
  }),

  bookService: defineAction({
    accept: 'form',
    input: z.object({
      name:    z.string().min(1, 'Name is required'),
      email:   z.string().email('Valid email required'),
      phone:   z.string().min(7, 'Phone number is required'),
      package: z.string().min(1, 'Package is required'),
      price:   z.string().min(1, 'Price is required'),
      type:    z.string().min(1, 'Type is required'),
    }),
    handler: async (input) => {
      try {
        const env = import.meta.env as Record<string, string | undefined>;
        bridgeDatabaseEnv(env);

        const brand = resolveBrandEmailConfig('aws', env);
        const db = getDb();
        let dbSaved = false;
        let isUpdate = false;
        const bookingMessage = `Booking for: ${input.package} (${input.price} ${input.type})`;

        try {
          const [awsDivision] = await db
            .select({ id: divisions.id })
            .from(divisions)
            .where(eq(divisions.name, 'Apex Web Solutions'))
            .limit(1);

          const existingLead = await db.query.leads.findFirst({
            where: (cols, { and, or, eq }) => and(
              eq(cols.divisionId, awsDivision?.id ?? null),
              or(
                eq(cols.email, input.email),
                eq(cols.phone, input.phone),
              ),
            ),
          });

          if (existingLead) {
            isUpdate = true;
            await db
              .update(leads)
              .set({
                name:            input.name,
                email:           input.email,
                phone:           input.phone,
                message:         bookingMessage,
                serviceInterest: input.package,
                updatedAt:       new Date(),
              })
              .where(eq(leads.id, existingLead.id));
          } else {
            await db
              .insert(leads)
              .values({
                name:            input.name,
                email:           input.email,
                phone:           input.phone,
                message:         bookingMessage,
                serviceInterest: input.package,
                source:          'aws',
                status:          'new',
                divisionId:      awsDivision?.id ?? null,
              });
          }
          dbSaved = true;
        } catch (dbErr) {
          console.error('[bookService] Database persistence failed:', dbErr);
        }

        if (brand.apiKey) {
          const resendConfig = toResendConfig(brand);
          const messageBody = `${bookingMessage}${dbFailureNote(dbSaved)}`;

          const adminResult = await sendEmail(resendConfig, {
            to:      brand.adminEmail,
            subject: `${isUpdate ? '[UPDATE] ' : '[NEW LEAD] '} Booking Request: ${input.package}`,
            replyTo: input.email,
            react:   React.createElement(AdminNewLeadEmail, {
              name:          input.name,
              email:         input.email,
              phone:         input.phone,
              package_name:  input.package,
              package_price: input.price,
              package_type:  input.type,
              message:       messageBody,
              companyName:   brand.companyName,
              primaryColor:  brand.primaryColor,
              websiteUrl:    brand.websiteUrl,
              logoUrl:       brand.logoUrl,
            }),
          });

          if (adminResult.error) {
            console.error('[bookService] Admin email failed:', adminResult.error.message);
          }

          const autoReplyResult = await sendEmail(resendConfig, {
            to:      input.email,
            subject: `Booking Confirmation - ${brand.companyName}`,
            react:   React.createElement(AutoReplyEmail, {
              name:           input.name,
              whatsappNumber: AWS_WHATSAPP,
              companyName:    brand.companyName,
              primaryColor:   brand.primaryColor,
              websiteUrl:     brand.websiteUrl,
              logoUrl:        brand.logoUrl,
            }),
          });

          if (autoReplyResult.error) {
            console.error('[bookService] Auto-reply failed:', autoReplyResult.error.message);
          }
        } else {
          console.error('[bookService] AWS_RESEND_API_KEY is not configured');
        }

        return {
          success: true,
          message: dbSaved ? 'Booking saved and notifications sent.' : 'Booking received (Notifications sent, DB save pending).',
        };
      } catch (error) {
        console.error('[bookService] FATAL ERROR:', error);
        return { success: false, error: (error as Error).message };
      }
    },
  }),
};
