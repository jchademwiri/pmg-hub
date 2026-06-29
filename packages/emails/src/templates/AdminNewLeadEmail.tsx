import {
  Heading,
  Section,
  Text,
  Button,
} from "@react-email/components";
import * as React from "react";
import type { BrandingProps } from "../types";
import { EmailLayout } from "./EmailLayout";

export type AdminNewLeadEmailProps = {
  name: string;
  email: string;
  phone?: string;
  companyName_lead?: string;
  package_name: string;
  package_price: string;
  package_type: string;
  message?: string;
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
    message,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = "https://playhousemedia.co.za",
    logoUrl,
  } = props;

  return (
    <EmailLayout
      previewText={`New Lead: ${package_name} - ${name} | ${companyName}`}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={false}
    >
      {/* Heading */}
      <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
        🎯 New Lead Alert
      </Heading>

      <Text className="m-0 mb-[24px] text-[15px] leading-[24px] text-[#334155]">
        A new enquiry has been received. Please follow up promptly to maximize conversion.
      </Text>

      {/* Package Information */}
      <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-brand bg-[#F8FAFC] p-[20px]">
        <Heading className="m-0 mb-[12px] text-[15px] font-bold text-[#020304]">
          📋 Enquiry Details
        </Heading>
        <table className="w-full text-[14px]">
          <tbody>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Service:</td>
              <td className="py-2 text-[#020304] font-semibold text-right">{package_name}</td>
            </tr>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Price:</td>
              <td className="py-2 text-brand font-semibold text-right">{package_price}</td>
            </tr>
            <tr className={message ? "border-b border-solid border-[#F1F5F9]" : ""}>
              <td className="py-2 text-[#64748B]">Type:</td>
              <td className="py-2 text-[#020304] text-right">{package_type}</td>
            </tr>
            {message && (
              <tr>
                <td colSpan={2} className="py-2 text-[#020304] leading-[20px] whitespace-pre-wrap">
                  <strong>Message:</strong><br />
                  <span className="text-[#475569] italic">"{message}"</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* Contact Information */}
      <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-slate-400 bg-[#F8FAFC] p-[20px]">
        <Heading className="m-0 mb-[12px] text-[15px] font-bold text-[#020304]">
          👤 Contact Details
        </Heading>
        <table className="w-full text-[14px]">
          <tbody>
            <tr className="border-b border-solid border-[#F1F5F9]">
              <td className="py-2 text-[#64748B]">Name:</td>
              <td className="py-2 text-[#020304] font-medium text-right">{name}</td>
            </tr>
            {companyName_lead && (
              <tr className="border-b border-solid border-[#F1F5F9]">
                <td className="py-2 text-[#64748B]">Company:</td>
                <td className="py-2 text-[#020304] text-right">{companyName_lead}</td>
              </tr>
            )}
            {phone && (
              <tr className="border-b border-solid border-[#F1F5F9]">
                <td className="py-2 text-[#64748B]">Phone:</td>
                <td className="py-2 text-[#020304] text-right">
                  <a href={`tel:${phone}`} className="text-brand no-underline hover:underline font-mono">{phone}</a>
                </td>
              </tr>
            )}
            <tr>
              <td className="py-2 text-[#64748B]">Email:</td>
              <td className="py-2 text-right">
                <a href={`mailto:${email}`} className="text-brand no-underline hover:underline">{email}</a>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Call to Action */}
      <Section className="py-[16px] text-center">
        <Button
          href={`mailto:${email}`}
          className="box-border inline-block rounded-[6px] px-[24px] py-[12px] text-[14px] font-semibold text-white no-underline"
          style={{ backgroundColor: primaryColor }}
        >
          Reply to Lead
        </Button>
      </Section>
    </EmailLayout>
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
