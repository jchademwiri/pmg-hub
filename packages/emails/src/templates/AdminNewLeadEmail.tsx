import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
  Link,
  Tailwind,
  pixelBasedPreset,
} from "@react-email/components";
import * as React from "react";
import type { BrandingProps } from "../types";

export type AdminNewLeadEmailProps = {
  name: string;
  email: string;
  phone: string;
  companyName_lead?: string;
  package_name: string;
  package_price: string;
  package_type: string;
} & BrandingProps;

const AdminNewLeadEmail = (props: AdminNewLeadEmailProps) => {
  const {
    name,
    email,
    phone,
    companyName_lead,
    package_name,
    package_price,
    package_type,
    companyName = "Your Company",
    primaryColor = "#1d4ed8",
    websiteUrl = "https://example.com",
    logoUrl = undefined,
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
        <Preview>
          New Lead: {package_name} — {name} | {companyName}
        </Preview>
        <Body className="bg-[#F6F8FA] py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[12px] bg-[#FFFFFF] shadow-lg">
            {/* Header */}
            <Section
              className="rounded-t-[12px] py-[32px] text-center"
              style={{ backgroundColor: primaryColor }}
            >
              {logoUrl && (
                <Img
                  src={logoUrl}
                  alt={companyName}
                  className="mx-auto mb-[16px]"
                />
              )}
              <Heading className="m-0 text-[28px] font-bold text-white">
                🎯 New Lead Alert
              </Heading>
              <Text className="m-0 mt-[8px] text-[16px] text-white opacity-80">
                {companyName} · Lead Notification
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="px-[32px] py-[32px]">
              <Text className="mb-[24px] text-[18px] font-medium text-[#020304]">
                A new enquiry has come in. Follow up promptly to maximise
                conversion.
              </Text>

              {/* Package Information */}
              <Section className="mb-[24px] rounded-[8px] border border-solid border-gray-200 bg-[#F6F8FA] p-[24px]">
                <Heading
                  className="m-0 mb-[16px] text-[20px] font-bold"
                  style={{ color: primaryColor }}
                >
                  📋 Enquiry Details
                </Heading>
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Service:</strong> {package_name}
                </Text>
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Price:</strong>{" "}
                  <span style={{ color: primaryColor, fontWeight: 600 }}>
                    {package_price}
                  </span>
                </Text>
                <Text className="m-0 mb-0 text-[16px] text-[#020304]">
                  <strong>Type:</strong> {package_type}
                </Text>
              </Section>

              <Hr className="my-[24px] border-none border-t border-solid border-gray-200" />

              {/* Contact Information */}
              <Section className="mb-[24px] rounded-[8px] border border-solid border-gray-200 bg-[#F6F8FA] p-[24px]">
                <Heading
                  className="m-0 mb-[16px] text-[20px] font-bold"
                  style={{ color: primaryColor }}
                >
                  👤 Contact Details
                </Heading>
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Name:</strong> {name}
                </Text>
                {companyName_lead && (
                  <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                    <strong>Company:</strong> {companyName_lead}
                  </Text>
                )}
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Phone:</strong>{" "}
                  <Link
                    href={`tel:${phone}`}
                    style={{ color: primaryColor }}
                    className="underline"
                  >
                    {phone}
                  </Link>
                </Text>
                <Text className="m-0 mb-0 text-[16px] text-[#020304]">
                  <strong>Email:</strong>{" "}
                  <Link
                    href={`mailto:${email}`}
                    style={{ color: primaryColor }}
                    className="underline"
                  >
                    {email}
                  </Link>
                </Text>
              </Section>

              {/* Call to Action */}
              <Section className="py-[24px] text-center">
                <Link
                  href={`mailto:${email}`}
                  className="box-border inline-block rounded-[6px] px-[32px] py-[12px] text-[16px] font-semibold text-white no-underline"
                  style={{ backgroundColor: primaryColor }}
                >
                  Reply to Lead
                </Link>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="rounded-b-[12px] border-none border-t border-solid border-gray-200 bg-[#F6F8FA] px-[32px] py-[24px]">
              <Text className="m-0 mb-[8px] text-center text-[12px] text-gray-500">
                <Link
                  href={websiteUrl}
                  style={{ color: primaryColor }}
                  className="no-underline"
                >
                  {websiteUrl.replace(/^https?:\/\//, "")}
                </Link>
              </Text>
              <Text className="m-0 text-center text-[12px] text-gray-500">
                © {new Date().getFullYear()} {companyName}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

AdminNewLeadEmail.PreviewProps = {
  name: "Sipho Dlamini",
  email: "sipho@example.co.za",
  phone: "074 501 7094",
  companyName_lead: "Basadipele Cleaning & Hygiene",
  package_name: "Tender-Ready Starter",
  package_price: "R2,500",
  package_type: "TES Enquiry",
  companyName: "Tender Edge Solutions",
  primaryColor: "#c9a227",
  websiteUrl: "https://www.tenderedgesolutions.co.za",
};

export default AdminNewLeadEmail;
