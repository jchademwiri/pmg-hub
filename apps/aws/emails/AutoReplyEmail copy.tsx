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
} from "@react-email/components";

const AutoReplyEmail = (props: { name: string }) => {
  const { name } = props;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Thank you for contacting Apex Web Solutions - We'll be in touch soon!
      </Preview>
      <Tailwind>
        <Body
          className="px-[20px] py-[40px] font-sans"
          style={{ backgroundColor: "#F6F8FA" }}
        >
          <Container
            className="mx-auto max-w-[600px] rounded-[8px] bg-white p-[32px] shadow-lg"
            style={{
              backgroundColor: "#FFFFFF",
              margin: "0 auto",
              width: "100%",
              maxWidth: "600px",
            }}
          >
            {/* Header */}
            <Section className="mb-[32px]">
              <Heading
                className="m-0 mb-[16px] text-[24px] font-bold"
                style={{ color: "#020304" }}
              >
                Hi {name},
              </Heading>
              <Text
                className="m-0 text-[16px] leading-[1.6]"
                style={{ color: "#020304" }}
              >
                Thank you for reaching out to Apex Web Solutions. We have
                received your message and will get back to you shortly.
              </Text>
            </Section>

            {/* WhatsApp CTA Section */}
            <Section className="mb-[32px]">
              <div
                className="rounded-[8px] border border-solid p-[24px]"
                style={{ backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }}
              >
                <Text
                  className="m-0 mb-[12px] text-[16px] font-bold"
                  style={{ color: "#1E40AF" }}
                >
                  Need a quicker response?
                </Text>
                <Text
                  className="m-0 mb-[20px] text-[15px]"
                  style={{ color: "#1E3A8A" }}
                >
                  Chat with us directly on WhatsApp:
                </Text>
                <Button
                  href="https://wa.me/27740491433"
                  className="box-border inline-block rounded-[6px] px-[24px] py-[12px] text-[16px] font-bold text-white no-underline"
                  style={{ backgroundColor: "#25D366" }}
                >
                  💬 Chat on WhatsApp
                </Button>
              </div>
            </Section>

            {/* What to Expect */}
            <Section className="mb-[32px]">
              <Text
                className="m-0 mb-[16px] text-[16px]"
                style={{ color: "#020304" }}
              >
                <strong>What happens next?</strong>
              </Text>
              <Text
                className="m-0 mb-[8px] text-[15px]"
                style={{ color: "#6B7280" }}
              >
                • We'll review your inquiry within 24 hours
              </Text>
              <Text
                className="m-0 mb-[8px] text-[15px]"
                style={{ color: "#6B7280" }}
              >
                • Our team will prepare a tailored response
              </Text>
              <Text
                className="m-0 mb-[16px] text-[15px]"
                style={{ color: "#6B7280" }}
              >
                • We'll schedule a consultation to discuss your project
              </Text>
            </Section>

            {/* Closing */}
            <Section className="mb-[24px]">
              <Text className="m-0 text-[16px]" style={{ color: "#020304" }}>
                Best regards,
                <br />
                <strong>The Apex Team</strong>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="border-t border-solid border-gray-200 pt-[24px] text-center">
              <Text
                className="m-0 mb-[12px] text-[14px]"
                style={{ color: "#6B7280" }}
              >
                Professional web development solutions for your business. We
                rely on senior-level engineering and strategic architecture to
                deliver digital assets that drive results.
              </Text>
              <Button
                href="https://apexwebsolutions.co.za/"
                className="mb-[16px] box-border inline-block rounded-[6px] px-[20px] py-[10px] text-[14px] font-semibold text-white no-underline"
                style={{ backgroundColor: "#3B82F6" }}
              >
                Visit Our Website
              </Button>
              <Text
                className="m-0 mb-[4px] text-[12px]"
                style={{ color: "#9CA3AF" }}
              >
                © 2025 Apex Web Solutions. All rights reserved.
              </Text>
              <Text className="m-0 text-[12px]" style={{ color: "#9CA3AF" }}>
                South Africa
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

AutoReplyEmail.PreviewProps = {
  name: "Sarah Johnson",
};

export default AutoReplyEmail;
