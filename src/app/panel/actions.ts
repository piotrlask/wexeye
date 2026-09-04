"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MAX_DIRECT_REFERRALS, GENDERS } from "@/lib/constants";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export type BecomeEditorState = { error?: string; success?: boolean };

export async function becomeEditorAction(
  _prevState: BecomeEditorState | undefined,
  formData: FormData
): Promise<BecomeEditorState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }
  if (session.user.role !== "READER") {
    return { error: "To konto nie może dołączyć do zespołu redakcyjnego." };
  }

  const referralCode = String(formData.get("referralCode") ?? "").trim();

  if (!referralCode) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "EDITOR", sponsorId: null },
    });
    revalidatePath("/panel");
    return { success: true };
  }

  const sponsor = await prisma.user.findUnique({
    where: { referralCode },
    select: { id: true, role: true },
  });
  if (!sponsor || (sponsor.role !== "EDITOR" && sponsor.role !== "ADMIN")) {
    return { error: "Nieprawidłowy kod polecający." };
  }

  try {
    // Locks the sponsor's row for the duration of the transaction, so two
    // people joining under the same referral code at the same moment can't
    // both read "4/5 slots used" and both get accepted, landing at 6.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${sponsor.id} FOR UPDATE`;
      if (sponsor.role === "EDITOR") {
        const directCount = await tx.user.count({ where: { sponsorId: sponsor.id } });
        if (directCount >= MAX_DIRECT_REFERRALS) {
          throw new Error("SPONSOR_FULL");
        }
      }
      await tx.user.update({
        where: { id: session.user.id },
        data: { role: "EDITOR", sponsorId: sponsor.id },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SPONSOR_FULL") {
      return { error: "Ten redaktor osiągnął już limit 5 osób w swoim zespole." };
    }
    throw err;
  }

  revalidatePath("/panel");
  return { success: true };
}

export type UpdateProfileState = { error?: string; success?: boolean };

export async function updateProfileAction(
  _prevState: UpdateProfileState | undefined,
  formData: FormData
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }

  const city = String(formData.get("city") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();

  if (gender && !GENDERS.includes(gender as (typeof GENDERS)[number])) {
    return { error: "Nieprawidłowa płeć." };
  }

  let age: number | null = null;
  if (ageRaw) {
    age = Number(ageRaw);
    if (!Number.isInteger(age) || age < 13 || age > 120) {
      return { error: "Podaj poprawny wiek (13–120)." };
    }
  }

  let avatarUrl: string | undefined;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { error: "Zdjęcie profilowe przekracza limit 5 MB." };
    }
    const ext = ALLOWED_AVATAR_TYPES[avatarFile.type];
    if (!ext) {
      return { error: "Obsługiwane formaty zdjęcia: JPG, PNG, WEBP." };
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filename = `avatar-${randomUUID()}${ext}`;
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);
    avatarUrl = `/uploads/${filename}`;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { city: city || null, gender: gender || null, age, ...(avatarUrl ? { avatarUrl } : {}) },
  });

  revalidatePath("/panel");
  revalidatePath(`/profil/${session.user.id}`);
  return { success: true };
}
