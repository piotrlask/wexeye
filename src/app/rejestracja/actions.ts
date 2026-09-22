"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { getClientIp, checkRegisterRateLimit, recordRegisterAttempt } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/email";
import { fitsVarchar, VARCHAR_191_MAX } from "@/lib/validation";

// Same neutral copy used below for "an account already exists" — extracted
// so the P2002 race-condition branch (two concurrent registrations for the
// same email) shows the exact same message as the ordinary pre-check, never
// revealing which of the two actually happened.
const ACCOUNT_MAY_BE_CREATED_MESSAGE =
  "Jeśli podany adres może zostać użyty do rejestracji, konto zostanie utworzone.";

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
  if (!fitsVarchar(name)) {
    return { error: `Imię i nazwisko jest za długie (maksymalnie ${VARCHAR_191_MAX} znaków).` };
  }
  if (!isValidEmail(email)) {
    return { error: "Podaj prawidłowy adres e-mail." };
  }
  if (!fitsVarchar(email)) {
    return { error: `Adres e-mail jest za długi (maksymalnie ${VARCHAR_191_MAX} znaków).` };
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
    return { error: ACCOUNT_MAY_BE_CREATED_MESSAGE };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // Self-registration always creates a READER account. Becoming an editor is
  // a separate, free upgrade offered from the reader's own account panel.
  try {
    await prisma.user.create({
      data: { name, email, passwordHash, role: "READER" },
    });
  } catch (err) {
    // ETAP 13.3C.4F.1: the pre-check above has a race window — two concurrent
    // registrations for the same (not-yet-existing) email can both pass it
    // and both reach this create, and the DB's own @@unique(email) index is
    // the actual guard (P2002 on the loser). Same neutral message as the
    // ordinary pre-check above, not a distinct "account already exists"
    // error, so this race can't be used to narrow down timing-based
    // enumeration either.
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return { error: ACCOUNT_MAY_BE_CREATED_MESSAGE };
    }
    throw err;
  }

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
