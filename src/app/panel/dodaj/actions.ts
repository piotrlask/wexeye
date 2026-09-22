"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasStaffAccess } from "@/lib/access";
import { CATEGORIES, POST_TYPES, SOURCE_TYPES } from "@/lib/constants";
import { fitsVarchar, VARCHAR_191_MAX } from "@/lib/validation";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, "PHOTO" | "VIDEO"> = {
  "image/jpeg": "PHOTO",
  "image/png": "PHOTO",
  "image/webp": "PHOTO",
  "image/gif": "PHOTO",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "video/quicktime": "VIDEO",
};
// Extension is derived from the (validated) MIME type only, never from the
// uploaded filename — trusting file.name would let someone upload e.g.
// "x.html" with a spoofed image MIME and have it saved with a .html
// extension into public/uploads.
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export type AddContentState = { error?: string; success?: boolean };

export async function addContentAction(
  _prevState: AddContentState | undefined,
  formData: FormData
): Promise<AddContentState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }
  // Defense in depth: middleware.ts already gates /panel/dodaj to EDITOR/ADMIN,
  // but this Server Action is reachable as its own endpoint and must not rely
  // on that alone (see CLAUDE.md #8 — role checks belong in the code that
  // performs the operation, not just the route in front of it).
  if (!(await hasStaffAccess(session.user.id))) {
    return { error: "Nie masz uprawnień do dodawania treści." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const postType = String(formData.get("postType") ?? "STORY").trim();
  const subcategory = String(formData.get("subcategory") ?? "").trim();
  const sourceType = String(formData.get("sourceType") ?? "UNKNOWN").trim();
  const hashtagsRaw = String(formData.get("hashtags") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const continent = String(formData.get("continent") ?? "").trim();
  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();
  const locationHidden = formData.get("locationHidden") === "on";
  const eventAtRaw = String(formData.get("eventAt") ?? "").trim();
  const files = formData.getAll("media").filter((f): f is File => f instanceof File && f.size > 0);

  if (!title || !body || !category) {
    return { error: "Tytuł, treść i kategoria są wymagane." };
  }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { error: "Nieprawidłowa kategoria." };
  }
  if (!POST_TYPES.includes(postType as (typeof POST_TYPES)[number])) {
    return { error: "Nieprawidłowy typ publikacji." };
  }
  if (!SOURCE_TYPES.includes(sourceType as (typeof SOURCE_TYPES)[number])) {
    return { error: "Nieprawidłowe źródło informacji." };
  }

  const latitude = latRaw ? Number(latRaw) : null;
  if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    return { error: "Nieprawidłowa szerokość geograficzna." };
  }
  const longitude = lngRaw ? Number(lngRaw) : null;
  if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    return { error: "Nieprawidłowa długość geograficzna." };
  }
  const eventAt = eventAtRaw ? new Date(eventAtRaw) : null;
  if (eventAt && Number.isNaN(eventAt.getTime())) {
    return { error: "Nieprawidłowa data zdarzenia." };
  }

  // ETAP 13.3C.4F.1 (A5): title/subcategory/city/region/country/continent are
  // plain VARCHAR(191) columns (see schema.prisma) — the HTML `maxLength` on
  // these fields (added alongside this check) is a UX nicety only, since a
  // direct POST bypasses it entirely. Checked before anything is written to
  // disk below.
  const lengthChecks: [string, string][] = [
    ["Tytuł", title],
    ["Podkategoria", subcategory],
    ["Miasto", city],
    ["Region", region],
    ["Kraj", country],
    ["Kontynent", continent],
  ];
  for (const [label, value] of lengthChecks) {
    if (!fitsVarchar(value)) {
      return { error: `${label} jest za długi(e) (maksymalnie ${VARCHAR_191_MAX} znaków).` };
    }
  }

  const hashtags = hashtagsRaw
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  // ETAP 13.3C.4F.1 (orphaned uploads): validate every file BEFORE writing
  // any of them, so a bad file later in the list (wrong type / too large)
  // can never leave an earlier, already-written file orphaned on disk with
  // no DB row pointing at it.
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return { error: `Plik "${file.name}" przekracza limit 25 MB.` };
    }
    if (!ALLOWED_TYPES[file.type]) {
      return { error: `Nieobsługiwany typ pliku: ${file.type || file.name}.` };
    }
  }

  const mediaRecords: { type: "PHOTO" | "VIDEO"; url: string }[] = [];
  const writtenFilenames: string[] = [];

  for (const file of files) {
    const mediaType = ALLOWED_TYPES[file.type];
    const ext = EXT_BY_MIME[file.type];
    const filename = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);
    writtenFilenames.push(filename);

    mediaRecords.push({ type: mediaType, url: `/uploads/${filename}` });
  }

  try {
    await prisma.article.create({
      data: {
        title,
        body,
        category,
        postType,
        subcategory: subcategory || null,
        sourceType,
        hashtags: hashtags || null,
        city: city || null,
        region: region || null,
        country: country || null,
        continent: continent || null,
        latitude,
        longitude,
        locationHidden,
        eventAt,
        status: "PENDING",
        authorId: session.user.id,
        media: { create: mediaRecords },
      },
    });
  } catch (err) {
    // The DB is the source of truth — if the row was never created,
    // best-effort delete ONLY the file(s) THIS request just wrote, never
    // anything pre-existing. Each filename was generated by this function
    // (randomUUID()), never taken from user input, and is re-resolved to
    // confirm it still sits directly inside uploadsDir before being removed
    // — same defense-in-depth pattern as the avatar cleanup in
    // panel/actions.ts's deleteAccountAction.
    for (const filename of writtenFilenames) {
      const filePath = path.resolve(uploadsDir, filename);
      if (path.dirname(filePath) === uploadsDir) {
        try {
          await unlink(filePath);
        } catch {
          // Non-fatal — see comment above; must never mask the real error below.
        }
      }
    }
    throw err;
  }

  revalidatePath("/panel/dodaj");
  return { success: true };
}
