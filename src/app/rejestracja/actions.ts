"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { getClientIp, checkRegisterRateLimit, recordRegisterAttempt } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/email";

export type RegisterState = { error?: string };

export async function registerAction(
  _prevState: RegisterState | undefined,
  formData: FormData
): Promise<RegisterState> {
  const ip = await getClientIp();
  if (!(await checkRegisterRateLimit(ip))) {
    return { error: "Zbyt wiele prób rejestracji z tego miejsca. Spróbuj ponownie później." };
  }
  // Recorded for every attempt reaching this point (not just successful
  // ones) — otherwise a script submitting many duplicate/invalid requests
  // would never count against the limit at all.
  await recordRegisterAttempt(ip);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!name || !email || !password) {
    return { error: "Imię, e-mail i hasło są wymagane." };
  }
  if (!isValidEmail(email)) {
    return { error: "Podaj prawidłowy adres e-mail." };
  }
  if (password.length < 10) {
    return { error: "Hasło musi mieć co najmniej 10 znaków." };
  }
  if (password !== passwordConfirm) {
    return { error: "Hasła nie są identyczne." };
  }

  // Neutral response on purpose: a direct "this email already has an
  // account" message lets anyone enumerate registered addresses. We still
  // can't fully hide the difference (a genuinely new email logs the visitor
  // straight into /panel; an existing one just re-shows this page), but we
  // no longer say outright which case occurred.
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: "Jeśli podany adres może zostać użyty do rejestracji, konto zostanie utworzone." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // Self-registration always creates a READER account. Becoming an editor is
  // a separate, free upgrade offered from the reader's own account panel.
  await prisma.user.create({
    data: { name, email, passwordHash, role: "READER" },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/panel" });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Konto utworzone, ale logowanie się nie powiodło. Spróbuj zalogować się ręcznie." };
    }
    throw err;
  }

  return {};
}
