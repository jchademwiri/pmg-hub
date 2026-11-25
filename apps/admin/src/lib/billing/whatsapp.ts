/**
 * Pure WhatsApp AR collection helpers for South African phone numbers.
 * Zero external API dependency — uses standard https://wa.me/<digits>?text=... links.
 */

export interface WhatsAppBankDetails {
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  branchCode?: string | null;
}

export interface WhatsAppNudgeParams {
  phone: string | null | undefined;
  clientName: string;
  overdueAmount: number;
  divisionName?: string | null;
  bankDetails?: WhatsAppBankDetails | null;
}

/**
 * Normalizes a South African phone number to E.164 digits without `+` (e.g. `27821234567`).
 * Returns `null` if the input cannot be normalized to a plausible 10–15 digit phone number.
 */
export function normalizeSAPhoneNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strip spaces, hyphens, parentheses, dots, and leading '+'
  let digits = trimmed.replace(/[^\d]/g, '');

  // Handle international 00 prefix (e.g. 002782...)
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Local SA format: 0XXXXXXXXX (10 digits starting with 0) -> 27XXXXXXXXX
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = `27${digits.slice(1)}`;
  }

  // Reject implausible lengths (SA numbers are 11 digits with 27 prefix; allow 10-15 for international)
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

function formatRand(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Builds a pre-filled `https://wa.me/...` payment nudge URL for an overdue client.
 * Returns `null` if the phone number is missing/invalid or `overdueAmount <= 0`.
 */
export function buildWhatsAppNudgeUrl(params: WhatsAppNudgeParams): string | null {
  const normalized = normalizeSAPhoneNumber(params.phone);
  if (!normalized) return null;
  if (!Number.isFinite(params.overdueAmount) || params.overdueAmount <= 0) return null;

  const sender = params.divisionName?.trim() || 'Playhouse Media Group';
  const lines = [
    `Hi ${params.clientName.trim() || 'there'},`,
    '',
    `Friendly reminder from ${sender} that your account currently has an overdue balance of ${formatRand(params.overdueAmount)}.`,
  ];

  const b = params.bankDetails;
  if (b && (b.bankName || b.accountNumber)) {
    lines.push('', 'EFT Banking Details:');
    if (b.bankName) lines.push(`Bank: ${b.bankName}`);
    if (b.accountName) lines.push(`Account Name: ${b.accountName}`);
    if (b.accountNumber) lines.push(`Account No: ${b.accountNumber}`);
    if (b.branchCode) lines.push(`Branch Code: ${b.branchCode}`);
  }

  lines.push('', 'Please send proof of payment once settled. Thank you!');

  return `https://wa.me/${normalized}?text=${encodeURIComponent(lines.join('\n'))}`;
}
