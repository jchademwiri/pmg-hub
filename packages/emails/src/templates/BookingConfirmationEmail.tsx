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
  Link,
  Hr,
  Tailwind,
} from "@react-email/components";
import * as React from "react";
import type { BrandingProps } from "../types";

export type BookingConfirmationEmailProps = {
  name: string;
  package_name: string;
  package_price: string;
  package_type: string;
} & BrandingProps;

const BookingConfirmationEmail = ({
  name,
  package_name,
  package_price,
  package_type,
  companyName = "Apex Web Solutions",
  primaryColor = "#1d4ed8",
  websiteUrl = "https://apexwebsolutions.co.za",
  logoUrl = undefined,
}: BookingConfirmationEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>
          Booking Confirmed: {package_name} - {companyName}
        </Preview>
        <Body className="bg-[#F6F8FA] py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF]">
            {/* Header */}
            <Section className="px-[32px] py-[32px] text-center">
              {logoUrl && (
                <Img
                  src={logoUrl}
                  alt={companyName}
                  className="mx-auto mb-[16px]"
                />
              )}
              <Heading
                className="m-0 text-[24px] font-bold text-[#020304]"
                style={{ color: primaryColor }}
              >
                Booking Confirmed
              </Heading>
            </Section>

            {/* Main Content */}
            <Section className="px-[32px] pb-[32px]">
              <Text className="m-0 mb-[24px] text-[16px] text-[#020304]">
                Hi {name},
              </Text>

              <Text className="m-0 mb-[24px] text-[16px] leading-[24px] text-[#020304]">
                Thank you for booking the <strong>{package_name}</strong>{" "}
                package with {companyName}. We have received your details and a
                team member will contact you within 24 hours to finalize the
                process.
              </Text>

              {/* Package Details */}
              <Section className="mb-[24px] rounded-[8px] bg-[#F6F8FA] p-[24px]">
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Package:</strong> {package_name}
                </Text>
                <Text className="m-0 text-[16px] text-[#020304]">
                  <strong>Price:</strong> {package_price} ({package_type})
                </Text>
              </Section>

              <Text className="m-0 mb-[24px] text-[16px] leading-[24px] text-[#020304]">
                If you have any questions in the meantime, feel free to reply to
                this email.
              </Text>

              <Hr className="my-[24px] border-gray-300" />

              <Text className="m-0 text-center text-[16px] text-[#020304]">
                Thank you for choosing {companyName}.
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-[#F6F8FA] px-[32px] py-[24px] text-center">
              <Text className="m-0 mb-[8px] text-[14px] font-semibold text-gray-600">
                {companyName}
              </Text>
              <Text className="m-0 mb-[8px] text-[12px] text-gray-500">
                Streamline your tender management process with our comprehensive
                platform.
              </Text>
              <Text className="m-0 mb-[8px] text-[12px] text-gray-500">
                123 Business Ave, Suite 100
              </Text>
              <Text className="m-0 mb-[8px] text-[12px] text-gray-500">
                <Link
                  href={websiteUrl}
                  className="text-[#0066CC] no-underline"
                >
                  {websiteUrl}
                </Link>
              </Text>
              <Text className="m-0 text-[12px] text-gray-500">
                © {new Date().getFullYear()} {companyName}. All rights
                reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

BookingConfirmationEmail.PreviewProps = {
  name: "Sarah Johnson",
  package_name: "Professional Tender Management",
  package_price: "R2,500/month",
  package_type: "Premium",
};

export default BookingConfirmationEmail;
