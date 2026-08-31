import { Heading, Section, Text, Button } from '@react-email/components';
import * as React from 'react';
import type { BrandingProps } from '../types';
import { EmailLayout } from './EmailLayout';

export type AdminOnboardingNotificationEmailProps = {
  contactName: string;
  clientCompanyName: string;
  email: string;
  phone: string;
  registrationNumber?: string;
  divisionName?: string;
  notes?: string;
  adminReviewUrl?: string;
} & BrandingProps;

export const AdminOnboardingNotificationEmail = (props: AdminOnboardingNotificationEmailProps) => {
  const {
    contactName,
    clientCompanyName,
    email,
    phone,
    registrationNumber,
    divisionName,
    notes,
    adminReviewUrl = 'https://admin.playhousemedia.co.za/relationships/onboarding',
    companyName = 'Playhouse Media Group',
    primaryColor = '#1d4ed8',
    websiteUrl = 'https://playhousemedia.co.za',
    logoUrl,
  } = props;

  return (
    <EmailLayout
      previewText={`New Client Onboarding: ${clientCompanyName} (${contactName})`}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={false}
    >
      {/* Heading */}
      <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
        🚀 New Client Onboarding Submitted
      </Heading>

      <Text className="m-0 mb-[24px] text-[15px] leading-[24px] text-[#334155]">
        A new client has completed the self-onboarding form. You can review their details and
        convert them into an official client profile with 1 click.
      </Text>

      {/* Profile Details */}
      <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-brand bg-[#F8FAFC] p-[20px]">
        <Heading className="m-0 mb-[12px] text-[15px] font-bold text-[#020304]">
          🏢 Client & Business Profile
        </Heading>
        <table className="w-full text-[14px]">
          <tbody>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Business Name:</td>
              <td className="py-2 text-[#020304] font-bold text-right">{clientCompanyName}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Contact Person:</td>
              <td className="py-2 text-[#020304] font-medium text-right">{contactName}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Email Address:</td>
              <td className="py-2 text-right">
                <a href={`mailto:${email}`} className="text-brand no-underline hover:underline">
                  {email}
                </a>
              </td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Phone / WhatsApp:</td>
              <td className="py-2 text-[#020304] text-right">
                <a
                  href={`tel:${phone}`}
                  className="text-brand no-underline hover:underline font-mono"
                >
                  {phone}
                </a>
              </td>
            </tr>
            {divisionName && (
              <tr className="border-b border-solid border-[#F1F5F9]">
                <td className="py-2 text-[#64748B]">Division / Brand:</td>
                <td className="py-2 text-[#020304] text-right">{divisionName}</td>
              </tr>
            )}
            {registrationNumber && (
              <tr className="border-b border-solid border-[#F1F5F9]">
                <td className="py-2 text-[#64748B]">CIPC Reg Number:</td>
                <td className="py-2 text-[#020304] text-right font-mono">{registrationNumber}</td>
              </tr>
            )}
            {notes && (
              <tr>
                <td colSpan={2} className="py-2 text-[#020304] leading-[20px] whitespace-pre-wrap">
                  <strong>Notes:</strong>
                  <br />
                  <span className="text-[#475569] italic">"{notes}"</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* 1-Click Conversion Call to Action */}
      <Section className="py-[16px] text-center">
        <Button
          href={adminReviewUrl}
          className="box-border inline-block rounded-[6px] px-[28px] py-[14px] text-[14px] font-bold text-white no-underline shadow-md"
          style={{ backgroundColor: primaryColor }}
        >
          ⚡ Review & Convert in Admin
        </Button>
      </Section>
    </EmailLayout>
  );
};

AdminOnboardingNotificationEmail.PreviewProps = {
  contactName: 'Thabo Mokoena',
  clientCompanyName: 'Apex Dynamics Pty Ltd',
  email: 'thabo@apexdynamics.co.za',
  phone: '+27 82 555 1234',
  registrationNumber: '2024/789123/07',
  divisionName: 'Playhouse Media Group',
  adminReviewUrl: 'https://admin.playhousemedia.co.za/relationships/onboarding',
  companyName: 'Playhouse Media Group',
  primaryColor: '#1d4ed8',
  websiteUrl: 'https://playhousemedia.co.za',
};

export default AdminOnboardingNotificationEmail;
