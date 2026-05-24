import { Resend } from "resend";
import type React from "react";

export interface ResendConfig {
  apiKey: string;
  from: string;
  adminEmail: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
  attachments?: {
    filename?: string | false;
    content?: string | Buffer;
    path?: string;
  }[];
}

export interface SendResult {
  data: { id: string } | null;
  error: { message: string; name: string } | null;
}

/**
 * Sends a single email via the Resend API.
 * Instantiates a new Resend client per call using the provided config.
 * Never throws - errors are returned in the `error` field.
 */
export async function sendEmail(
  config: ResendConfig,
  payload: EmailPayload
): Promise<SendResult> {
  const resend = new Resend(config.apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      react: payload.react,
      attachments: payload.attachments,
      replyTo: payload.replyTo,
    });
    if (error) {
      return { data: null, error: { message: error.message, name: error.name } };
    }
    return { data: data ?? null, error: null };
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    return { data: null, error: { message: e.message, name: e.name } };
  }
}

/**
 * Factory that closes over a ResendConfig and returns a bound sendEmail.
 * Use this to avoid repeating config on every call.
 */
export function createEmailClient(
  config: ResendConfig
): (payload: EmailPayload) => Promise<SendResult> {
  return (payload: EmailPayload) => sendEmail(config, payload);
}
