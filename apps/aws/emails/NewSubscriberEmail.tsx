import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

const NewSubscriberEmail = (props: { email: string }) => {
  const { email } = props;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New newsletter subscription from {email}</Preview>
      <Tailwind>
        <Body
          className="py-[40px] font-sans"
          style={{ backgroundColor: "#F6F8FA" }}
        >
          <Container
            className="mx-auto max-w-[600px] rounded-[8px] p-[32px]"
            style={{ backgroundColor: "#FFFFFF" }}
          >
            <Section className="mb-[24px] text-center">
              <Heading
                className="m-0 mb-[8px] text-[20px] font-bold"
                style={{ color: "#020304" }}
              >
                New Newsletter Subscription
              </Heading>
            </Section>

            <Section className="mb-[24px]">
              <Text
                className="m-0 mb-[8px] text-[14px] font-semibold"
                style={{ color: "#6B7280" }}
              >
                EMAIL ADDRESS
              </Text>
              <Text
                className="m-0 text-[16px] font-bold"
                style={{ color: "#020304" }}
              >
                {email}
              </Text>
            </Section>

            <Section className="border-t border-solid border-gray-200 pt-[24px] text-center">
              <Text className="m-0 text-[12px]" style={{ color: "#9CA3AF" }}>
                © 2025 Apex Web Solutions. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

NewSubscriberEmail.PreviewProps = {
  email: "sarah.johnson@example.com",
};

export default NewSubscriberEmail;
