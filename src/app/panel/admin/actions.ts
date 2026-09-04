"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Brak uprawnień.");
  }
  return session;
}

export type FormState = { error?: string; success?: boolean };

export async function createEditorAction(
  _prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "EDITOR");

  if (!name || !email || !password) {
    return { error: "Imię, e-mail i hasło są wymagane." };
  }
  if (password.length < 6) {
    return { error: "Hasło musi mieć min. 6 znaków." };
  }
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return { error: "Nieprawidłowa rola." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Użytkownik z tym e-mailem już istnieje." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash, role } });

  revalidatePath("/panel/admin");
  return { success: true };
}

export async function moderateArticleAction(articleId: string, approve: boolean, note?: string) {
  await requireAdmin();

  await prisma.article.update({
    where: { id: articleId },
    data: approve
      ? { status: "PUBLISHED", publishedAt: new Date(), reviewNote: null }
      : { status: "REJECTED", reviewNote: note ?? null },
  });

  revalidatePath("/panel/admin");
  revalidatePath("/");
}

export async function addPaymentAction(
  _prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));

  if (!description || Number.isNaN(amount) || amount <= 0) {
    return { error: "Podaj opis i poprawną kwotę." };
  }

  await prisma.payment.create({
    data: { description, amountCents: Math.round(amount * 100) },
  });

  revalidatePath("/panel/admin");
  return { success: true };
}

export async function markPaymentPaidAction(paymentId: string) {
  await requireAdmin();
  await prisma.payment.update({ where: { id: paymentId }, data: { status: "PAID" } });
  revalidatePath("/panel/admin");
}
