export { getBase64ByteSize, MAX_EMAIL_PDF_BYTES } from './pdf-email-size';
import { getBase64ByteSize, MAX_EMAIL_PDF_BYTES } from './pdf-email-size';

export function validateEmailPdfAttachment(base64: string, label: string) {
  if (getBase64ByteSize(base64) > MAX_EMAIL_PDF_BYTES) {
    return `${label} is too large to email. Try downloading it and sending it manually.`;
  }

  return null;
}
