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

export type InvoiceDeliveryEmailProps = {
  clientName: string;
  documentNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: string;
  reference?: string;
  personalMessage?: string;
  portalUrl?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
  };
  hasStatementAttached?: boolean;
} & BrandingProps;

const InvoiceDeliveryEmail = (props: InvoiceDeliveryEmailProps) => {
  const {
    clientName,
    documentNumber,
    invoiceDate,
    dueDate,
    totalAmount,
    reference,
    personalMessage,
    portalUrl,
    bankDetails,
    hasStatementAttached = false,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = DEFAULT_WEBSITE_URL,
    logoUrl,
  } = props;

  return (
    <EmailLayout
      previewText={`New Invoice Issued: ${documentNumber} from ${companyName}`}
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
        Please find attached invoice <strong>{documentNumber}</strong> issued by <strong>{companyName}</strong>.
        {hasStatementAttached && " We have also attached your current account statement for your convenience."}
      </Text>

      {portalUrl && (
        <Section className="mb-[24px] text-center">
          <Button
            href={portalUrl}
            className="box-border rounded-[6px] px-[20px] py-[10px] text-[14px] font-semibold text-white no-underline inline-block"
            style={{ backgroundColor: primaryColor }}
          >
            View Invoice in Portal
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

      {/* Invoice Summary Block */}
      <Section className="mb-[24px] rounded-[8px] border border-solid border-[#E2E8F0] p-[20px]">
        <Heading className="m-0 mb-[12px] text-[16px] font-bold text-[#020304]">
          Invoice Details
        </Heading>
        <table className="w-full text-[14px]">
          <tbody>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Invoice Number:</td>
              <td className="py-2 font-semibold text-[#020304] text-right">{documentNumber}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Issue Date:</td>
              <td className="py-2 text-[#020304] text-right">{invoiceDate}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Due Date:</td>
              <td className="py-2 font-medium text-[#B91C1C] text-right">{dueDate}</td>
            </tr>
            {reference && (
              <tr className="border-b border-solid border-[#F1F5F9]">
                <td className="py-2 text-[#64748B]">Reference:</td>
                <td className="py-2 text-[#020304] text-right">{reference}</td>
              </tr>
            )}
            <tr>
              <td className="py-2 font-bold text-[#020304]">Total Amount Due:</td>
              <td className="py-2 text-[16px] font-bold text-brand text-right">{totalAmount}</td>
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
            Please make payment directly to our bank account. Use invoice number <strong>{documentNumber}</strong> as your deposit reference.
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

InvoiceDeliveryEmail.PreviewProps = {
  clientName: "Acme Corporation",
  documentNumber: "INV-2026-001",
  invoiceDate: "2026-05-23",
  dueDate: "2026-06-23",
  totalAmount: "R 12,500.00",
  reference: "REF-9912",
  personalMessage: "Hi there, thank you for your business. Please find attached our invoice and statement.",
  portalUrl: "https://portal.playhousemedia.co.za/invoices/inv-123",
  bankDetails: {
    bankName: "First National Bank",
    accountName: "Playhouse Media Group",
    accountNumber: "62891234567",
    branchCode: "250655",
  },
  hasStatementAttached: true,
  companyName: "Playhouse Media Group",
  primaryColor: "#1d4ed8",
  websiteUrl: DEFAULT_WEBSITE_URL,
};

export default InvoiceDeliveryEmail;
