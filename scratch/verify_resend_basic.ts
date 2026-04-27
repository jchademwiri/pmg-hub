import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('apps/aws/.env.local') });

async function verify() {
  const resend = new Resend(process.env.AWS_RESEND_API_KEY);
  
  console.log('Verifying Resend Connection...');
  console.log('Sending to:', process.env.AWS_ADMIN_EMAIL);
  console.log('From:', process.env.AWS_FROM_EMAIL);

  const { data, error } = await resend.emails.send({
    from: process.env.AWS_FROM_EMAIL!,
    to: [process.env.AWS_ADMIN_EMAIL!],
    subject: 'AWS Final Verification Test',
    html: '<strong>Success!</strong> Your AWS Resend configuration is working perfectly.'
  });

  if (error) {
    console.error('Verification FAILED:', error);
  } else {
    console.log('Verification SUCCESS:', data);
  }
}

verify();
