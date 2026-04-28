import { sendEmail, AdminNewLeadEmail, AutoReplyEmail } from '@pmg/emails';
import * as React from 'react';

const { AWS_RESEND_API_KEY, AWS_FROM_EMAIL, AWS_ADMIN_EMAIL } = process.env as any;

async function testEmails() {
  console.log('--- AWS Email Test ---');
  console.log('API Key present:', !!AWS_RESEND_API_KEY);
  console.log('From:', AWS_FROM_EMAIL);
  console.log('Admin:', AWS_ADMIN_EMAIL);

  if (!AWS_RESEND_API_KEY || !AWS_FROM_EMAIL || !AWS_ADMIN_EMAIL) {
    console.error('Missing AWS environment variables in this context.');
    return;
  }

  const branding = {
    companyName:  'Apex Web Solutions (TEST)',
    logoUrl:      'https://apexwebsolutions.co.za/logo.png',
    contactEmail: AWS_FROM_EMAIL,
    websiteUrl:   'https://apexwebsolutions.co.za',
  };

  try {
    // 1. Admin Notification
    console.log('\nSending Admin notification...');
    const adminRes = await sendEmail(
      { 
        apiKey: AWS_RESEND_API_KEY,
        from: AWS_FROM_EMAIL,
        adminEmail: AWS_ADMIN_EMAIL
      },
      {
        to:      AWS_ADMIN_EMAIL,
        subject: '[TEST] NEW LEAD: Booking Request',
        react:   React.createElement(AdminNewLeadEmail, {
          ...branding,
          leadName:    'TEST BOT',
          leadEmail:   'test@example.com',
          leadPhone:   '+27000000000',
          leadMessage: 'Resilience Test: This lead was sent manually from the server environment.',
          source:      'AWS CLI Test',
        }),
      }
    );
    console.log('Admin Result:', adminRes);

    // 2. User Auto-Reply
    console.log('\nSending User auto-reply...');
    const userRes = await sendEmail(
      { 
        apiKey: AWS_RESEND_API_KEY,
        from: AWS_FROM_EMAIL,
        adminEmail: AWS_ADMIN_EMAIL
      },
      {
        to:      'jchademwiri@gmail.com',
        subject: '[TEST] We\'ve received your enquiry',
        react:   React.createElement(AutoReplyEmail, {
          ...branding,
          name:           'Jacob',
          whatsappNumber: '27740491433',
        }),
      }
    );
    console.log('User Result:', userRes);

  } catch (err) {
    console.error('Email test failed:', err);
  }
}

testEmails();
