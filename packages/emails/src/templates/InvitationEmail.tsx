import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  pixelBasedPreset,
} from "@react-email/components";
import type { BrandingProps } from "../types";
import { DEFAULT_WEBSITE_URL } from "../domains";

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
  } = props;

  const roleLabel = ROLE_LABELS[role] ?? role;

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
          You've been invited to join {companyName} Control Center as {roleLabel}
        </Preview>
        <Body className="bg-[#F6F8FA] py-[40px] font-sans">
          <Container
            width="600"
            className="mx-auto rounded-[8px] bg-[#FFFFFF] p-[32px] shadow-lg"
            style={{ maxWidth: "600px", width: "100%", margin: "0 auto" }}
          >
            {/* Header accent bar */}
            <Section
              className="mb-[28px] rounded-[6px] p-[20px]"
              style={{ backgroundColor: primaryColor }}
            >
              <Heading className="m-0 text-[20px] font-bold text-white">
                You're invited to {companyName}
              </Heading>
            </Section>

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
            <Section className="mb-[24px] rounded-[8px] border border-solid border-[#E2E8F0] bg-[#F8FAFC] p-[16px]">
              <Text className="m-0 text-[13px] text-[#64748B]">
                You will have access as:
              </Text>
              <Text
                className="m-0 mt-[4px] text-[16px] font-bold"
                style={{ color: primaryColor }}
              >
                {roleLabel}
              </Text>
            </Section>

            {/* CTA Button */}
            <Section className="mb-[24px]">
              <Button
                href={inviteUrl}
                className="box-border rounded-[6px] px-[24px] py-[12px] text-[15px] font-semibold text-white no-underline"
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
            <Section className="mb-[24px] rounded-[6px] border border-solid border-[#FEF3C7] bg-[#FFFAEB] p-[16px]">
              <Text className="m-0 text-[12px] text-[#92400E]">
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
                The {companyName} Team
              </Text>
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

InvitationEmail.PreviewProps = {
  recipientName: "Jane Smith",
  role: "admin",
  inviteUrl: "https://app.playhousemedia.co.za/invite?token=abc123",
  expiresIn: "7 days",
  invitedByName: "John Doe",
  companyName: "Playhouse Media Group",
  primaryColor: "#1d4ed8",
  websiteUrl: DEFAULT_WEBSITE_URL,
} satisfies InvitationEmailProps;

export default InvitationEmail;
