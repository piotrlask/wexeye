"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type RegisterState = { error?: string };

export async function registerAction(
  _prevState: RegisterState | undefined,
  formData: FormData
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!name || !email || !password) {
    return { error: "Imię, e-mail i hasło są wymagane." };
  }
  if (password.length < 6) {
    return { error: "Hasło musi mieć min. 6 znaków." };
  }
  if (password !== passwordConfirm) {
    return { error: "Hasła nie są identyczne." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Konto z tym e-mailem już istnieje." };
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
