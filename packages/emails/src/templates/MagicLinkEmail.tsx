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

export type MagicLinkEmailProps = {
  url: string;
  expiresIn?: string;
} & BrandingProps;

const MagicLinkEmail = (props: MagicLinkEmailProps) => {
  const {
    url,
    expiresIn = "24 hours",
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = DEFAULT_WEBSITE_URL,
    logoUrl,
  } = props;

  return (
    <EmailLayout
      previewText="Sign in to PMG Control Center"
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={false}
    >
      {/* Greeting */}
      <Heading className="m-0 mb-[16px] text-[24px] font-bold text-[#020304]">
        Welcome back!
      </Heading>

      <Text className="m-0 mb-[24px] text-[15px] leading-[24px] text-[#334155]">
        Click the button below to sign in to PMG Control Center. This link
        will expire in {expiresIn}.
      </Text>

      {/* CTA Button */}
      <Section className="mb-[24px]">
        <Button
          href={url}
          className="box-border rounded-[6px] px-[24px] py-[12px] text-[15px] font-semibold text-white no-underline"
          style={{ backgroundColor: primaryColor }}
        >
          Sign In to PMG Control Center
        </Button>
      </Section>

      {/* Fallback Link */}
      <Text className="m-0 mb-[12px] text-[13px] text-[#475569]">
        If the button doesn't work, you can also copy and paste this link
        in your browser:
      </Text>
      <Text className="m-0 mb-[24px] break-all rounded-[4px] bg-[#F1F5F9] p-[12px] text-[12px] text-[#064E3B] font-mono">
        {url}
      </Text>

      {/* Security Note */}
      <Section className="mb-[24px] rounded-[6px] border border-solid border-[#FEF3C7] bg-[#FFFAEB] p-[16px]">
        <Text className="m-0 text-[12px] text-[#92400E]">
          <strong>Security note:</strong> If you didn't request this link,
          you can safely ignore this email. This link will only work for
          your email address.
        </Text>
      </Section>
    </EmailLayout>
  );
};

MagicLinkEmail.PreviewProps = {
  url: "https://app.playhousemedia.co.za/api/auth/magic-link/verify?token=McgWvgHPBBEusTZFaRAdgqdGgfAYBZvB&callbackURL=%2Fdashboard",
  expiresIn: "24 hours",
  companyName: "Playhouse Media Group",
  primaryColor: "#1d4ed8",
  websiteUrl: DEFAULT_WEBSITE_URL,
};

export default MagicLinkEmail;
