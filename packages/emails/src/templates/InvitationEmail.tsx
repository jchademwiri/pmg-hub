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

export type InvitationEmailProps = {
  /** Recipient's display name */
  recipientName: string;
  /** The role they are being invited as */
  role: string;
  /** Full invitation accept URL */
  inviteUrl: string;
  /** How long the invitation is valid (default: "7 days") */
  expiresIn?: string;
  /** Name of the person who sent the invite (optional) */
  invitedByName?: string;
} & BrandingProps;

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  viewer: "Viewer",
};

const InvitationEmail = (props: InvitationEmailProps) => {
  const {
    recipientName,
    role,
    inviteUrl,
    expiresIn = "7 days",
    invitedByName,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = DEFAULT_WEBSITE_URL,
    logoUrl,
  } = props;

  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <EmailLayout
      previewText={`You've been invited to join ${companyName} Control Center as ${roleLabel}`}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={false}
    >
      {/* Heading */}
      <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
        You're invited to {companyName}
      </Heading>

      {/* Greeting */}
      <Text className="m-0 mb-[16px] text-[15px] leading-[24px] text-[#334155]">
        Hi {recipientName},
      </Text>

      <Text className="m-0 mb-[24px] text-[15px] leading-[24px] text-[#334155]">
        {invitedByName
          ? `${invitedByName} has invited you`
          : "You have been invited"}{" "}
        to join <strong>{companyName} Control Center</strong> as{" "}
        <strong>{roleLabel}</strong>.
      </Text>

      {/* Role badge */}
      <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-brand bg-[#F8FAFC] p-[20px]">
        <Text className="m-0 text-[13px] text-[#64748B]">
          You will have access as:
        </Text>
        <Text className="m-0 mt-[4px] text-[16px] font-bold text-[#020304]">
          {roleLabel}
        </Text>
      </Section>

      {/* CTA Button */}
      <Section className="mb-[24px]">
        <Button
          href={inviteUrl}
          className="box-border rounded-[6px] px-[24px] py-[12px] text-[15px] font-semibold text-white no-underline inline-block"
          style={{ backgroundColor: primaryColor }}
        >
          Accept Invitation
        </Button>
      </Section>

      {/* Fallback link */}
      <Text className="m-0 mb-[8px] text-[13px] text-[#475569]">
        If the button doesn't work, copy and paste this link into your browser:
      </Text>
      <Text className="m-0 mb-[24px] break-all rounded-[4px] bg-[#F1F5F9] p-[12px] font-mono text-[12px] text-[#064E3B]">
        {inviteUrl}
      </Text>

      {/* Expiry notice */}
      <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-amber-500 bg-[#F8FAFC] p-[16px]">
        <Text className="m-0 text-[12px] leading-[18px] text-[#92400E]">
          <strong>Note:</strong> This invitation expires in{" "}
          <strong>{expiresIn}</strong>. If you did not expect this email,
          you can safely ignore it.
        </Text>
      </Section>

      {/* Footer */}
      <Section className="border-t border-solid border-[#E2E8F0] pt-[20px]">
        <Text className="m-0 text-[13px] text-[#475569]">
          Questions? Reply to this email and we'll help you get set up.
        </Text>
        <Text className="m-0 mt-[12px] text-[13px] text-[#020304]">
          <strong>{companyName}</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

InvitationEmail.PreviewProps = {
  recipientName: "Jane Smith",
  role: "admin",
  inviteUrl: "https://app.playhousemedia.co.za/invite?token=abc123",
  expiresIn: "7 days",
  invitedByName: "John Doe",
  companyName: "Playhouse Media Group",
  primaryColor: "#1d4ed8",
  websiteUrl: DEFAULT_WEBSITE_URL,
};

export default InvitationEmail;
