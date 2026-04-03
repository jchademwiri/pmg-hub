import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import type { BrandingProps } from "../types";

export type AutoReplyEmailProps = { name: string } & BrandingProps;

const AutoReplyEmail = (props: AutoReplyEmailProps) => {
  const {
    name,
    companyName = "Apex Web Solutions",
    primaryColor = "#1d4ed8",
    websiteUrl = "https://apexwebsolutions.co.za",
    logoUrl,
  } = props;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Thank you for contacting {companyName} - We'll be in touch soon!
      </Preview>
      <Tailwind>
        <Body
          className="py-[40px] font-sans"
          style={{ backgroundColor: "#F6F8FA" }}
        >
          <table
            align="center"
            width="100%"
            border={0}
            cellPadding="0"
            cellSpacing="0"
            role="presentation"
            style={{ maxWidth: "600px", margin: "0 auto" }}
          >
            <tr>
              <td>
                <Container
                  className="rounded-[8px] p-[32px] shadow-lg"
                  style={{ backgroundColor: "#FFFFFF" }}
                >
                  {/* Header */}
                  <Section className="mb-[32px]">
                    {logoUrl && (
                      <Img
                        src={logoUrl}
                        alt={companyName}
                        className="mx-auto mb-[16px] block"
                      />
                    )}
                    <Heading
                      className="m-0 mb-[16px] text-[24px] font-bold"
                      style={{ color: primaryColor }}
                    >
                      Hi {name},
                    </Heading>
                    <Text
                      className="m-0 text-[16px] leading-[1.6]"
                      style={{ color: "#020304" }}
                    >
                      Thank you for reaching out to {companyName}. We have
                      received your message and will get back to you shortly.
                    </Text>
                  </Section>

                  {/* WhatsApp CTA Section */}
                  <Section className="mb-[32px]">
                    <div
                      className="rounded-[8px] border border-solid p-[24px]"
                      style={{
                        backgroundColor: "#EFF6FF",
                        borderColor: "#BFDBFE",
                      }}
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
                      <table
                        border={0}
                        cellPadding="0"
                        cellSpacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td>
                            <Button
                              href="https://wa.me/27740491433"
                              className="box-border rounded-[6px] px-[24px] py-[12px] text-[16px] font-bold text-white no-underline"
                              style={{
                                backgroundColor: "#25D366",
                                display: "inline-block",
                              }}
                            >
                              💬 Chat on WhatsApp
                            </Button>
                          </td>
                        </tr>
                      </table>
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
                    <Text
                      className="m-0 text-[16px]"
                      style={{ color: "#020304" }}
                    >
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
                      Professional web development solutions for your business.
                      We rely on senior-level engineering and strategic
                      architecture to deliver digital assets that drive results.
                    </Text>
                    <table
                      align="center"
                      border={0}
                      cellPadding="0"
                      cellSpacing="0"
                      role="presentation"
                    >
                      <tr>
                        <td>
                          <Button
                            href={websiteUrl}
                            className="mb-[16px] box-border rounded-[6px] px-[20px] py-[10px] text-[14px] font-semibold text-white no-underline"
                            style={{
                              backgroundColor: primaryColor,
                              display: "inline-block",
                            }}
                          >
                            Visit Our Website
                          </Button>
                        </td>
                      </tr>
                    </table>
                    <Text
                      className="m-0 mb-[4px] text-[12px]"
                      style={{ color: "#9CA3AF" }}
                    >
                      © {new Date().getFullYear()} {companyName}. All rights
                      reserved.
                    </Text>
                    <Text
                      className="m-0 text-[12px]"
                      style={{ color: "#9CA3AF" }}
                    >
                      South Africa
                    </Text>
                  </Section>
                </Container>
              </td>
            </tr>
          </table>
        </Body>
      </Tailwind>
    </Html>
  );
};

AutoReplyEmail.PreviewProps = {
  name: "Sarah Johnson",
};

export default AutoReplyEmail;
