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
      const {
        RESEND_API_KEY,
        TES_RESEND_API_KEY,
        AWS_FROM_EMAIL,
        AWS_ADMIN_EMAIL,
        DATABASE_URL,
        DATABASE_URL_UNPOOLED,
      } = import.meta.env;

      const apiKey = RESEND_API_KEY || TES_RESEND_API_KEY;

      if (!apiKey) {
        console.warn('[submitContact] RESEND_API_KEY (or TES_RESEND_API_KEY) is missing in environment.');
      }
      if (!DATABASE_URL) {
        console.warn('[submitContact] DATABASE_URL is missing in environment.');
      }

      // Bridge import.meta.env → process.env for @pmg/db
      process.env.DATABASE_URL = DATABASE_URL;
      if (DATABASE_URL_UNPOOLED) process.env.DATABASE_URL_UNPOOLED = DATABASE_URL_UNPOOLED;

      const db = getDb();

      // Look up the AWS division ID
      const [awsDivision] = await db
        .select({ id: divisions.id })
        .from(divisions)
        .where(eq(divisions.name, 'Apex Web Solutions'))
        .limit(1);

      // Insert Lead
      await db
        .insert(leads)
        .values({
          name:            input.name,
          email:           input.email,
          message:         `Subject: ${input.subject}\n\n${input.message}`,
          source:          'aws',
          status:          'new',
          divisionId:      awsDivision?.id ?? null,
        })
        .onConflictDoNothing();

      const branding = {
        companyName:  'Apex Web Solutions',
        primaryColor: '#2563eb',
        websiteUrl:   'https://apexwebsolutions.co.za',
      };

      // Send Emails
      try {
        console.log(`[submitContact] Processing enquiry from ${input.email}...`);

        // 1. Admin Notification
        const adminRes = await sendEmail(
          {
            apiKey:     apiKey,
            from:       AWS_FROM_EMAIL,
            adminEmail: AWS_ADMIN_EMAIL,
          },
          {
            to:      AWS_ADMIN_EMAIL,
            subject: `New AWS Enquiry — ${input.subject}`,
            react:   React.createElement(AdminNewLeadEmail, {
              ...branding,
              name:             input.name,
              email:            input.email,
              phone:            'Not provided',
              package_name:     input.subject,
              package_price:    'TBC',
              package_type:     'AWS Enquiry',
            }),
          },
        );
        console.log('[submitContact] Admin email result:', adminRes);

        // 2. User Auto-Reply
        const userRes = await sendEmail(
          {
            apiKey:     apiKey,
            from:       AWS_FROM_EMAIL,
            adminEmail: AWS_ADMIN_EMAIL,
          },
          {
            to:      input.email,
            subject: `We've received your enquiry — ${branding.companyName}`,
            react:   React.createElement(AutoReplyEmail, {
              ...branding,
              name:           input.name,
              whatsappNumber: '27740491433', // From Contact.astro
            }),
          },
        );
        console.log('[submitContact] User auto-reply result:', userRes);

      } catch (err) {
        console.error('[submitContact] Email flow failed:', err);
      }

      console.log('[submitContact] Handler completed successfully.');
      return { success: true };
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
      const {
        RESEND_API_KEY,
        TES_RESEND_API_KEY,
        AWS_FROM_EMAIL,
        AWS_ADMIN_EMAIL,
        DATABASE_URL,
        DATABASE_URL_UNPOOLED,
      } = import.meta.env;

      const apiKey = RESEND_API_KEY || TES_RESEND_API_KEY;

      process.env.DATABASE_URL = DATABASE_URL;
      if (DATABASE_URL_UNPOOLED) process.env.DATABASE_URL_UNPOOLED = DATABASE_URL_UNPOOLED;

      const db = getDb();

      // Look up division
      const [awsDivision] = await db
        .select({ id: divisions.id })
        .from(divisions)
        .where(eq(divisions.name, 'Apex Web Solutions'))
        .limit(1);

      // Insert Lead
      await db
        .insert(leads)
        .values({
          name:            input.name,
          email:           input.email,
          phone:           input.phone,
          message:         `Booking for: ${input.package} (${input.price} ${input.type})`,
          source:          'aws',
          status:          'new',
          divisionId:      awsDivision?.id ?? null,
        })
        .onConflictDoNothing();

      const branding = {
        companyName:  'Apex Web Solutions',
        primaryColor: '#2563eb',
        websiteUrl:   'https://apexwebsolutions.co.za',
      };

      try {
        console.log(`[bookService] Processing booking from ${input.email} for ${input.package}...`);

        // 1. Admin Notification
        await sendEmail(
          { apiKey, from: AWS_FROM_EMAIL, adminEmail: AWS_ADMIN_EMAIL },
          {
            to:      AWS_ADMIN_EMAIL,
            subject: `New AWS Booking — ${input.package}`,
            react:   React.createElement(AdminNewLeadEmail, {
              ...branding,
              name:             input.name,
              email:            input.email,
              phone:            input.phone,
              package_name:     input.package,
              package_price:    input.price,
              package_type:     `AWS ${input.type.toUpperCase()}`,
            }),
          },
        );

        // 2. User Auto-Reply
        await sendEmail(
          { apiKey, from: AWS_FROM_EMAIL, adminEmail: AWS_ADMIN_EMAIL },
          {
            to:      input.email,
            subject: `Booking Confirmation — ${branding.companyName}`,
            react:   React.createElement(AutoReplyEmail, {
              ...branding,
              name:           input.name,
              whatsappNumber: '27740491433',
            }),
          },
        );
      } catch (err) {
        console.error('[bookService] Email flow failed:', err);
      }

      console.log('[bookService] Handler completed successfully.');
      return { success: true };
    },
  }),
};
