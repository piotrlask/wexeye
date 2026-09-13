"use server";

import { signIn } from "@/auth";
import { AuthError, CredentialsSignin } from "next-auth";
import { getSafeRedirectPath } from "@/lib/redirect";
import { getClientIp, checkLoginRateLimit } from "@/lib/rateLimit";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = formData.get("email");
  const password = formData.get("password");
  const next = String(formData.get("next") ?? "");
  const redirectTo = getSafeRedirectPath(next, "/panel");

  const emailKey = typeof email === "string" ? email.trim().toLowerCase() : "";
  const ip = await getClientIp();

  // This is a UX shortcut, not the security boundary: it lets an
  // already-over-limit submission skip straight to the friendly message
  // instead of paying for a signIn() round-trip. The actual, unbypassable
  // enforcement — including recording this as a failed attempt — lives in
  // authorize() (src/auth.ts), since that's the one path every credentials
  // sign-in goes through, form or not.
  if (!(await checkLoginRateLimit(ip, emailKey))) {
    return { error: "Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo });
    return {};
  } catch (err) {
    if (err instanceof CredentialsSignin && err.code === "rate_limited") {
      return { error: "Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut." };
    }
    if (err instanceof AuthError) {
      // authorize() itself already recorded this failed attempt — recording
      // it again here would double-count the same attempt against the limit.
      return { error: "Nieprawidłowy e-mail lub hasło." };
    }
    throw err;
  }
}
