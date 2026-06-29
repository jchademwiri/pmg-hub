import * as React from "react";
import {
  Heading,
  Section,
  Text,
  Button,
} from "@react-email/components";
import type { BrandingProps } from "../types";
import { DEFAULT_WEBSITE_URL } from "../domains";
import { EmailLayout } from "./EmailLayout";

export type AdminQuoteAcceptedEmailProps = {
  clientName: string;
  documentNumber: string;
  totalAmount: string;
  acceptedAt: string;
  viewUrl: string;
} & BrandingProps;

const AdminQuoteAcceptedEmail = (props: AdminQuoteAcceptedEmailProps) => {
  const {
    clientName,
    documentNumber,
    totalAmount,
    acceptedAt,
    viewUrl,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = DEFAULT_WEBSITE_URL,
    logoUrl,
  } = props;

  return (
    <EmailLayout
      previewText={`Quote #${documentNumber} has been accepted by ${clientName}`}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={false}
    >
      {/* Heading */}
      <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
        Quote Accepted
      </Heading>

      <Text className="m-0 mb-[24px] text-[15px] leading-[24px] text-[#334155]">
        Hi there,
      </Text>

      <Text className="m-0 mb-[24px] text-[15px] leading-[24px] text-[#334155]">
        Client <strong>{clientName}</strong> has accepted Quote <strong>#{documentNumber}</strong>.
      </Text>

      {/* Summary Block */}
      <Section className="mb-[24px] rounded-[8px] border border-solid border-[#E2E8F0] p-[20px]">
        <table className="w-full text-[14px]">
          <tbody>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Quote Number:</td>
              <td className="py-2 font-semibold text-[#020304] text-right">#{documentNumber}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Client Name:</td>
              <td className="py-2 text-[#020304] text-right font-medium">{clientName}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Amount:</td>
              <td className="py-2 text-[16px] font-bold text-brand text-right">{totalAmount}</td>
            </tr>
            <tr>
              <td className="py-2 text-[#64748B]">Accepted On:</td>
              <td className="py-2 text-[#020304] text-right">{acceptedAt}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* CTA Button */}
      <Section className="mb-[24px] text-center">
        <Button
          href={viewUrl}
          className="box-border rounded-[6px] px-[20px] py-[10px] text-[14px] font-semibold text-white no-underline inline-block"
          style={{ backgroundColor: primaryColor }}
        >
          View Quote in Control Center
        </Button>
      </Section>

      {/* Footer Sign-off */}
      <Section className="border-none border-t border-solid border-[#E2E8F0] pt-[20px]">
        <Text className="m-0 text-[14px] text-[#475569]">
          Best regards,<br />
          <strong>PMG Portal</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

AdminQuoteAcceptedEmail.PreviewProps = {
  clientName: "Basadipele",
  documentNumber: "TES-Q-2026-016",
  totalAmount: "ZAR 2,500.00",
  acceptedAt: "2026/06/29, 21:49:25",
  viewUrl: "https://control.playhousemedia.co.za/billing/quotes/some-id",
  companyName: "Playhouse Media Group",
  primaryColor: "#1d4ed8",
  websiteUrl: DEFAULT_WEBSITE_URL,
};

export default AdminQuoteAcceptedEmail;
