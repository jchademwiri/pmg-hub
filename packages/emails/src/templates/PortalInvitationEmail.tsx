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

export type PortalInvitationEmailProps = {
  /** Recipient's display name */
  recipientName: string;
  /** Full portal login/access URL */
  portalUrl: string;
} & BrandingProps;

const PortalInvitationEmail = (props: PortalInvitationEmailProps) => {
  const {
    recipientName,
    portalUrl,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = DEFAULT_WEBSITE_URL,
    logoUrl,
  } = props;

  return (
    <EmailLayout
      previewText={`Welcome to your ${companyName} Client Portal`}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={false}
    >
      {/* Heading */}
      <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
        Welcome to your {companyName} Client Portal
      </Heading>

      {/* Greeting */}
      <Text className="m-0 mb-[16px] text-[15px] leading-[24px] text-[#334155]">
        Hi {recipientName},
      </Text>

      <Text className="m-0 mb-[16px] text-[15px] leading-[24px] text-[#334155]">
        At <strong>{companyName}</strong>, we truly value our partnership and care about your experience. To make working with us as seamless and convenient as possible, we have created a dedicated <strong>Client Portal</strong> just for you.
      </Text>

      <Text className="m-0 mb-[24px] text-[15px] leading-[24px] text-[#334155]">
        Through this portal, you can easily check on your projects, view and download invoices, track quotes, and monitor project progress at any time that suits you.
      </Text>

      {/* CTA Button */}
      <Section className="mb-[16px] text-center">
        <Button
          href={portalUrl}
          className="box-border rounded-[6px] px-[24px] py-[12px] text-[15px] font-semibold text-white no-underline inline-block"
          style={{ backgroundColor: primaryColor }}
        >
          Access Your Portal
        </Button>
      </Section>

      {/* No password reminder */}
      <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-blue-500 bg-[#F8FAFC] p-[16px]">
        <Text className="m-0 text-[13px] leading-[20px] text-[#1e40af]">
          <strong>No Password Required:</strong> To log in, simply enter your email address on the portal page. A secure, one-time login link will be sent straight to your inbox to log you in instantly and securely.
        </Text>
      </Section>

      {/* Fallback link */}
      <Text className="m-0 mb-[8px] text-[13px] text-[#475569]">
        If the button doesn't work, copy and paste this link into your browser:
      </Text>
      <Text className="m-0 mb-[24px] break-all rounded-[4px] bg-[#F1F5F9] p-[12px] font-mono text-[12px] text-[#064E3B]">
        {portalUrl}
      </Text>

      {/* Footer */}
      <Section className="border-t border-solid border-[#E2E8F0] pt-[20px]">
        <Text className="m-0 text-[13px] text-[#475569]">
          If you have any questions or need assistance, feel free to reply directly to this email. We're here to help!
        </Text>
        <Text className="m-0 mt-[12px] text-[13px] text-[#020304]">
          Warm regards,<br />
          <strong>The {companyName} Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

PortalInvitationEmail.PreviewProps = {
  recipientName: "Jane Smith",
  portalUrl: "https://portal.playhousemedia.co.za",
  companyName: "Playhouse Media Group",
  primaryColor: "#1d4ed8",
  websiteUrl: DEFAULT_WEBSITE_URL,
};

export default PortalInvitationEmail;
