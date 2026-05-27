export function validatePersonalMessage(message?: string): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} {
  const trimmed = message?.trim() ?? "";
  if (!trimmed) return { valid: true, sanitized: undefined };

  if (trimmed.length > 500) {
    return { valid: false, error: "Personal message must be 500 characters or fewer." };
  }

  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return { valid: false, error: "Personal message must be plain text, not HTML." };
  }

  return { valid: true, sanitized: trimmed };
}

export function validateRecipientEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = email.trim();
  if (!trimmed) return { valid: false, error: "Recipient email is required." };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Enter a valid recipient email address." };
  }

  return { valid: true };
}
