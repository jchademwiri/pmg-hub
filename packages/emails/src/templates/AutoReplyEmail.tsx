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

export type AutoReplyEmailProps = {
  name: string;
  whatsappNumber?: string;
  teamName?: string;
} & BrandingProps;

const AutoReplyEmail = (props: AutoReplyEmailProps) => {
  const {
    name,
    whatsappNumber,
    teamName,
    companyName = "Our Team",
    primaryColor = "#1d4ed8",
    websiteUrl = "https://example.com",
    logoUrl,
  } = props;

  const displayTeamName = teamName ?? `The ${companyName} Team`;
  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`
    : undefined;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: { extend: { colors: { brand: primaryColor } } },
        }}
      >
        <Head />
        <Preview>
          Thank you for contacting {companyName} - we'll be in touch soon.
        </Preview>
        <Body className="m-0 bg-[#F6F8FA] py-[40px] font-sans" style={{ margin: "0", padding: "0" }}>
          <Container width="600" className="mx-auto rounded-[8px] bg-[#FFFFFF] p-[32px] shadow-lg" style={{ maxWidth: '600px', width: '100%', margin: '0 auto', borderCollapse: 'separate' }}>
            {/* Header */}
            <Section className="mb-[32px]">
              {logoUrl && (
                <Img
                  src={logoUrl}
                  alt={companyName}
                  className="mx-auto mb-[16px] block"
                />
              )}
              <Heading
                className="m-0 mb-[16px] text-[24px] font-bold"
                style={{ color: primaryColor }}
              >
                Hi {name},
              </Heading>
              <Text className="m-0 text-[16px] leading-[26px] text-[#020304]">
                Thank you for reaching out to {companyName}. We've received your
                enquiry and will get back to you within 24 hours.
              </Text>
            </Section>

            {/* WhatsApp CTA - only rendered if a number is provided */}
            {waHref && (
              <Section className="mb-[32px]">
                <Section className="rounded-[8px] border border-solid border-[#BBF7D0] bg-[#F0FDF4] p-[24px]">
                  <Text className="m-0 mb-[8px] text-[16px] font-bold text-[#166534]">
                    Need a faster response?
                  </Text>
                  <Text className="m-0 mb-[20px] text-[15px] text-[#15803D]">
                    WhatsApp us directly - we respond within the hour during
                    business hours.
                  </Text>
                  <Button
                    href={waHref}
                    className="box-border rounded-[6px] bg-[#25D366] px-[24px] py-[12px] text-[16px] font-bold text-white no-underline"
                  >
                    💬 WhatsApp Us Now
                  </Button>
                </Section>
              </Section>
            )}

            {/* What to Expect */}
            <Section className="mb-[32px]">
              <Text className="m-0 mb-[12px] text-[16px] font-semibold text-[#020304]">
                What happens next?
              </Text>
              <Text className="m-0 mb-[8px] text-[15px] text-[#6B7280]">
                • We'll review your enquiry within 24 hours
              </Text>
              <Text className="m-0 mb-[8px] text-[15px] text-[#6B7280]">
                • Our team will prepare a tailored response for your situation
              </Text>
              <Text className="m-0 text-[15px] text-[#6B7280]">
                • We'll reach out to discuss next steps
              </Text>
            </Section>

            {/* Sign-off */}
            <Section className="mb-[24px]">
              <Text className="m-0 text-[16px] text-[#020304]">
                Kind regards,
                <br />
                <strong>{displayTeamName}</strong>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="border-none border-t border-solid border-gray-200 pt-[24px] text-center">
              <Button
                href={websiteUrl}
                className="mb-[16px] box-border rounded-[6px] px-[20px] py-[10px] text-[14px] font-semibold text-white no-underline"
                style={{ backgroundColor: primaryColor }}
              >
                Visit Our Website
              </Button>
              <Text className="m-0 text-[12px] text-[#9CA3AF]">
                © {new Date().getFullYear()} {companyName}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

AutoReplyEmail.PreviewProps = {
  name: "Sipho Dlamini",
  whatsappNumber: "27745017094",
  companyName: "Tender Edge Solutions",
  primaryColor: "#c9a227",
  websiteUrl: "https://www.tenderedgesolutions.co.za",
};

export default AutoReplyEmail;
