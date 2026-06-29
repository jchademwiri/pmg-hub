import * as React from "react";
import {
  Heading,
  Section,
  Text,
} from "@react-email/components";
import type { BrandingProps } from "../types";
import { DEFAULT_WEBSITE_URL } from "../domains";
import { EmailLayout } from "./EmailLayout";

export type QuoteDeliveryEmailProps = {
  clientName: string;
  documentNumber: string;
  quoteDate: string;
  expiryDate?: string;
  totalAmount: string;
  reference?: string;
  personalMessage?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
  };
} & BrandingProps;

const QuoteDeliveryEmail = (props: QuoteDeliveryEmailProps) => {
  const {
    clientName,
    documentNumber,
    quoteDate,
    expiryDate,
    totalAmount,
    reference,
    personalMessage,
    bankDetails,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = DEFAULT_WEBSITE_URL,
    logoUrl,
  } = props;

  return (
    <EmailLayout
      previewText={`New Quotation Available: ${documentNumber} from ${companyName}`}
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
        Please find attached quotation <strong>{documentNumber}</strong> prepared by <strong>{companyName}</strong>.
      </Text>

      {/* Custom Admin Message */}
      {personalMessage && (
        <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-brand bg-[#F8FAFC] p-[16px]">
          <Text className="m-0 text-[14px] italic leading-[22px] text-[#475569]">
            "{personalMessage}"
          </Text>
        </Section>
      )}

      {/* Quote Summary Block */}
      <Section className="mb-[24px] rounded-[8px] border border-solid border-[#E2E8F0] p-[20px]">
        <Heading className="m-0 mb-[12px] text-[16px] font-bold text-[#020304]">
          Quotation Details
        </Heading>
        <table className="w-full text-[14px]">
          <tbody>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Quote Number:</td>
              <td className="py-2 font-semibold text-[#020304] text-right">{documentNumber}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Date:</td>
              <td className="py-2 text-[#020304] text-right">{quoteDate}</td>
            </tr>
            {expiryDate && (
              <tr className="border-b border-solid border-[#F1F5F9]">
                <td className="py-2 text-[#64748B]">Valid Until:</td>
                <td className="py-2 font-medium text-amber-700 text-right">{expiryDate}</td>
              </tr>
            )}
            {reference && (
              <tr className="border-b border-solid border-[#F1F5F9]">
                <td className="py-2 text-[#64748B]">Reference:</td>
                <td className="py-2 text-[#020304] text-right">{reference}</td>
              </tr>
            )}
            <tr>
              <td className="py-2 font-bold text-[#020304]">Estimated Total:</td>
              <td className="py-2 text-[16px] font-bold text-brand text-right">{totalAmount}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Bank/EFT details block for 50% deposit */}
      {bankDetails && bankDetails.accountNumber && (
        <Section className="mb-[24px] rounded-[8px] border border-solid border-green-200 bg-green-50/50 p-[20px]">
          <Heading className="m-0 mb-[10px] text-[15px] font-bold text-green-900">
            Payment Instructions (50% Deposit Required)
          </Heading>
          <Text className="m-0 mb-[12px] text-[13px] text-green-800">
            To accept this quotation and secure your booking, please pay a <strong>50% deposit</strong> directly to our bank account. Use quotation number <strong>{documentNumber}</strong> as your deposit reference.
          </Text>
          <table className="w-full text-[13px] text-green-950">
            <tbody>
              <tr>
                <td className="py-1 font-semibold">Bank Name:</td>
                <td className="py-1 text-right">{bankDetails.bankName}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Account Name:</td>
                <td className="py-1 text-right">{bankDetails.accountName}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Account Number:</td>
                <td className="py-1 text-right">{bankDetails.accountNumber}</td>
              </tr>
              {bankDetails.branchCode && (
                <tr>
                  <td className="py-1 font-semibold">Branch Code:</td>
                  <td className="py-1 text-right">{bankDetails.branchCode}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>
      )}

      <Text className="m-0 mb-[24px] text-[14px] leading-[22px] text-[#475569]">
        To accept this quotation, please sign the attached copy and return it to us, or reply directly to this email to discuss any adjustments.
      </Text>

      {/* Footer Sign-off */}
      <Section className="border-none border-t border-solid border-[#E2E8F0] pt-[20px]">
        <Text className="m-0 text-[14px] text-[#475569]">
          If you have any questions, feel free to reply directly to this email.
        </Text>
        <Text className="m-0 mt-[12px] text-[14px] text-[#020304]">
          Kind regards,<br />
          <strong>{companyName}</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

QuoteDeliveryEmail.PreviewProps = {
  clientName: "Acme Corporation",
  documentNumber: "QT-2026-001",
  quoteDate: "2026-05-23",
  expiryDate: "2026-06-07",
  totalAmount: "R 9,750.00",
  reference: "RFQ-50122",
  personalMessage: "Here is the customized quote for your review. Let us know if this aligns with your budget requirements.",
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

export default QuoteDeliveryEmail;
