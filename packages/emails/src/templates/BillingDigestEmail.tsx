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
  runDate = '18 Oct 2026',
  runTime = '17:00 SAST',
  totalStatementsSent = 0,
  totalInvoicesIssued = 0,
  totalBalanceCommunicated = 'R 0.00',
  totalSkipped = 0,
  totalErrors = 0,
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
  const isIdle = dispatches.length === 0 && !hasErrors;

  return (
    <EmailLayout
      previewText={
        isIdle
          ? `[Billing Digest] ${runDate} — All Systems Healthy (0 Dispatched, 0 Errors)`
          : `[Billing Digest] ${runDate} — ${dispatches.length} Dispatched, ${totalErrors} Errors`
      }
      companyName={companyName}
      primaryColor={primaryColor}
      websiteUrl={websiteUrl}
      logoUrl={logoUrl}
      showFooterButton={false}
    >
      {/* Title & Timing */}
      <Heading className="m-0 mb-[6px] text-[20px] font-bold text-[#020304]">
        📊 Daily Billing Digest
      </Heading>
      <Text className="m-0 mb-[20px] text-[13px] text-[#64748B]">
        {runDate} • {runTime} • All Divisions (PMG, TES, AWS)
      </Text>

      {/* IDLE STATE: Clean & uncluttered */}
      {isIdle ? (
        <Section className="p-[18px] bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[8px] mb-[24px]">
          <Text className="m-0 text-[14px] font-semibold text-[#0F172A] mb-[6px]">
            🟢 All Systems Healthy · Idle Day
          </Text>
          <Text className="m-0 text-[13px] text-[#64748B] leading-relaxed">
            No billing statements or invoices were dispatched today. Automated sweeps and queues are
            healthy with zero errors across all divisions.
          </Text>
        </Section>
      ) : (
        /* ACTIVE STATE: Compact KPI Metric Strip */
        <>
          <Section className="mb-[24px]">
            <table className="w-full text-center border-collapse">
              <tbody>
                <tr>
                  <td
                    className="p-[10px] bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px]"
                    style={{ width: '25%' }}
                  >
                    <Text className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Statements
                    </Text>
                    <Text className="m-0 mt-[4px] text-[18px] font-bold text-[#020304]">
                      {totalStatementsSent}
                    </Text>
                  </td>
                  <td style={{ width: '8px' }} />
                  <td
                    className="p-[10px] bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px]"
                    style={{ width: '25%' }}
                  >
                    <Text className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Invoices
                    </Text>
                    <Text className="m-0 mt-[4px] text-[18px] font-bold text-[#020304]">
                      {totalInvoicesIssued}
                    </Text>
                  </td>
                  <td style={{ width: '8px' }} />
                  <td
                    className="p-[10px] bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px]"
                    style={{ width: '25%' }}
                  >
                    <Text className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Total Value
                    </Text>
                    <Text className="m-0 mt-[4px] text-[15px] font-bold text-[#020304]">
                      {totalBalanceCommunicated}
                    </Text>
                  </td>
                  <td style={{ width: '8px' }} />
                  <td
                    className={`p-[10px] border border-solid rounded-[6px] ${
                      hasErrors ? 'bg-[#FEF2F2] border-[#FCA5A5]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                    }`}
                    style={{ width: '25%' }}
                  >
                    <Text
                      className={`m-0 text-[11px] font-semibold uppercase tracking-wider ${
                        hasErrors ? 'text-[#DC2626]' : 'text-[#64748B]'
                      }`}
                    >
                      Errors
                    </Text>
                    <Text
                      className={`m-0 mt-[4px] text-[18px] font-bold ${
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
          {dispatches.length > 0 && (
            <Section className="mb-[24px]">
              <Heading className="m-0 mb-[10px] text-[14px] font-bold text-[#020304]">
                🚀 Dispatched Activity ({dispatches.length})
              </Heading>
              <table className="w-full text-left text-[12px] border-collapse">
                <thead>
                  <tr className="border-b border-solid border-[#CBD5E1] text-[#64748B]">
                    <th className="py-[6px] font-semibold">Division</th>
                    <th className="py-[6px] font-semibold">Client</th>
                    <th className="py-[6px] font-semibold">Type</th>
                    <th className="py-[6px] font-semibold text-right">Amount</th>
                    <th className="py-[6px] font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map((d, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-solid border-[#F1F5F9]"
                      style={{ verticalAlign: 'top' }}
                    >
                      <td className="py-[6px] font-medium text-[#334155]">{d.divisionName}</td>
                      <td className="py-[6px]">
                        <div className="font-semibold text-[#020304]">{d.clientName}</div>
                        <div className="text-[11px] text-[#64748B]">{d.recipientEmail}</div>
                        {d.details && (
                          <div className="text-[11px] text-[#475569] italic mt-[1px]">
                            {d.details}
                          </div>
                        )}
                      </td>
                      <td className="py-[6px] text-[#334155]">{d.dispatchType}</td>
                      <td className="py-[6px] text-right font-semibold text-[#020304]">
                        {d.amount}
                      </td>
                      <td className="py-[6px] text-right">
                        <span
                          className={`inline-block px-[5px] py-[1px] rounded-[3px] text-[10px] font-bold uppercase tracking-wider ${
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
                          <div className="text-[10px] text-[#DC2626] mt-[1px]">
                            {d.errorMessage}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Skipped Clients (Only rendered if actual automated sweep ran and skipped clients) */}
          {skippedClients.length > 0 && (
            <Section className="mb-[24px]">
              <Heading className="m-0 mb-[8px] text-[13px] font-semibold text-[#64748B]">
                ⏸️ Evaluated & Skipped Accounts ({skippedClients.length})
              </Heading>
              <div className="bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px] p-[10px]">
                <table className="w-full text-left text-[12px]">
                  <tbody>
                    {skippedClients.map((c, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-solid border-[#F1F5F9] last:border-0"
                      >
                        <td
                          className="py-[3px] font-medium text-[#334155]"
                          style={{ width: '45%' }}
                        >
                          {c.clientName}
                        </td>
                        <td className="py-[3px] text-[11px] text-[#64748B]">{c.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}

      {/* Upcoming Milestones (Clean, actionable 14-day preview) */}
      {upcomingEvents.length > 0 && (
        <Section className="mb-[24px]">
          <Heading className="m-0 mb-[8px] text-[13px] font-semibold text-[#475569]">
            📅 Upcoming Schedules (Next 14 Days)
          </Heading>
          <div className="bg-[#F8FAFC] border border-solid border-[#E2E8F0] rounded-[6px] p-[10px]">
            <table className="w-full text-left text-[12px]">
              <tbody>
                {upcomingEvents.map((e, idx) => (
                  <tr key={idx} className="border-b border-solid border-[#F1F5F9] last:border-0">
                    <td className="py-[4px] font-semibold text-[#020304]" style={{ width: '28%' }}>
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

      <Hr className="border-[#E2E8F0] my-[16px]" />

      {/* Action Button */}
      <Section className="text-center mb-[12px]">
        <Button
          href={dashboardUrl}
          className="box-border rounded-[6px] px-[20px] py-[9px] text-[12px] font-semibold text-white no-underline inline-block"
          style={{ backgroundColor: primaryColor }}
        >
          Open Admin Billing Dashboard
        </Button>
      </Section>
    </EmailLayout>
  );
}

BillingDigestEmail.PreviewProps = {
  runDate: '17 Oct 2026',
  runTime: '17:00 SAST',
  totalStatementsSent: 0,
  totalInvoicesIssued: 0,
  totalBalanceCommunicated: 'R 0.00',
  totalSkipped: 0,
  totalErrors: 0,
  dispatches: [],
  skippedClients: [],
  upcomingEvents: [
    {
      date: '26 Oct 2026',
      description: 'Retainer Monthly Statement Sweep (all active retainer accounts)',
    },
    {
      date: '26 Oct 2026',
      description: 'Recurring billing for Triple Image Trading & Construction (R 150,00)',
    },
  ],
  dashboardUrl: 'https://admin.playhousemedia.co.za/finance/recurring',
} as BillingDigestEmailProps;
