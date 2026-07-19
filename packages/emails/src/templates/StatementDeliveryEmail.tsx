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

export type StatementDeliveryEmailProps = {
  clientName: string;
  statementDate: string;
  period: string;
  totalAmountDue: string;
  personalMessage?: string;
  portalUrl?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
  };
} & BrandingProps;

const StatementDeliveryEmail = (props: StatementDeliveryEmailProps) => {
  const {
    clientName,
    statementDate,
    period,
    totalAmountDue,
    personalMessage,
    portalUrl,
    bankDetails,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = DEFAULT_WEBSITE_URL,
    logoUrl,
  } = props;

  return (
    <EmailLayout
      previewText={`Your Account Statement from ${companyName}`}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
    >
      {/* Greeting */}
      <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
        Hello {clientName},
      </Heading>

      <Text className="m-0 mb-[16px] text-[15px] leading-[24px] text-[#334155]">
        Please find attached your account statement from <strong>{companyName}</strong>.
      </Text>

      {portalUrl && (
        <Section className="mb-[24px] text-center">
          <Button
            href={portalUrl}
            className="box-border rounded-[6px] px-[20px] py-[10px] text-[14px] font-semibold text-white no-underline inline-block"
            style={{ backgroundColor: primaryColor }}
          >
            View Account in Portal
          </Button>
          <Text className="m-0 mt-[8px] text-[12px] text-center" style={{ color: '#64748B' }}>
            Note: You only need your email address to access the portal—no password is required.
          </Text>
        </Section>
      )}

      {/* Custom Admin Message */}
      {personalMessage && (
        <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-brand bg-[#F8FAFC] p-[16px]">
          <Text className="m-0 text-[14px] italic leading-[22px] text-[#475569]">
            "{personalMessage}"
          </Text>
        </Section>
      )}

      {/* Statement Summary Block */}
      <Section className="mb-[24px] rounded-[8px] border border-solid border-[#E2E8F0] p-[20px]">
        <Heading className="m-0 mb-[12px] text-[16px] font-bold text-[#020304]">
          Statement Summary
        </Heading>
        <table className="w-full text-[14px]">
          <tbody>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Statement Date:</td>
              <td className="py-2 text-[#020304] text-right">{statementDate}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Period:</td>
              <td className="py-2 text-[#020304] text-right">{period}</td>
            </tr>
            <tr>
              <td className="py-2 font-bold text-[#020304]">Total Balance Due:</td>
              <td className="py-2 text-[16px] font-bold text-brand text-right">{totalAmountDue}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Bank/EFT details block */}
      {bankDetails && bankDetails.accountNumber && (
        <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-brand bg-[#F8FAFC] p-[20px]">
          <Heading className="m-0 mb-[10px] text-[15px] font-bold text-[#020304]">
            Payment Instructions (EFT/Bank Transfer)
          </Heading>
          <Text className="m-0 mb-[12px] text-[13px] leading-[20px] text-[#475569]">
            Please make payment directly to our bank account. Use your account name as your deposit reference.
          </Text>
          <table className="w-full text-[13px] text-[#020304]">
            <tbody>
              <tr>
                <td className="py-1 font-semibold text-[#64748B]">Bank Name:</td>
                <td className="py-1 text-right">{bankDetails.bankName}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold text-[#64748B]">Account Name:</td>
                <td className="py-1 text-right">{bankDetails.accountName}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold text-[#64748B]">Account Number:</td>
                <td className="py-1 text-right font-mono">{bankDetails.accountNumber}</td>
              </tr>
              {bankDetails.branchCode && (
                <tr>
                  <td className="py-1 font-semibold text-[#64748B]">Branch Code:</td>
                  <td className="py-1 text-right">{bankDetails.branchCode}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>
      )}

      {/* Footer Sign-off */}
      <Section className="border-none border-t border-solid border-[#E2E8F0] pt-[20px]">
        <Text className="m-0 text-[14px] text-[#475569]">
          If you have any questions about this statement, feel free to reply directly to this email.
        </Text>
        <Text className="m-0 mt-[12px] text-[14px] text-[#020304]">
          Kind regards,<br />
          <strong>{companyName}</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

StatementDeliveryEmail.PreviewProps = {
  clientName: "Acme Corporation",
  statementDate: "2026-07-17",
  period: "Rolling 3 Months",
  totalAmountDue: "R 12,500.00",
  personalMessage: "Hi there, thank you for your business. Please find attached your account statement.",
  portalUrl: "https://portal.playhousemedia.co.za",
  bankDetails: {
    bankName: "First National Bank",
    accountName: "Playhouse Media Group",
    accountNumber: "62891234567",
    branchCode: "250655",
  },
  companyName: "Playhouse Media Group",
  primaryColor: "#1d4ed8",
  websiteUrl: DEFAULT_WEBSITE_URL,
};

export default StatementDeliveryEmail;
