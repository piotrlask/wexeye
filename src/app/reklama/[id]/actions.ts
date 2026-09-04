"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { activateAdPurchase } from "@/lib/ads";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, "PHOTO" | "VIDEO"> = {
  "image/jpeg": "PHOTO",
  "image/png": "PHOTO",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "video/quicktime": "VIDEO",
};
// Derived from the validated MIME type only — see the identical fix in
// panel/dodaj/actions.ts for why trusting file.name's extension is unsafe.
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export type UploadCreativeState = { error?: string; success?: boolean };

export async function uploadAdCreativeAction(
  purchaseId: string,
  _prevState: UploadCreativeState | undefined,
  formData: FormData
): Promise<UploadCreativeState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }

  const purchase = await prisma.adPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase || purchase.advertiserId !== session.user.id) {
    return { error: "Nie znaleziono zamówienia." };
  }
  if (purchase.status !== "PAID") {
    return { error: "Ta reklama nie jest gotowa na dodanie kreacji." };
  }

  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  if (!linkUrl) {
    return { error: "Podaj link, do którego ma prowadzić reklama." };
  }
  try {
    const parsed = new URL(linkUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
  } catch {
    return { error: "Podaj poprawny link (np. https://twojastrona.pl)." };
  }

  const file = formData.get("media");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Dodaj zdjęcie (JPG/PNG) lub film (MP4/WEBM)." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Plik przekracza limit 25 MB." };
  }
  const mediaType = ALLOWED_TYPES[file.type];
  if (!mediaType) {
    return { error: "Obsługiwane formaty: JPG, PNG, MP4, WEBM." };
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const ext = EXT_BY_MIME[file.type];
  const filename = `ad-${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  await activateAdPurchase(purchaseId, mediaType, `/uploads/${filename}`, linkUrl);

  revalidatePath(`/reklama/${purchaseId}`);
  return { success: true };
}
