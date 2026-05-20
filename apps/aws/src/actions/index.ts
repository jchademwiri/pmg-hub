import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { getDb, leads, divisions } from '@pmg/db';
import { eq } from '@pmg/db';
import { sendEmail, AdminNewLeadEmail, AutoReplyEmail } from '@pmg/emails';
import * as React from 'react';

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
        const {
          RESEND_API_KEY,
          AWS_RESEND_API_KEY,
          AWS_FROM_EMAIL,
          AWS_ADMIN_EMAIL,
          DATABASE_URL,
          DATABASE_URL_UNPOOLED,
        } = import.meta.env;

        const apiKey = RESEND_API_KEY || AWS_RESEND_API_KEY;

        console.log('[submitContact] DATABASE_URL presence:', !!DATABASE_URL);
        const db = getDb();
        let dbSaved = false;
        let isUpdate = false;

        try {
          console.log('[submitContact] Looking up division...');
          const [awsDivision] = await db
            .select({ id: divisions.id })
            .from(divisions)
            .where(eq(divisions.name, 'Apex Web Solutions'))
            .limit(1);

          console.log('[submitContact] Checking for existing lead by email and division...');
          const existingLead = await db.query.leads.findFirst({
            where: (cols, { and, eq }) => and(
              eq(cols.email, input.email),
              eq(cols.divisionId, awsDivision?.id ?? null)
            )
          });

          if (existingLead) {
            isUpdate = true;
            console.log(`[submitContact] Updating existing lead: ${existingLead.id}`);
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
            console.log(`[submitContact] Creating new lead...`);
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

        const branding = {
          companyName:  'Apex Web Solutions',
          logoUrl:      'https://apexwebsolutions.co.za/logo.png',
          contactEmail: AWS_FROM_EMAIL || 'info@apexwebsolutions.co.za',
          websiteUrl:   'https://apexwebsolutions.co.za',
        };

        const adminRecipient = AWS_ADMIN_EMAIL || 'enquiries@apexwebsolutions.co.za';

        try {
          console.log('[submitContact] Sending notification emails...');
          // 1. Admin Notification
          await sendEmail(
            { 
              apiKey,
              from:       branding.contactEmail,
              adminEmail: adminRecipient,
            },
            {
              to:      adminRecipient,
              subject: `${isUpdate ? '[UPDATE] ' : '[NEW LEAD] '} Contact Inquiry: ${input.subject}`,
              react:   React.createElement(AdminNewLeadEmail, {
                ...branding,
                leadName:    input.name,
                leadEmail:   input.email,
                leadMessage: `${input.message}${!dbSaved ? '\n\n⚠️ NOTE: This lead was NOT saved to the database due to a technical error.' : ''}`,
                source:      'AWS Contact Form',
              }),
            }
          );

          // 2. User Auto-Reply
          await sendEmail(
            { 
              apiKey,
              from:       branding.contactEmail,
              adminEmail: adminRecipient,
            },
            {
              to:      input.email,
              subject: `We've received your enquiry - ${branding.companyName}`,
              react:   React.createElement(AutoReplyEmail, {
                ...branding,
                name:           input.name,
                whatsappNumber: '27740491433',
              }),
            }
          );
        } catch (emailErr) {
          console.error('[submitContact] Email dispatch failed:', emailErr);
        }

        return { 
          success: true, 
          message: dbSaved ? 'Enquiry sent successfully.' : 'Enquiry received (Notifications sent, DB save pending).'
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
        const {
          RESEND_API_KEY,
          AWS_RESEND_API_KEY,
          AWS_FROM_EMAIL,
          AWS_ADMIN_EMAIL,
          DATABASE_URL,
          DATABASE_URL_UNPOOLED,
        } = import.meta.env;

        const apiKey = RESEND_API_KEY || AWS_RESEND_API_KEY;
        process.env.DATABASE_URL = DATABASE_URL;
        if (DATABASE_URL_UNPOOLED) process.env.DATABASE_URL_UNPOOLED = DATABASE_URL_UNPOOLED;

        const db = getDb();
        let dbSaved = false;
        let isUpdate = false;

        try {
          console.log('[bookService] Looking up division...');
          const [awsDivision] = await db
            .select({ id: divisions.id })
            .from(divisions)
            .where(eq(divisions.name, 'Apex Web Solutions'))
            .limit(1);
          
          console.log('[bookService] Checking for existing lead by (email OR phone) + division...');
          const existingLead = await db.query.leads.findFirst({
            where: (cols, { and, or, eq }) => and(
              eq(cols.divisionId, awsDivision?.id ?? null),
              or(
                eq(cols.email, input.email),
                eq(cols.phone, input.phone)
              )
            )
          });

          if (existingLead) {
            isUpdate = true;
            console.log(`[bookService] Updating existing lead: ${existingLead.id}`);
            await db
              .update(leads)
              .set({
                name:            input.name,
                email:           input.email,
                phone:           input.phone,
                message:         `Booking for: ${input.package} (${input.price} ${input.type})`,
                serviceInterest: input.package,
                updatedAt:       new Date(),
              })
              .where(eq(leads.id, existingLead.id));
          } else {
            console.log(`[bookService] Creating new lead...`);
            await db
              .insert(leads)
              .values({
                name:            input.name,
                email:           input.email,
                phone:           input.phone,
                message:         `Booking for: ${input.package} (${input.price} ${input.type})`,
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

        const branding = {
          companyName:  'Apex Web Solutions',
          logoUrl:      'https://apexwebsolutions.co.za/logo.png',
          contactEmail: AWS_FROM_EMAIL || 'info@apexwebsolutions.co.za',
          websiteUrl:   'https://apexwebsolutions.co.za',
        };

        const adminRecipient = AWS_ADMIN_EMAIL || 'enquiries@apexwebsolutions.co.za';

        try {
          console.log('[bookService] Sending notification emails...');
          // 1. Admin Notification
          await sendEmail(
            { 
              apiKey,
              from:       branding.contactEmail,
              adminEmail: adminRecipient,
            },
            {
              to:      adminRecipient,
              subject: `${isUpdate ? '[UPDATE] ' : '[NEW LEAD] '} Booking Request: ${input.package}`,
              react:   React.createElement(AdminNewLeadEmail, {
                ...branding,
                leadName:    input.name,
                leadEmail:   input.email,
                leadPhone:   input.phone,
                leadMessage: `Booking: ${input.package} (${input.price} ${input.type}) ${!dbSaved ? '\n\n⚠️ NOTE: This lead was NOT saved to the database due to a technical error.' : ''}`,
                source:      'AWS Pricing Page',
              }),
            }
          );

          // 2. User Auto-Reply
          await sendEmail(
            { 
              apiKey,
              from:       branding.contactEmail,
              adminEmail: adminRecipient,
            },
            {
              to:      input.email,
              subject: `Booking Confirmation - ${branding.companyName}`,
              react:   React.createElement(AutoReplyEmail, {
                ...branding,
                name:           input.name,
                whatsappNumber: '27740491433',
              }),
            }
          );
        } catch (emailErr) {
          console.error('[bookService] Email dispatch failed:', emailErr);
        }

        return { 
          success: true, 
          message: dbSaved ? 'Booking saved and notifications sent.' : 'Booking received (Notifications sent, DB save pending).' 
        };
      } catch (error) {
        console.error('[bookService] FATAL ERROR:', error);
        return { success: false, error: (error as Error).message };
      }
    },
  }),
};
