import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
  pixelBasedPreset,
} from "@react-email/components";
import type { BrandingProps } from "../types";
import { DEFAULT_WEBSITE_URL } from "../domains";

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
      bannerBg: "bg-slate-50 border-slate-200",
      bannerText: "text-slate-700",
      previewText: `Friendly reminder: Invoice ${documentNumber} is due soon.`,
      intro: `This is a friendly reminder that invoice **${documentNumber}** from **${companyName}** is due in 3 days.`,
    },
    "due-today": {
      title: "Invoice Due Today",
      bannerBg: "bg-blue-50 border-blue-200",
      bannerText: "text-blue-800",
      previewText: `Notice: Invoice ${documentNumber} is due for payment today.`,
      intro: `Please be advised that invoice **${documentNumber}** from **${companyName}** is due for payment today.`,
    },
    "overdue": {
      title: "Overdue Invoice Notice",
      bannerBg: "bg-red-50 border-red-200",
      bannerText: "text-red-800",
      previewText: `Action Required: Invoice ${documentNumber} is past due.`,
      intro: `We noticed that payment for invoice **${documentNumber}** has not yet been received and is now past due. We kindly request that you settle the outstanding amount as soon as possible.`,
    },
  };

  const currentConfig = headerConfigs[reminderType] || headerConfigs["pre-due"];

  return (
    <Html lang="en" dir="ltr">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: { extend: { colors: { brand: primaryColor } } },
        }}
      >
        <Head />
        <Preview>{currentConfig.previewText}</Preview>
        <Body className="bg-[#F6F8FA] py-[40px] font-sans">
          <Container width="600" className="mx-auto rounded-[8px] bg-[#FFFFFF] p-[32px] shadow-lg" style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
            {/* Logo */}
            {logoUrl && (
              <Section className="mb-[24px]">
                <Img
                  src={logoUrl}
                  alt={companyName}
                  className="mx-auto block max-h-[50px] object-contain"
                />
              </Section>
            )}

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
              <Section className="mb-[24px] rounded-[8px] border border-solid border-green-200 bg-green-50/50 p-[20px]">
                <Heading className="m-0 mb-[10px] text-[15px] font-bold text-green-900">
                  Payment Instructions (EFT/Bank Transfer)
                </Heading>
                <Text className="m-0 mb-[12px] text-[13px] text-green-800">
                  Please make payment directly to our bank account. Use invoice number **{documentNumber}** as your deposit reference.
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

            {/* Footer Sign-off */}
            <Section className="mb-[24px] border-none border-t border-solid border-[#E2E8F0] pt-[20px]">
              <Text className="m-0 text-[14px] text-[#475569]">
                If you have already made payment, please disregard this reminder and we thank you for your payment.
              </Text>
              <Text className="m-0 mt-[12px] text-[14px] text-[#020304]">
                Kind regards,<br />
                <strong>The {companyName} Team</strong>
              </Text>
            </Section>

            {/* Brand URL Button */}
            <Section className="text-center">
              <Button
                href={websiteUrl}
                className="box-border rounded-[6px] px-[18px] py-[10px] text-[13px] font-semibold text-white no-underline"
                style={{ backgroundColor: primaryColor }}
              >
                Visit Our Website
              </Button>
              <Text className="m-0 mt-[16px] text-[11px] text-[#94A3B8]">
                © {new Date().getFullYear()} {companyName}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
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
