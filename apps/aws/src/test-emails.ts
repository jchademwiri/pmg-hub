import { sendEmail, AdminNewLeadEmail, AutoReplyEmail, resolveBrandEmailConfig, toResendConfig } from '@pmg/emails';
import * as React from 'react';

const env = process.env as Record<string, string | undefined>;
const brand = resolveBrandEmailConfig('aws', env);

async function testEmails() {
  console.log('--- AWS Email Test ---');
  console.log('API Key present:', !!brand.apiKey);
  console.log('From:', brand.from);
  console.log('Admin:', brand.adminEmail);
  console.log('Domain check: from should end with apexwebsolutions.co.za');

  if (!brand.apiKey || !brand.from || !brand.adminEmail) {
    console.error('Missing AWS environment variables in this context.');
    return;
  }

  const resendConfig = toResendConfig(brand);

  try {
    console.log('\nSending Admin notification...');
    const adminRes = await sendEmail(resendConfig, {
      to:      brand.adminEmail,
      subject: '[TEST] NEW LEAD: Booking Request',
      react:   React.createElement(AdminNewLeadEmail, {
        name:          'TEST BOT',
        email:         'test@example.com',
        phone:         '+27000000000',
        package_name:  'Starter Website',
        package_price: 'R299/mo',
        package_type:  'AWS CLI Test',
        message:       'Resilience Test: This lead was sent manually from the server environment.',
        companyName:   brand.companyName,
        primaryColor:  brand.primaryColor,
        websiteUrl:    brand.websiteUrl,
        logoUrl:       brand.logoUrl,
      }),
    });
    console.log('Admin Result:', adminRes);

    console.log('\nSending User auto-reply...');
    const userRes = await sendEmail(resendConfig, {
      to:      brand.adminEmail,
      subject: '[TEST] We\'ve received your enquiry',
      react:   React.createElement(AutoReplyEmail, {
        name:           'Jacob',
        whatsappNumber: '27740491433',
        companyName:    brand.companyName,
        primaryColor:   brand.primaryColor,
        websiteUrl:     brand.websiteUrl,
        logoUrl:        brand.logoUrl,
      }),
    });
    console.log('User Result:', userRes);
  } catch (err) {
    console.error('Email test failed:', err);
  }
}

testEmails();
