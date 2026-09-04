"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = formData.get("email");
  const password = formData.get("password");
  const next = String(formData.get("next") ?? "");
  const redirectTo = next.startsWith("/") ? next : "/panel";

  try {
    await signIn("credentials", { email, password, redirectTo });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Nieprawidłowy e-mail lub hasło." };
    }
    throw err;
  }
}
