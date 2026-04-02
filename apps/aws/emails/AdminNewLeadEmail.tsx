import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface AdminNewLeadEmailProps {
  name: string;
  email: string;
  phone: string;
  package_name: string;
  package_price: string;
  package_type: string;
}

const AdminNewLeadEmail = ({
  name,
  email,
  phone,
  package_name,
  package_price,
  package_type,
}: AdminNewLeadEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>
          New Lead Alert: {package_name} - {name} | Apex Web Solutions
        </Preview>
        <Body className="bg-[#F6F8FA] py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[12px] bg-[#FFFFFF] shadow-lg">
            {/* Header */}
            <Section className="rounded-t-[12px] bg-[#0066CC] py-[32px] text-center text-white">
              <Heading className="m-0 text-[28px] font-bold text-white">
                🎯 New Lead Alert
              </Heading>
              <Text className="m-0 mt-[8px] text-[16px] text-blue-100">
                Apex Web Solutions Lead Management
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
                <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#0066CC]">
                  📋 Package Details
                </Heading>
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Plan:</strong> {package_name}
                </Text>
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Price:</strong>{" "}
                  <span className="font-semibold text-[#0066CC]">
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
                <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#0066CC]">
                  👤 Contact Information
                </Heading>
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Name:</strong> {name}
                </Text>
                <Text className="m-0 mb-[8px] text-[16px] text-[#020304]">
                  <strong>Email:</strong>{" "}
                  <Link
                    href={`mailto:${email}`}
                    className="text-[#0066CC] underline hover:text-blue-800"
                  >
                    {email}
                  </Link>
                </Text>
                <Text className="m-0 mb-0 text-[16px] text-[#020304]">
                  <strong>Phone:</strong>{" "}
                  <Link
                    href={`tel:${phone}`}
                    className="text-[#0066CC] underline hover:text-blue-800"
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
                  className="box-border inline-block rounded-[6px] bg-[#0066CC] px-[32px] py-[12px] text-[16px] font-semibold text-white no-underline hover:bg-blue-700"
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
                  href="https://www.apexwebsolutions.co.za/"
                  className="text-[#0066CC] no-underline"
                >
                  www.apexwebsolutions.co.za
                </Link>
              </Text>
              <Text className="m-0 text-center text-[12px] text-gray-500">
                © {new Date().getFullYear()} Apex Web Solutions. All rights
                reserved.
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
