import * as React from 'react';
import { Button, Heading, Section, Text, Hr } from '@react-email/components';
import type { BrandingProps } from '../types';
import { DEFAULT_WEBSITE_URL } from '../domains';
import { EmailLayout } from './EmailLayout';

export interface BillingDigestDispatchItem {
  divisionName: string;
  clientName: string;
  recipientEmail: string;
  dispatchType: string;
  amount: string;
  status: 'delivered' | 'sent' | 'failed' | 'success';
  resendEmailId?: string | null;
  errorMessage?: string | null;
  details?: string;
}

export interface BillingDigestSkippedItem {
  divisionName: string;
  clientName: string;
  recipientEmail?: string;
  reason: string;
}

export interface BillingDigestUpcomingItem {
  date: string;
  description: string;
}

export interface BillingDigestEmailProps extends BrandingProps {
  runDate: string;
  runTime?: string;
  totalStatementsSent: number;
  totalInvoicesIssued: number;
  totalBalanceCommunicated: string;
  totalSkipped: number;
  totalErrors: number;
  dispatches: BillingDigestDispatchItem[];
  skippedClients: BillingDigestSkippedItem[];
  upcomingEvents: BillingDigestUpcomingItem[];
  dashboardUrl?: string;
}

export default function BillingDigestEmail({
  runDate,
  runTime = '17:00 SAST',
  totalStatementsSent,
  totalInvoicesIssued,
  totalBalanceCommunicated,
  totalSkipped,
  totalErrors,
  dispatches = [],
  skippedClients = [],
  upcomingEvents = [],
  dashboardUrl = 'https://admin.playhousemedia.co.za/finance/recurring',
  companyName = 'Playhouse Media Group',
  primaryColor = '#1d4ed8',
  websiteUrl = DEFAULT_WEBSITE_URL,
  logoUrl,
}: BillingDigestEmailProps) {
  const hasErrors = totalErrors > 0;

  return (
    <EmailLayout
      previewText={`[Billing Digest] ${runDate} — Daily Maintenance & Activity Summary (${dispatches.length} Dispatched, ${totalErrors} Errors)`}
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={false}
    >
      {/* Title & Timing */}
      <Heading className="m-0 mb-[6px] text-[20px] font-bold text-[#020304]">
        📊 Daily Billing & Automation Digest
      </Heading>
      <Text className="m-0 mb-[20px] text-[13px] text-[#64748B]">
        Run Date: <strong>{runDate}</strong> • {runTime} • All Divisions (PMG, TES, AWS)
      </Text>

      {/* KPI Cards Section */}
      <Section className="mb-[24px]">
        <table className="w-full text-center border-collapse">
          <tbody>
            <tr>
              <td
                className="p-[12px] bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px]"
                style={{ width: '20%' }}
              >
                <Text className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Statements
                </Text>
                <Text className="m-0 mt-[4px] text-[20px] font-bold text-[#020304]">
                  {totalStatementsSent}
                </Text>
              </td>
              <td style={{ width: '8px' }} />
              <td
                className="p-[12px] bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px]"
                style={{ width: '20%' }}
              >
                <Text className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Invoices
                </Text>
                <Text className="m-0 mt-[4px] text-[20px] font-bold text-[#020304]">
                  {totalInvoicesIssued}
                </Text>
              </td>
              <td style={{ width: '8px' }} />
              <td
                className="p-[12px] bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px]"
                style={{ width: '26%' }}
              >
                <Text className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Total Balance
                </Text>
                <Text className="m-0 mt-[4px] text-[16px] font-bold text-[#020304]">
                  {totalBalanceCommunicated}
                </Text>
              </td>
              <td style={{ width: '8px' }} />
              <td
                className="p-[12px] bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px]"
                style={{ width: '16%' }}
              >
                <Text className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Skipped
                </Text>
                <Text className="m-0 mt-[4px] text-[20px] font-bold text-[#64748B]">
                  {totalSkipped}
                </Text>
              </td>
              <td style={{ width: '8px' }} />
              <td
                className={`p-[12px] border border-solid rounded-[6px] ${
                  hasErrors ? 'bg-[#FEF2F2] border-[#FCA5A5]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                }`}
                style={{ width: '18%' }}
              >
                <Text
                  className={`m-0 text-[11px] font-semibold uppercase tracking-wider ${
                    hasErrors ? 'text-[#DC2626]' : 'text-[#64748B]'
                  }`}
                >
                  Errors
                </Text>
                <Text
                  className={`m-0 mt-[4px] text-[20px] font-bold ${
                    hasErrors ? 'text-[#DC2626]' : 'text-[#020304]'
                  }`}
                >
                  {totalErrors}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Dispatches Table */}
      <Section className="mb-[24px]">
        <Heading className="m-0 mb-[10px] text-[15px] font-bold text-[#020304]">
          🚀 Dispatched Activity (Last 24 Hours)
        </Heading>
        {dispatches.length === 0 ? (
          <Section className="p-[16px] bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px]">
            <Text className="m-0 text-[13px] text-[#64748B]">
              No automated or manual billing emails were dispatched today. System is idle and
              healthy.
            </Text>
          </Section>
        ) : (
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-solid border-[#CBD5E1] text-[#64748B]">
                <th className="py-[8px] font-semibold">Division</th>
                <th className="py-[8px] font-semibold">Client</th>
                <th className="py-[8px] font-semibold">Type</th>
                <th className="py-[8px] font-semibold text-right">Amount</th>
                <th className="py-[8px] font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.map((d, idx) => (
                <tr
                  key={idx}
                  className="border-b border-solid border-[#F1F5F9]"
                  style={{ verticalAlign: 'top' }}
                >
                  <td className="py-[8px] font-medium text-[#334155]">{d.divisionName}</td>
                  <td className="py-[8px]">
                    <div className="font-semibold text-[#020304]">{d.clientName}</div>
                    <div className="text-[11px] text-[#64748B]">{d.recipientEmail}</div>
                    {d.details && (
                      <div className="text-[11px] text-[#475569] italic mt-[2px]">{d.details}</div>
                    )}
                  </td>
                  <td className="py-[8px] text-[#334155]">{d.dispatchType}</td>
                  <td className="py-[8px] text-right font-semibold text-[#020304]">{d.amount}</td>
                  <td className="py-[8px] text-right">
                    <span
                      className={`inline-block px-[6px] py-[2px] rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${
                        d.status === 'delivered' || d.status === 'success'
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : d.status === 'failed'
                            ? 'bg-[#FEE2E2] text-[#991B1B]'
                            : 'bg-[#E0F2FE] text-[#075985]'
                      }`}
                    >
                      {d.status}
                    </span>
                    {d.errorMessage && (
                      <div className="text-[10px] text-[#DC2626] mt-[2px]">{d.errorMessage}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Skipped / Inactive Clients */}
      {skippedClients.length > 0 && (
        <Section className="mb-[24px]">
          <Heading className="m-0 mb-[8px] text-[14px] font-bold text-[#020304]">
            ⏸️ Evaluated & Skipped Clients ({skippedClients.length})
          </Heading>
          <div className="bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px] p-[12px]">
            <table className="w-full text-left text-[12px]">
              <tbody>
                {skippedClients.map((c, idx) => (
                  <tr key={idx} className="border-b border-solid border-[#F1F5F9] last:border-0">
                    <td className="py-[4px] font-medium text-[#334155]" style={{ width: '40%' }}>
                      {c.clientName}
                      {c.recipientEmail && (
                        <span className="text-[11px] text-[#64748B] block">{c.recipientEmail}</span>
                      )}
                    </td>
                    <td className="py-[4px] text-[12px] text-[#64748B]">
                      <span className="text-[#475569]">{c.reason}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Upcoming Milestones */}
      {upcomingEvents.length > 0 && (
        <Section className="mb-[28px]">
          <Heading className="m-0 mb-[8px] text-[14px] font-bold text-[#020304]">
            📅 Upcoming Billing Milestones
          </Heading>
          <div className="bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px] p-[12px]">
            <table className="w-full text-left text-[12px]">
              <tbody>
                {upcomingEvents.map((e, idx) => (
                  <tr key={idx} className="border-b border-solid border-[#F1F5F9] last:border-0">
                    <td className="py-[4px] font-semibold text-[#020304]" style={{ width: '30%' }}>
                      {e.date}
                    </td>
                    <td className="py-[4px] text-[#334155]">{e.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Hr className="border-[#E2E8F0] my-[20px]" />

      {/* Action Button */}
      <Section className="text-center mb-[16px]">
        <Button
          href={dashboardUrl}
          className="box-border rounded-[6px] px-[22px] py-[10px] text-[13px] font-semibold text-white no-underline inline-block"
          style={{ backgroundColor: primaryColor }}
        >
          Open Admin Billing Dashboard
        </Button>
      </Section>
    </EmailLayout>
  );
}
