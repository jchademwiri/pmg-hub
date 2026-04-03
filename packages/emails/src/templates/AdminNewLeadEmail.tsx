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
} from "@react-email/components";
import * as React from "react";
import type { BrandingProps } from "../types";

export type AdminNewLeadEmailProps = {
  name: string;
  email: string;
  phone: string;
  package_name: string;
  package_price: string;
  package_type: string;
} & BrandingProps;

const AdminNewLeadEmail = (props: AdminNewLeadEmailProps) => {
  const {
    name,
    email,
    phone,
    package_name,
    package_price,
    package_type,
    companyName = "Apex Web Solutions",
    primaryColor = "#1d4ed8",
    websiteUrl = "https://apexwebsolutions.co.za",
    logoUrl = undefined,
  } = props;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>
          New Lead Alert: {package_name} - {name} | {companyName}
        </Preview>
        <Body className="bg-[#F6F8FA] py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[12px] bg-[#FFFFFF] shadow-lg">
            {/* Header */}
            <Section
              className="rounded-t-[12px] py-[32px] text-center text-white"
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
              <Text className="m-0 mt-[8px] text-[16px] text-blue-100">
                {companyName} Lead Management
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="px-[32px] py-[32px]">
              <Text className="mb-[24px] text-[18px] font-medium text-[#020304]">
                Great news! A new potential client has shown interest in our
                services.
              </Text>

              {/* Package Information */}
              <Section className="mb-[24px] rounded-[8px] border border-solid border-gray-200 bg-[#F6F8FA] p-[24px]">
                <Heading
                  className="m-0 mb-[16px] text-[20px] font-bold"
                  style={{ color: primaryColor }}
                >
                  📋 Package Details
                </Heading>
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Plan:</strong> {package_name}
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

              <Hr className="my-[24px] border-gray-300" />

              {/* Contact Information */}
              <Section className="mb-[24px] rounded-[8px] border border-solid border-gray-200 bg-[#F6F8FA] p-[24px]">
                <Heading
                  className="m-0 mb-[16px] text-[20px] font-bold"
                  style={{ color: primaryColor }}
                >
                  👤 Contact Information
                </Heading>
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Name:</strong> {name}
                </Text>
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Email:</strong>{" "}
                  <Link
                    href={`mailto:${email}`}
                    style={{ color: primaryColor }}
                    className="underline"
                  >
                    {email}
                  </Link>
                </Text>
                <Text className="m-0 mb-0 text-[16px] text-[#020304]">
                  <strong>Phone:</strong>{" "}
                  <Link
                    href={`tel:${phone}`}
                    style={{ color: primaryColor }}
                    className="underline"
                  >
                    {phone}
                  </Link>
                </Text>
              </Section>

              {/* Call to Action */}
              <Section className="py-[24px] text-center">
                <Text className="mb-[16px] text-[16px] text-[#020304]">
                  Follow up with this lead promptly to maximize conversion
                  potential.
                </Text>
                <Link
                  href={`mailto:${email}`}
                  className="box-border inline-block rounded-[6px] px-[32px] py-[12px] text-[16px] font-semibold text-white no-underline"
                  style={{ backgroundColor: primaryColor }}
                >
                  Contact Lead Now
                </Link>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="rounded-b-[12px] border-t border-solid border-gray-200 bg-[#F6F8FA] px-[32px] py-[24px]">
              <Text className="m-0 mb-[8px] text-center text-[14px] text-gray-600">
                Streamline your tender management process with our comprehensive
                platform.
              </Text>
              <Text className="m-0 mb-[8px] text-center text-[12px] text-gray-500">
                123 Business Ave, Suite 100
              </Text>
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
  name: "John Smith",
  email: "john.smith@example.com",
  phone: "+27 11 123 4567",
  package_name: "Professional Tender Management",
  package_price: "R2,500/month",
  package_type: "Premium",
};

export default AdminNewLeadEmail;
