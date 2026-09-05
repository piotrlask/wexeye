"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { getSafeRedirectPath } from "@/lib/redirect";
import { getClientIp, checkLoginRateLimit, recordFailedLogin } from "@/lib/rateLimit";

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

  // Checked before signIn — and therefore before authorize()'s bcrypt.compare
  // — so a rate-limited request never pays for password verification, and
  // never reaches the point where it could distinguish "wrong password" from
  // "no such account" by timing.
  if (!(await checkLoginRateLimit(ip, emailKey))) {
    return { error: "Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      // Only failed attempts count against the limit — a successful login
      // never reaches this branch (signIn redirects instead of returning).
      await recordFailedLogin(ip, emailKey);
      return { error: "Nieprawidłowy e-mail lub hasło." };
    }
    throw err;
  }
}
