import * as React from "react";
import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components";
import type { BrandingProps } from "../types";
import { EmailLayout } from "./EmailLayout";

export type AutoReplyEmailProps = {
  name: string;
  whatsappNumber?: string;
} & BrandingProps;

const AutoReplyEmail = (props: AutoReplyEmailProps) => {
  const {
    name,
    whatsappNumber,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = "https://playhousemedia.co.za",
    logoUrl,
  } = props;

  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`
    : undefined;

  return (
    <EmailLayout
      previewText={`Thank you for contacting ${companyName} - we'll be in touch soon.`}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={!waHref} // Hide footer button if we have a WhatsApp CTA
    >
      {/* Greeting & Header */}
      <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
        Hi {name},
      </Heading>
      
      <Text className="m-0 mb-[24px] text-[15px] leading-[24px] text-[#334155]">
        Thank you for reaching out to <strong>{companyName}</strong>. We've received your
        enquiry and will get back to you within 24 hours.
      </Text>

      {/* WhatsApp CTA - only rendered if a number is provided */}
      {waHref && (
        <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-[#25D366] bg-[#F8FAFC] p-[20px]">
          <Text className="m-0 mb-[6px] text-[15px] font-bold text-[#020304]">
            Need a faster response?
          </Text>
          <Text className="m-0 mb-[16px] text-[13px] leading-[20px] text-[#475569]">
            WhatsApp us directly - we respond within the hour during business hours.
          </Text>
          <Button
            href={waHref}
            className="box-border rounded-[6px] bg-[#25D366] px-[18px] py-[10px] text-[13px] font-semibold text-white no-underline inline-block"
          >
            💬 WhatsApp Us Now
          </Button>
        </Section>
      )}

      {/* What to Expect */}
      <Section className="mb-[24px]">
        <Heading className="m-0 mb-[12px] text-[15px] font-semibold text-[#020304]">
          What happens next?
        </Heading>
        <Text className="m-0 mb-[8px] text-[14px] text-[#475569]">
          • We'll review your enquiry within 24 hours.
        </Text>
        <Text className="m-0 mb-[8px] text-[14px] text-[#475569]">
          • Our team will prepare a tailored response for your project.
        </Text>
        <Text className="m-0 text-[14px] text-[#475569]">
          • We'll reach out to discuss the next steps.
        </Text>
      </Section>

      {/* Sign-off */}
      <Section className="border-none border-t border-solid border-[#E2E8F0] pt-[20px]">
        <Text className="m-0 text-[14px] text-[#020304]">
          Kind regards,
          <br />
          <strong>{companyName}</strong>
        </Text>
      </Section>
    </EmailLayout>
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
