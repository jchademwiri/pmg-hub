import { Heading, Section, Text, Button } from '@react-email/components';
import * as React from 'react';
import type { BrandingProps } from '../types';
import { EmailLayout } from './EmailLayout';

export type ClientOnboardingConfirmationEmailProps = {
  contactName: string;
  clientCompanyName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
} & BrandingProps;

export const ClientOnboardingConfirmationEmail = (
  props: ClientOnboardingConfirmationEmailProps,
) => {
  const {
    contactName,
    clientCompanyName,
    email,
    phone,
    whatsappNumber = '27740491433',
    companyName = 'Playhouse Media Group',
    primaryColor = '#1d4ed8',
    websiteUrl = 'https://playhousemedia.co.za',
    logoUrl,
  } = props;

  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    `Hi ${companyName}, I have submitted our onboarding details for ${clientCompanyName}.`,
  )}`;

  return (
    <EmailLayout
      previewText={`Welcome to ${companyName} - Details Received`}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={false}
    >
      {/* Heading */}
      <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
        🎉 Account Setup Received
      </Heading>

      <Text className="m-0 mb-[16px] text-[15px] leading-[24px] text-[#334155]">
        Hi {contactName},
      </Text>

      <Text className="m-0 mb-[24px] text-[15px] leading-[24px] text-[#334155]">
        Thank you for submitting your business details for <strong>{clientCompanyName}</strong>. Our
        team is setting up your client profile. We will follow up shortly with your account
        confirmation and next steps.
      </Text>

      {/* Summary Box */}
      <Section className="mb-[24px] rounded-[6px] border border-solid border-[#E2E8F0] bg-[#F8FAFC] p-[20px]">
        <Heading className="m-0 mb-[12px] text-[14px] font-bold text-[#020304]">
          📋 Submitted Information
        </Heading>
        <table className="w-full text-[13px]">
          <tbody>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Business Name:</td>
              <td className="py-2 text-[#020304] font-medium text-right">{clientCompanyName}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Contact Person:</td>
              <td className="py-2 text-[#020304] text-right">{contactName}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Email:</td>
              <td className="py-2 text-[#020304] text-right">{email}</td>
            </tr>
            <tr>
              <td className="py-2 text-[#64748B]">Phone:</td>
              <td className="py-2 text-[#020304] text-right font-mono">{phone}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Direct WhatsApp CTA */}
      <Section className="py-[16px] text-center">
        <Button
          href={whatsappUrl}
          className="box-border inline-block rounded-[6px] px-[24px] py-[12px] text-[14px] font-semibold text-white no-underline shadow-sm"
          style={{ backgroundColor: '#25D366' }}
        >
          💬 Chat on WhatsApp
        </Button>
      </Section>
    </EmailLayout>
  );
};

ClientOnboardingConfirmationEmail.PreviewProps = {
  contactName: 'Thabo Mokoena',
  clientCompanyName: 'Apex Dynamics Pty Ltd',
  email: 'thabo@apexdynamics.co.za',
  phone: '+27 82 555 1234',
  whatsappNumber: '27740491433',
  companyName: 'Playhouse Media Group',
  primaryColor: '#1d4ed8',
  websiteUrl: 'https://playhousemedia.co.za',
};

export default ClientOnboardingConfirmationEmail;
