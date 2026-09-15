import { Resend } from "resend";

// This module holds RESEND_API_KEY and must never run in the browser. It
// isn't imported by any Client Component today, but this fails loudly
// instead of silently if that ever changes (e.g. via an accidental
// re-export), rather than relying on convention alone.
if (typeof window !== "undefined") {
  throw new Error("src/lib/email.ts is server-only and must not be imported into client code.");
}

/**
 * Basic web-form email format check — not an RFC 5322 parser and not a
 * mailbox-existence check. Rejects obviously malformed input (missing "@",
 * missing local/domain part, whitespace, no dot in the domain); accepts
 * everything else, including "+" tags and multi-label domains.
 */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_FORMAT.test(email);
}

let resendClient: Resend | undefined;

/** Lazy singleton — avoids constructing a client (and requiring the API key) at module load/build time. */
function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = { success: true } | { success: false; error: string };

/**
 * Server-only outbound mail. Never logs the API key, the raw error payload,
 * or the recipient address — only enough to see that a send failed.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { success: false, error: "EMAIL_FROM is not configured." };
  }

  try {
    const client = getResendClient();
    const { error } = await client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      console.error("sendEmail: Resend API returned an error", error.name);
      return { success: false, error: "Nie udało się wysłać wiadomości e-mail." };
    }
    return { success: true };
  } catch {
    console.error("sendEmail: request to Resend failed");
    return { success: false, error: "Nie udało się wysłać wiadomości e-mail." };
  }
}
