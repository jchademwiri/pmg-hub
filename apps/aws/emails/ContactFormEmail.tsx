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
  Hr,
} from "@react-email/components";

const ContactFormEmail = (props: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) => {
  const { name, email, subject, message } = props;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New contact lead form submission from {name}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[8px] bg-white p-[32px] shadow-lg">
            {/* Header */}
            <Section>
              <Heading className="mb-[24px] text-center text-[24px] font-bold text-gray-900">
                📧 New Contact Form Submission
              </Heading>
              <Hr className="my-[20px] border-gray-200" />
            </Section>

            {/* Contact Information */}
            <Section className="mb-[32px]">
              <div className="grid gap-[16px]">
                <div className="rounded-[6px] border-l-4 border-blue-500 bg-gray-50 p-[16px]">
                  <Text className="m-0 mb-[4px] text-[14px] font-semibold text-gray-600">
                    Full Name
                  </Text>
                  <Text className="m-0 text-[16px] text-gray-900">{name}</Text>
                </div>

                <div className="rounded-[6px] border-l-4 border-green-500 bg-gray-50 p-[16px]">
                  <Text className="m-0 mb-[4px] text-[14px] font-semibold text-gray-600">
                    Email Address
                  </Text>
                  <Text className="m-0 text-[16px] text-blue-600">{email}</Text>
                </div>

                <div className="rounded-[6px] border-l-4 border-purple-500 bg-gray-50 p-[16px]">
                  <Text className="m-0 mb-[4px] text-[14px] font-semibold text-gray-600">
                    Subject
                  </Text>
                  <Text className="m-0 text-[16px] text-gray-900">
                    {subject}
                  </Text>
                </div>
              </div>
            </Section>

            {/* Message Section */}
            <Section className="mb-[32px]">
              <div className="rounded-[8px] border border-solid border-blue-200 bg-blue-50 p-[20px]">
                <Text className="m-0 mb-[12px] text-[16px] font-semibold text-gray-800">
                  💬 Message
                </Text>
                <div className="rounded-[6px] border border-solid border-gray-200 bg-white p-[16px]">
                  <Text className="m-0 text-[15px] leading-[1.6] whitespace-pre-wrap text-gray-700">
                    {message}
                  </Text>
                </div>
              </div>
            </Section>

            <Hr className="my-[24px] border-gray-200" />

            {/* Footer */}
            <Section>
              <Text className="m-0 text-center text-[12px] text-gray-500">
                This message was sent via your website contact form.
              </Text>
              <Text className="m-0 mt-[8px] text-center text-[12px] text-gray-500">
                © {new Date().getFullYear()} Apex Web Solutions. All rights
                reserved.
              </Text>
              <Text className="m-0 mt-[4px] text-center text-[12px] text-gray-500">
                Pretoria, Centurion, South Africa
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

ContactFormEmail.PreviewProps = {
  name: "John Smith",
  email: "john.smith@example.com",
  subject: "Website Inquiry - New Project",
  message:
    "Hello,\n\nI'm interested in your web development services. Could we schedule a call to discuss my project requirements?\n\nBest regards,\nJohn",
};

export default ContactFormEmail;
