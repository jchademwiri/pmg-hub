import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { getDb, leads, divisions } from '@pmg/db';
import { eq } from '@pmg/db';
import { sendEmail, AdminNewLeadEmail } from '@pmg/emails';
import * as React from 'react';

export const server = {
  enquireLead: defineAction({
    accept: 'form',
    input: z.object({
      name:            z.string().min(1, 'Name is required'),
      phone:           z.string().min(7, 'Phone number is required'),
      email:           z.string().email().optional().or(z.literal('')),
      companyName:     z.string().optional().or(z.literal('')),
      serviceInterest: z.string().min(1, 'Please select a service'),
    }),
    handler: async (input) => {
      const {
        TES_RESEND_API_KEY,
        TES_FROM_EMAIL,
        TES_ADMIN_EMAIL,
        DATABASE_URL,
        DATABASE_URL_UNPOOLED,
      } = import.meta.env;

      // Bridge import.meta.env → process.env for @pmg/db
      process.env.DATABASE_URL = DATABASE_URL;
      if (DATABASE_URL_UNPOOLED) process.env.DATABASE_URL_UNPOOLED = DATABASE_URL_UNPOOLED;

      const db = getDb();

      // Look up the TES division ID
      const [tesDivision] = await db
        .select({ id: divisions.id })
        .from(divisions)
        .where(eq(divisions.name, 'Tender Edge Solutions'))
        .limit(1);

      await db
        .insert(leads)
        .values({
          name:            input.name,
          phone:           input.phone,
          email:           input.email || null,
          message:         input.companyName ? `Company: ${input.companyName}` : null,
          serviceInterest: input.serviceInterest,
          source:          'tes',
          status:          'new',
          divisionId:      tesDivision?.id ?? null,
        })
        .onConflictDoNothing();

      try {
        await sendEmail(
          {
            apiKey:     TES_RESEND_API_KEY,
            from:       TES_FROM_EMAIL,
            adminEmail: TES_ADMIN_EMAIL,
          },
          {
            to:      TES_ADMIN_EMAIL,
            subject: `New TES Enquiry — ${input.name}`,
            react:   React.createElement(AdminNewLeadEmail, {
              name:             input.name,
              email:            input.email || 'Not provided',
              phone:            input.phone,
              companyName_lead: input.companyName || undefined,
              package_name:     input.serviceInterest,
              package_price:    'TBC',
              package_type:     'TES Enquiry',
              companyName:      'Tender Edge Solutions',
              primaryColor:     '#c9a227',
              websiteUrl:       'https://www.tenderedgesolutions.co.za',
            }),
          },
        );
      } catch (err) {
        console.error('[enquireLead] Email send failed:', err);
      }

      return { success: true };
    },
  }),
};
