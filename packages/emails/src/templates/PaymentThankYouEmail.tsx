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

export type PaymentThankYouEmailProps = {
  clientName: string;
  amountPaid: string;
  paymentDate: string;
  paymentDescription?: string;
  allocations: {
    documentNumber: string;
    amount: string;
  }[];
} & BrandingProps;

const PaymentThankYouEmail = (props: PaymentThankYouEmailProps) => {
  const {
    clientName,
    amountPaid,
    paymentDate,
    paymentDescription,
    allocations = [],
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = DEFAULT_WEBSITE_URL,
    logoUrl,
  } = props;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: { extend: { colors: { brand: primaryColor } } },
        }}
      >
        <Head />
        <Preview>Payment Receipt Confirmation: Thank you for your payment to {companyName}</Preview>
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

            {/* Greeting & Header */}
            <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
              Hello {clientName},
            </Heading>

            <Text className="m-0 mb-[24px] text-[15px] leading-[24px] text-[#334155]">
              Thank you for your business! We have successfully recorded your payment of <strong className="text-brand">{amountPaid}</strong> on <strong>{paymentDate}</strong>. Please find the details of your payment receipt below.
            </Text>

            {/* Payment Description (if available) */}
            {paymentDescription && (
              <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-brand bg-[#F8FAFC] p-[16px]">
                <Text className="m-0 text-[14px] italic leading-[22px] text-[#475569]">
                  "{paymentDescription}"
                </Text>
              </Section>
            )}

            {/* Receipt Summary Table */}
            <Section className="mb-[24px] rounded-[8px] border border-solid border-[#E2E8F0] p-[20px]">
              <Heading className="m-0 mb-[12px] text-[16px] font-bold text-[#020304]">
                Payment Receipt Details
              </Heading>
              <table className="w-full text-[14px] mb-[12px]">
                <tbody>
                  <tr className="border-b border-solid border-[#F1F5F9]">
                    <td className="py-2 text-[#64748B]">Date Received:</td>
                    <td className="py-2 text-[#020304] text-right font-medium">{paymentDate}</td>
                  </tr>
                  <tr className="border-b border-solid border-[#F1F5F9]">
                    <td className="py-2 text-[#64748B]">Total Amount Paid:</td>
                    <td className="py-2 text-[16px] font-bold text-brand text-right">{amountPaid}</td>
                  </tr>
                </tbody>
              </table>

              {/* Allocations Breakdown */}
              {allocations.length > 0 && (
                <Section className="mt-[16px]">
                  <Heading className="m-0 mb-[8px] text-[13px] font-bold text-[#64748B] uppercase tracking-wide">
                    Allocated Invoices
                  </Heading>
                  <table className="w-full text-[13px]">
                    <tbody>
                      {allocations.map((alloc, idx) => (
                        <tr key={idx} className="border-t border-solid border-[#F1F5F9]">
                          <td className="py-2 text-[#475569] font-medium">Invoice {alloc.documentNumber}</td>
                          <td className="py-2 text-[#020304] font-semibold text-right">{alloc.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}
            </Section>

            {/* Footer Sign-off */}
            <Section className="mb-[24px] border-none border-t border-solid border-[#E2E8F0] pt-[20px]">
              <Text className="m-0 text-[14px] text-[#475569]">
                If you have any questions regarding this receipt, please do not hesitate to contact us.
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

PaymentThankYouEmail.PreviewProps = {
  clientName: "Acme Corporation",
  amountPaid: "R 12,500.00",
  paymentDate: "24 May 2026",
  paymentDescription: "Monthly retainer payment for SLA services",
  allocations: [
    { documentNumber: "INV-2026-001", amount: "R 10,000.00" },
    { documentNumber: "INV-2026-002", amount: "R 2,500.00" },
  ],
  companyName: "Playhouse Media Group",
  primaryColor: "#1d4ed8",
  websiteUrl: DEFAULT_WEBSITE_URL,
};

export default PaymentThankYouEmail;
