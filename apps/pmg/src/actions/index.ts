import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import {
  createEmailClient,
  AdminNewLeadEmail,
  AutoReplyEmail,
  DOMAINS,
  BRAND_FROM_EMAIL,
  BRAND_REPLY_TO,
  getResendApiKey
} from '@pmg/emails';
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

export const server = {
  submitContactForm: defineAction({
    accept: 'form',
    input: z.object({
      name: z.string().min(1, 'Name is required'),
      phone: z.string().optional(),
      email: z.string().email('Invalid email address'),
      message: z.string().min(1, 'Message is required'),
    }),
    handler: async (input) => {
      if (!apiKey) {
        console.error('PMG_RESEND_API_KEY is not configured.');
        throw new Error('Email dispatch is currently offline.');
      }

      // 1. Send Admin Alert Email (New Corporate Lead)
      const adminResult = await emailClient({
        to: adminEmail,
        subject: `New Corporate Enquiry: ${input.name}`,
        replyTo: input.email,
        react: React.createElement(AdminNewLeadEmail, {
          name: input.name,
          email: input.email,
          phone: input.phone || 'Not provided',
          companyName_lead: undefined,
          package_name: 'Corporate General Enquiry',
          package_price: 'N/A',
          package_type: 'General Enquiry',
          message: input.message,
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

      return { success: true };
    },
  }),
};
