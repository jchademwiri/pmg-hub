import * as React from "react";
import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components";
import type { BrandingProps } from "../types";
import { DEFAULT_WEBSITE_URL } from "../domains";
import { EmailLayout } from "./EmailLayout";

export type ExpiringDocument = {
  documentType: string;
  customName?: string | null;
  expiryDate: string;
  status: string;
};

export type ComplianceReminderEmailProps = {
  recipientName: string;
  documents: ExpiringDocument[];
  portalUrl: string;
} & BrandingProps;

const ComplianceReminderEmail = (props: ComplianceReminderEmailProps) => {
  const {
    recipientName,
    documents,
    portalUrl,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = DEFAULT_WEBSITE_URL,
    logoUrl,
  } = props;

  return (
    <EmailLayout
      previewText={`Action Required: Compliance Documents Expiring`}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={false}
    >
      <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
        Action Required: Compliance Documents
      </Heading>

      <Text className="m-0 mb-[16px] text-[15px] leading-[24px] text-[#334155]">
        Hi {recipientName},
      </Text>

      <Text className="m-0 mb-[16px] text-[15px] leading-[24px] text-[#334155]">
        This is a friendly reminder that you have compliance documents that require your attention. Maintaining your compliance is critical to ensure uninterrupted business operations.
      </Text>

      <Section className="mb-[24px] rounded-[6px] border border-solid border-[#E2E8F0] overflow-hidden">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="border-b border-solid border-[#E2E8F0] px-[16px] py-[12px] font-semibold text-[#475569]">Document</th>
              <th className="border-b border-solid border-[#E2E8F0] px-[16px] py-[12px] font-semibold text-[#475569]">Expiry Date</th>
              <th className="border-b border-solid border-[#E2E8F0] px-[16px] py-[12px] font-semibold text-[#475569]">Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, idx) => (
              <tr key={idx}>
                <td className="border-b border-solid border-[#E2E8F0] px-[16px] py-[12px] text-[#0f172a]">
                  {doc.documentType === 'CUSTOM' ? doc.customName : doc.documentType}
                </td>
                <td className="border-b border-solid border-[#E2E8F0] px-[16px] py-[12px] text-[#0f172a]">
                  {doc.expiryDate}
                </td>
                <td className="border-b border-solid border-[#E2E8F0] px-[16px] py-[12px] text-[#ef4444] font-medium">
                  {doc.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section className="mb-[24px] text-center">
        <Button
          href={portalUrl}
          className="box-border rounded-[6px] px-[24px] py-[12px] text-[15px] font-semibold text-white no-underline inline-block"
          style={{ backgroundColor: primaryColor }}
        >
          Update Compliance via Portal
        </Button>
      </Section>

      <Section className="border-t border-solid border-[#E2E8F0] pt-[20px]">
        <Text className="m-0 text-[13px] text-[#475569]">
          If you have already renewed these documents, please update the expiry dates in your client portal.
        </Text>
        <Text className="m-0 mt-[12px] text-[13px] text-[#020304]">
          Warm regards,<br />
          <strong>The {companyName} Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

ComplianceReminderEmail.PreviewProps = {
  recipientName: "Jane Smith",
  portalUrl: "https://portal.playhousemedia.co.za",
  companyName: "Playhouse Media Group",
  primaryColor: "#1d4ed8",
  websiteUrl: DEFAULT_WEBSITE_URL,
  documents: [
    { documentType: 'SARS Tax Clearance PIN', expiryDate: '2026-08-01', status: 'Expiring in 14 Days' },
    { documentType: 'B-BBEE Affidavit', expiryDate: '2026-07-16', status: 'Expired Yesterday' },
  ]
};

export default ComplianceReminderEmail;
