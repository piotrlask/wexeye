"use server";

import bcrypt from "bcryptjs";
import { resetPasswordWithToken, validatePasswordResetToken } from "@/lib/passwordReset";

export type ResetPasswordState = { error?: string; success?: boolean };

// Deliberately identical for "no token", "unknown token", "expired token",
// and "already-used token" — never reveals which case occurred.
const INVALID_TOKEN_MESSAGE = "Link resetowania hasła jest nieprawidłowy lub wygasł.";

export async function resetPasswordAction(
  _prevState: ResetPasswordState | undefined,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!token) {
    return { error: INVALID_TOKEN_MESSAGE };
  }
  if (password.length < 10) {
    return { error: "Hasło musi mieć co najmniej 10 znaków." };
  }
  if (password !== passwordConfirm) {
    return { error: "Hasła nie są identyczne." };
  }

  // Cheap pre-check only, to skip paying for bcrypt on an obviously-bad
  // token — NOT the security boundary. resetPasswordWithToken() below
  // re-validates everything atomically at write time regardless.
  const validated = await validatePasswordResetToken(token);
  if (!validated) {
    return { error: INVALID_TOKEN_MESSAGE };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await resetPasswordWithToken(token, passwordHash);
  if (result !== "success") {
    return { error: INVALID_TOKEN_MESSAGE };
  }

  return { success: true };
}
