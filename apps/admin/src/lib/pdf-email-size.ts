export const MAX_EMAIL_PDF_BYTES = 8 * 1024 * 1024;

export function getBase64ByteSize(base64: string) {
  const normalized = base64.replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.ceil((normalized.length * 3) / 4) - padding);
}
