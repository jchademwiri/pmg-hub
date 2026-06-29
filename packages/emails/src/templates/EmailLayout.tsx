import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
  pixelBasedPreset,
  Font,
  Button,
} from "@react-email/components";
import type { BrandingProps } from "../types";
import { DEFAULT_WEBSITE_URL } from "../domains";

export interface EmailLayoutProps extends BrandingProps {
  previewText: string;
  children: React.ReactNode;
  showFooterButton?: boolean;
}

export function EmailLayout({
  previewText,
  companyName = "Playhouse Media Group",
  primaryColor = "#1d4ed8",
  websiteUrl = DEFAULT_WEBSITE_URL,
  logoUrl,
  showFooterButton = true,
  children,
}: EmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: { extend: { colors: { brand: primaryColor } } },
        }}
      >
        <Head>
          <Font
            fontFamily="Inter"
            fallbackFontFamily="Arial"
            fontWeight={400}
            fontStyle="normal"
            webFont={{
              url: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hJPg.woff2",
              format: "woff2",
            }}
          />
        </Head>
        <Preview>{previewText}</Preview>
        <Body className="m-0 bg-[#F6F8FA] py-[40px] font-sans" style={{ margin: "0", padding: "0" }}>
          <Container width="600" className="mx-auto rounded-[8px] bg-[#FFFFFF] p-[32px] shadow-lg" style={{ maxWidth: '600px', width: '100%', margin: '0 auto', borderCollapse: 'separate' }}>
            {/* Header (Logo or Branded Text) */}
            {logoUrl ? (
              <Section className="mb-[24px] text-center">
                <Img
                  src={logoUrl}
                  alt={companyName}
                  className="mx-auto block max-h-[50px] object-contain"
                />
              </Section>
            ) : (
              <Section className="mb-[24px] text-center border-none border-b border-solid border-[#F1F5F9] pb-[16px]">
                <Text className="m-0 text-[18px] font-bold tracking-tight text-brand">
                  {companyName}
                </Text>
              </Section>
            )}

            {/* Main Content */}
            <Section className="mb-[24px]">
              {children}
            </Section>

            {/* Footer */}
            <Section className="mt-[32px] border-none border-t border-solid border-[#E2E8F0] pt-[24px] text-center">
              {showFooterButton && (
                <Button
                  href={websiteUrl}
                  className="box-border rounded-[6px] px-[20px] py-[10px] text-[13px] font-semibold text-white no-underline inline-block"
                  style={{ backgroundColor: primaryColor }}
                >
                  Visit Our Website
                </Button>
              )}
              
              <Text className="m-0 mt-[20px] text-[12px] text-[#64748B] leading-[18px]">
                This email was sent on behalf of <strong>{companyName}</strong>. If you have any questions or require assistance, please reply directly to this message.
              </Text>
              
              <Text className="m-0 mt-[12px] text-[11px] text-[#94A3B8]">
                © {new Date().getFullYear()} {companyName}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
