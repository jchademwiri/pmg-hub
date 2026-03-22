// ─── WhatsApp number ─────────────────────────────────────────────────────────
export const PMG_WHATSAPP = '27740491433'

// ─── Types ───────────────────────────────────────────────────────────────────
export type DivisionKey =
  | 'pmg'
  | 'tes'
  | 'apex'
  | 'launchpad'
  | 'creative'
  | 'studyedge'
  | 'jacobc'

// ─── Core URL builder ────────────────────────────────────────────────────────
/**
 * Builds a wa.me URL with a pre-filled message.
 * Number format: country code + number, no spaces, no + sign.
 * e.g. 27740491433 for +27 74 049 1433
 */
export function buildWhatsAppUrl(
  message: string,
  number = PMG_WHATSAPP
): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

// ─── Default messages per division ───────────────────────────────────────────
export const WA_MESSAGES: Record<DivisionKey, string> = {
  pmg:
    'Hi, I found Playhouse Media Group online and would like to know more about your services.',
  tes:
    "Hi, I'm interested in your tender compliance services. I found you on Tender Edge Solutions.",
  apex:
    "Hi, I'm looking for a website for my business. I found you on Apex Web Solutions.",
  launchpad:
    "Hi, I'd like to register my company. I found you on LaunchPad SA.",
  creative:
    'Hi, I need help with my brand and design. I found you on Playhouse Creative Studio.',
  studyedge:
    'Hi, I need academic support. I found you on StudyEdge SA.',
  jacobc:
    'Hi Jacob, I found your profile and would like to discuss a project.',
}

// ─── Pre-built URLs ───────────────────────────────────────────────────────────
export const WA_URLS = Object.fromEntries(
  Object.entries(WA_MESSAGES).map(([key, msg]) => [
    key,
    buildWhatsAppUrl(msg),
  ])
) as Record<DivisionKey, string>

// ─── Service-specific message builder ────────────────────────────────────────
/**
 * Builds a message when a visitor clicks a specific service card.
 * @example
 * buildServiceMessage('Tender Edge Solutions', 'CSD Registration')
 * // → "Hi, I found Tender Edge Solutions online and I'm interested in your CSD Registration service. Can you help me?"
 */
export function buildServiceMessage(siteName: string, service: string): string {
  return `Hi, I found ${siteName} online and I'm interested in your ${service} service. Can you help me?`
}

/**
 * Builds a complete wa.me URL for a specific service.
 * Shorthand for buildWhatsAppUrl(buildServiceMessage(siteName, service))
 */
export function buildServiceUrl(siteName: string, service: string): string {
  return buildWhatsAppUrl(buildServiceMessage(siteName, service))
}
