import { sendEmail, AdminNewLeadEmail, AutoReplyEmail } from '@pmg/emails';
import * as React from 'react';
import dotenv from 'dotenv';
import path from 'path';

// Load env from apps/aws/.env.local
dotenv.config({ path: path.resolve('apps/aws/.env.local') });

async function verify() {
  const {
    TES_RESEND_API_KEY,
    AWS_FROM_EMAIL,
    AWS_ADMIN_EMAIL
  } = process.env;

  const apiKey = TES_RESEND_API_KEY; // Using what we found in .env.local

  console.log('--- Email Verification Test ---');
  console.log('API Key:', apiKey ? 'FOUND' : 'MISSING');
  console.log('From:', AWS_FROM_EMAIL);
  console.log('Admin:', AWS_ADMIN_EMAIL);

  if (!apiKey || !AWS_FROM_EMAIL || !AWS_ADMIN_EMAIL) {
    console.error('Missing required environment variables!');
    return;
  }

  const branding = {
    companyName: 'Apex Web Solutions (Test)',
    primaryColor: '#2563eb',
    websiteUrl: 'https://apexwebsolutions.co.za',
  };

  try {
    console.log('Sending test Admin notification...');
    const adminRes = await sendEmail(
      { apiKey, from: AWS_FROM_EMAIL, adminEmail: AWS_ADMIN_EMAIL },
      {
        to: AWS_ADMIN_EMAIL,
        subject: 'AWS Test - Admin Notification',
        react: React.createElement(AdminNewLeadEmail, {
          ...branding,
          name: 'Test User',
          email: 'test@example.com',
          phone: '0000000000',
          package_name: 'Test Package',
          package_price: 'R0',
          package_type: 'AWS TEST',
        }),
      }
    );
    console.log('Admin Email Result:', JSON.stringify(adminRes, null, 2));

    console.log('\nSending test User auto-reply...');
    const userRes = await sendEmail(
      { apiKey, from: AWS_FROM_EMAIL, adminEmail: AWS_ADMIN_EMAIL },
      {
        to: AWS_ADMIN_EMAIL, // Sending to admin for test to avoid spamming the "test user"
        subject: 'AWS Test - User Auto-Reply',
        react: React.createElement(AutoReplyEmail, {
          ...branding,
          name: 'Test User',
          whatsappNumber: '27740491433',
        }),
      }
    );
    console.log('User Email Result:', JSON.stringify(userRes, null, 2));

  } catch (err) {
    console.error('Verification failed:', err);
  }
}

verify();
