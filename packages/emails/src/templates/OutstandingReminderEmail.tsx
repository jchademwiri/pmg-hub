import * as React from "react";
import {
  Heading,
  Section,
  Text,
} from "@react-email/components";
import type { BrandingProps } from "../types";
import { DEFAULT_WEBSITE_URL } from "../domains";
import { EmailLayout } from "./EmailLayout";

export type OutstandingReminderEmailProps = {
  clientName: string;
  documentNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: string;
  outstandingAmount: string;
  reminderType: "pre-due" | "due-today" | "overdue";
  personalMessage?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
  };
} & BrandingProps;

const OutstandingReminderEmail = (props: OutstandingReminderEmailProps) => {
  const {
    clientName,
    documentNumber,
    invoiceDate,
    dueDate,
    totalAmount,
    outstandingAmount,
    reminderType,
    personalMessage,
    bankDetails,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = DEFAULT_WEBSITE_URL,
    logoUrl,
  } = props;

  const headerConfigs = {
    "pre-due": {
      title: "Upcoming Invoice Reminder",
      bannerBg: "bg-[#F8FAFC] border-l-4 border-solid border-slate-400",
      bannerText: "text-[#020304]",
      previewText: `Friendly reminder: Invoice ${documentNumber} is due soon.`,
      intro: (
        <>
          This is a friendly reminder that invoice <strong>{documentNumber}</strong> from <strong>{companyName}</strong> is due in 3 days.
        </>
      ),
    },
    "due-today": {
      title: "Invoice Due Today",
      bannerBg: "bg-[#F8FAFC] border-l-4 border-solid border-brand",
      bannerText: "text-[#020304]",
      previewText: `Notice: Invoice ${documentNumber} is due for payment today.`,
      intro: (
        <>
          Please be advised that invoice <strong>{documentNumber}</strong> from <strong>{companyName}</strong> is due for payment today.
        </>
      ),
    },
    "overdue": {
      title: "Overdue Invoice Notice",
      bannerBg: "bg-[#F8FAFC] border-l-4 border-solid border-red-500",
      bannerText: "text-[#020304]",
      previewText: `Action Required: Invoice ${documentNumber} is past due.`,
      intro: (
        <>
          We noticed that payment for invoice <strong>{documentNumber}</strong> has not yet been received and is now past due. We kindly request that you settle the outstanding amount as soon as possible.
        </>
      ),
    },
  };

  const currentConfig = headerConfigs[reminderType] || headerConfigs["pre-due"];

  return (
    <EmailLayout
      previewText={currentConfig.previewText}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
    >
      {/* Greeting */}
      <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
        Hello {clientName},
      </Heading>

      {/* Personalized Message */}
      {personalMessage && (
        <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-brand bg-[#F8FAFC] p-[16px]">
          <Text className="m-0 text-[14px] italic leading-[22px] text-[#475569]">
            "{personalMessage}"
          </Text>
        </Section>
      )}

      {/* Alert Banner / Title */}
      <Section className={`mb-[24px] rounded-[6px] border border-solid p-[16px] ${currentConfig.bannerBg}`}>
        <Heading className={`m-0 mb-[6px] text-[16px] font-bold ${currentConfig.bannerText}`}>
          {currentConfig.title}
        </Heading>
        <Text className="m-0 text-[14px] leading-[22px] text-[#475569]">
          {currentConfig.intro}
        </Text>
      </Section>

      {/* Invoice Summary Block */}
      <Section className="mb-[24px] rounded-[8px] border border-solid border-[#E2E8F0] p-[20px]">
        <Heading className="m-0 mb-[12px] text-[16px] font-bold text-[#020304]">
          Invoice Summary
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
              <td className="py-2 font-semibold text-[#B91C1C] text-right">{dueDate}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Original Total:</td>
              <td className="py-2 text-[#020304] text-right">{totalAmount}</td>
            </tr>
            <tr>
              <td className="py-2 font-bold text-[#020304]">Outstanding Balance:</td>
              <td className="py-2 text-[16px] font-bold text-brand text-right">{outstandingAmount}</td>
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
          If you have already made payment, please disregard this reminder and we thank you for your payment.
        </Text>
        <Text className="m-0 mt-[12px] text-[14px] text-[#020304]">
          Kind regards,<br />
          <strong>{companyName}</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

OutstandingReminderEmail.PreviewProps = {
  clientName: "Acme Corporation",
  documentNumber: "INV-2026-005",
  invoiceDate: "10 May 2026",
  dueDate: "24 May 2026",
  totalAmount: "R 10,000.00",
  outstandingAmount: "R 5,000.00",
  reminderType: "overdue",
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

export default OutstandingReminderEmail;
