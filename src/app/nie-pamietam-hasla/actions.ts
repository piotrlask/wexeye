"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isValidEmail, sendEmail } from "@/lib/email";
import { getClientIp, checkPasswordResetRateLimit, recordPasswordResetAttempt } from "@/lib/rateLimit";
import { createPasswordResetToken } from "@/lib/passwordReset";

export type ForgotPasswordState = { message?: string; error?: string };

// Shown for every valid-format, non-rate-limited submission — whether or not
// an account with that address actually exists. This is the actual
// enumeration-protection boundary; nothing else about the response (timing
// aside) may differ between the two cases.
const NEUTRAL_MESSAGE = "Jeśli konto z podanym adresem istnieje, wysłaliśmy na niego instrukcję resetowania hasła.";
const RATE_LIMIT_MESSAGE = "Zbyt wiele prób. Spróbuj ponownie za kilka minut.";

// F-11.4-01: an existing account pays for token creation + a real Resend
// API call; a nonexistent one returns almost instantly — an easy timing
// side-channel for account enumeration. Floors the total time this block
// takes at RESET_RESPONSE_MIN_MS regardless of which branch ran, without
// ever adding delay ON TOP of already-slow real work (Promise.all resolves
// on the SLOWER of the two): a nonexistent email gets padded up to the
// floor, while an existing one (whose real Resend call in production likely
// already exceeds it) is unaffected. 300ms is a conservative approximation
// of a typical transactional-email API round trip — not a "large" delay,
// and the UI already shows a "Wysyłanie..." pending state during it.
const RESET_RESPONSE_MIN_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return { error: "Podaj prawidłowy adres e-mail." };
  }

  const ip = await getClientIp();

  // Rate limit is checked and recorded before the user lookup, and applies
  // identically whether or not the account exists — so a rate-limit hit
  // never implies "this account exists and you're spamming it".
  if (!(await checkPasswordResetRateLimit(ip, email))) {
    return { error: RATE_LIMIT_MESSAGE };
  }
  await recordPasswordResetAttempt(ip, email);

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, deletedAt: true } });

  // See RESET_RESPONSE_MIN_MS above: this whole block's real work only runs
  // for an existing account, so its duration is floored to run alongside a
  // fixed-length timer — the two branches become indistinguishable by
  // response time below that floor, regardless of which one actually did
  // something.
  await Promise.all([
    (async () => {
      // A deleted (ETAP 12.4) account is treated exactly like a nonexistent
      // one: no token, no email — and the same neutral response/timing.
      if (!user || user.deletedAt) return;

      const rawToken = await createPasswordResetToken(user.id);
      const baseUrl = await getBaseUrl();
      // The token lives in the URL FRAGMENT, not the query string: a fragment
      // is never sent to the server by the browser — not on this initial
      // navigation, not in any subsequent request, and never in a Referer
      // header (the fragment is stripped before a Referer is built, per the
      // Fetch/HTTP spec, regardless of Referrer-Policy). That keeps the raw
      // token out of access logs, reverse-proxy logs, and Referer entirely —
      // see ResetPasswordForm.tsx for how the client reads it back out.
      const resetUrl = `${baseUrl}/reset-hasla#token=${rawToken}`;

      const html = `<p>Cześć${user.name ? ` ${user.name}` : ""},</p>
<p>Ktoś (mamy nadzieję, że Ty) poprosił o zresetowanie hasła do konta WexEye powiązanego z tym adresem e-mail.</p>
<p><a href="${resetUrl}">Kliknij tutaj, aby ustawić nowe hasło</a></p>
<p>Link jest ważny przez 1 godzinę. Jeśli to nie Ty poprosiłeś/aś o reset hasła, możesz zignorować tę wiadomość — Twoje obecne hasło pozostanie bez zmian.</p>`;

      const result = await sendEmail({
        to: email,
        subject: "Reset hasła — WexEye",
        html,
      });
      if (!result.success) {
        // Neutral, secret-free diagnostic only — never the raw token/URL, never Resend's own error detail.
        console.error("requestPasswordResetAction: password reset email send failed");
      }
    })(),
    delay(RESET_RESPONSE_MIN_MS),
  ]);

  return { message: NEUTRAL_MESSAGE };
}
