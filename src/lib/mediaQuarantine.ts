import { constants as fsConstants, createReadStream } from "node:fs";
import { copyFile, link, mkdir, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { QUARANTINE_BATCH_SIZE, QUARANTINE_RETRY_ATTEMPTS } from "@/lib/constants";

// ETAP 13.3C / 13.3C.2 — media quarantine for emergency takedowns.
//
// Article media are plain files under public/uploads, served directly by the
// web server at /uploads/<name>; flipping Article.status does nothing to that
// URL. A takedown therefore MOVES the file (never deletes it) into a
// directory outside public/, keeping it for review/evidence and for a future
// restore (move it back; Media.url is never rewritten).
//
// 13.3C.2 hardening, in short:
//  - the quarantine directory is configurable (QUARANTINE_DIR) and validated
//    (absolute, never inside/around public/, real path checked for symlinks);
//  - a preflight proves the directory is really usable (write/rename/delete);
//  - moves are bounded-retried for transient errors only, never clobber an
//    existing quarantined file, and are idempotent / safe under concurrency;
//  - a reconciliation pass re-checks TAKEN_DOWN media against the filesystem
//    (Media.quarantinedAt is NOT trusted: a backup restore or redeploy can put
//    a public copy back) and only ever deletes a public copy that is
//    byte-identical (SHA-256) to a copy that sits in quarantine.

// Every upload path this app writes is "/uploads/<uuid-or-avatar-uuid>.<ext>".
// Only a URL matching this exact shape is ever turned into a file operation —
// the value comes from the DB (never from the client), and anything else
// (absolute URL, "..", subdirectory, odd characters) is refused, not moved.
const UPLOAD_URL_PATTERN = /^\/uploads\/[A-Za-z0-9][A-Za-z0-9-]*\.(jpg|png|webp|gif|mp4|webm|mov|svg)$/;

const RETRY_DELAYS_MS = [150, 400] as const; // between attempts 1→2 and 2→3

// ---------------------------------------------------------------------------
// Directory resolution and validation
// ---------------------------------------------------------------------------

export type QuarantineSeverity = "OK" | "WARNING" | "ERROR" | "CRITICAL";

export type QuarantineConfigError =
  | "NOT_ABSOLUTE" // QUARANTINE_DIR is set but not an absolute path
  | "INSIDE_PUBLIC" // resolves to public/, uploads/ or anything below them
  | "CONTAINS_PUBLIC" // resolves to a directory that contains public/
  | "REALPATH_UNCERTAIN"; // the real (symlink-resolved) location could not be determined

export type QuarantineConfig =
  | { ok: true; dir: string; source: "env" | "fallback" }
  | { ok: false; error: QuarantineConfigError; source: "env" | "fallback" };

function publicRoot(): string {
  return path.resolve(process.cwd(), "public");
}
function uploadsDir(): string {
  return path.resolve(process.cwd(), "public", "uploads");
}

function isSameOrInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  if (rel === "") return true;
  return rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel);
}

/**
 * Pure (no filesystem) resolution of the quarantine directory from
 * QUARANTINE_DIR. Unset/blank => local fallback (fine for development/tests;
 * production should always set QUARANTINE_DIR explicitly). A set value is never
 * "repaired": it must be absolute, and its resolved form must not be inside —
 * or contain — the public directory.
 */
export function resolveQuarantineDir(): QuarantineConfig {
  const raw = process.env.QUARANTINE_DIR?.trim();
  if (!raw) {
    const dir = path.resolve(process.cwd(), "private", "quarantine", "uploads");
    return { ok: true, dir, source: "fallback" };
  }
  if (!path.isAbsolute(raw)) return { ok: false, error: "NOT_ABSOLUTE", source: "env" };
  const dir = path.resolve(raw);
  const pub = publicRoot();
  if (isSameOrInside(dir, pub)) return { ok: false, error: "INSIDE_PUBLIC", source: "env" };
  if (isSameOrInside(pub, dir)) return { ok: false, error: "CONTAINS_PUBLIC", source: "env" };
  return { ok: true, dir, source: "env" };
}

/** realpath of the deepest EXISTING ancestor of p, with the not-yet-existing remainder re-appended. */
async function realpathOfDeepestExisting(p: string): Promise<string> {
  const rest: string[] = [];
  let cur = p;
  for (;;) {
    try {
      const real = await realpath(cur);
      return rest.length > 0 ? path.join(real, ...rest.reverse()) : real;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      const parent = path.dirname(cur);
      if (parent === cur) throw err;
      rest.push(path.basename(cur));
      cur = parent;
    }
  }
}

async function realpathIfExists(p: string): Promise<string | null> {
  try {
    return await realpath(p);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/**
 * resolveQuarantineDir() + the symlink-aware check: the REAL location of the
 * quarantine directory must not be inside (or contain) the real location of
 * public/ or public/uploads/ — a symlink or junction must not be able to smuggle
 * the quarantine into the web root. Anything that cannot be determined safely
 * is an error, never a pass.
 */
export async function prepareQuarantine(): Promise<QuarantineConfig> {
  const cfg = resolveQuarantineDir();
  if (!cfg.ok) return cfg;
  try {
    const realQuarantine = await realpathOfDeepestExisting(cfg.dir);
    const forbidden = new Set<string>([publicRoot(), uploadsDir()]);
    for (const p of [publicRoot(), uploadsDir()]) {
      const real = await realpathIfExists(p);
      if (real) forbidden.add(real);
    }
    for (const f of forbidden) {
      if (isSameOrInside(realQuarantine, f)) return { ok: false, error: "INSIDE_PUBLIC", source: cfg.source };
      if (isSameOrInside(f, realQuarantine)) return { ok: false, error: "CONTAINS_PUBLIC", source: cfg.source };
    }
  } catch {
    return { ok: false, error: "REALPATH_UNCERTAIN", source: cfg.source };
  }
  return cfg;
}

// ---------------------------------------------------------------------------
// Preflight / health
// ---------------------------------------------------------------------------

export type QuarantineHealth = {
  /** true unless status is ERROR (WARNING = works, but not the recommended configuration). */
  ok: boolean;
  status: "OK" | "WARNING" | "ERROR";
  source: "env" | "fallback";
  code:
    | "OK"
    | "FALLBACK_IN_USE"
    | QuarantineConfigError
    | "MKDIR_FAILED"
    | "WRITE_FAILED"
    | "RENAME_FAILED"
    | "CLEANUP_FAILED";
  /** Human-readable, in Polish. NEVER contains a filesystem path. */
  message: string;
  /** errno code (e.g. "EACCES") for filesystem failures — never a path. */
  detail?: string;
  checks: { config: boolean; outsidePublic: boolean; dirReady: boolean; write: boolean; rename: boolean; cleanup: boolean };
};

const CONFIG_MESSAGES: Record<QuarantineConfigError, string> = {
  NOT_ABSOLUTE: "QUARANTINE_DIR nie jest ścieżką bezwzględną (konfiguracja nieprawidłowa — nie jest automatycznie poprawiana).",
  INSIDE_PUBLIC: "Katalog kwarantanny wskazuje na katalog publiczny (public/ lub uploads) — odrzucono.",
  CONTAINS_PUBLIC: "Katalog kwarantanny zawiera katalog publiczny — odrzucono.",
  REALPATH_UNCERTAIN: "Nie udało się bezpiecznie ustalić rzeczywistej lokalizacji katalogu kwarantanny (symlink/uprawnienia).",
};

function errno(err: unknown): string {
  return (err as NodeJS.ErrnoException)?.code ?? "ERR";
}

/**
 * Proves the quarantine directory is usable BEFORE an incident: the config is
 * valid and outside public/, the directory exists (or can be created), and a
 * tiny random-named file inside it can be written, renamed and deleted — with
 * nothing left behind. Never touches public/uploads and never creates anything
 * publicly reachable. `checks.*` show how far it got.
 */
export async function checkQuarantineHealth(): Promise<QuarantineHealth> {
  const checks = { config: false, outsidePublic: false, dirReady: false, write: false, rename: false, cleanup: false };
  const cfg = await prepareQuarantine();
  if (!cfg.ok) {
    checks.config = cfg.error !== "NOT_ABSOLUTE";
    return { ok: false, status: "ERROR", source: cfg.source, code: cfg.error, message: CONFIG_MESSAGES[cfg.error], checks };
  }
  checks.config = true;
  checks.outsidePublic = true;

  try {
    await mkdir(cfg.dir, { recursive: true, mode: 0o700 });
    checks.dirReady = true;
  } catch (err) {
    return { ok: false, status: "ERROR", source: cfg.source, code: "MKDIR_FAILED", message: "Nie można utworzyć/otworzyć katalogu kwarantanny.", detail: errno(err), checks };
  }

  const id = randomUUID();
  const a = path.join(cfg.dir, `.preflight-${id}.tmp`);
  const b = path.join(cfg.dir, `.preflight-${id}.renamed`);
  let failure: { code: "WRITE_FAILED" | "RENAME_FAILED"; message: string; detail: string } | null = null;
  try {
    await writeFile(a, id, { flag: "wx", mode: 0o600 });
    checks.write = true;
    await rename(a, b);
    checks.rename = true;
  } catch (err) {
    failure = checks.write
      ? { code: "RENAME_FAILED", message: "Nie można zmienić nazwy pliku w katalogu kwarantanny.", detail: errno(err) }
      : { code: "WRITE_FAILED", message: "Katalog kwarantanny nie jest zapisywalny dla procesu aplikacji.", detail: errno(err) };
  }

  // Always clean up; a leftover (or a failed cleanup) is itself an ERROR.
  let cleanupDetail: string | null = null;
  for (const p of [a, b]) {
    try {
      await unlink(p);
    } catch (err) {
      if (errno(err) !== "ENOENT") cleanupDetail = errno(err);
    }
  }
  if (!cleanupDetail) {
    for (const p of [a, b]) {
      if (await pathExists(p).catch(() => true)) cleanupDetail = "LEFTOVER";
    }
  }
  checks.cleanup = cleanupDetail === null;

  if (failure) {
    return { ok: false, status: "ERROR", source: cfg.source, code: failure.code, message: failure.message, detail: failure.detail, checks };
  }
  if (cleanupDetail) {
    return { ok: false, status: "ERROR", source: cfg.source, code: "CLEANUP_FAILED", message: "Nie udało się usunąć tymczasowego pliku testowego z katalogu kwarantanny.", detail: cleanupDetail, checks };
  }
  if (cfg.source === "fallback") {
    return {
      ok: true,
      status: "WARNING",
      source: "fallback",
      code: "FALLBACK_IN_USE",
      message: "Kwarantanna działa, ale używa lokalnego katalogu domyślnego. Na produkcji ustaw jawny QUARANTINE_DIR (ścieżka bezwzględna, poza webrootem, trwała i zapisywalna).",
      checks,
    };
  }
  return { ok: true, status: "OK", source: "env", code: "OK", message: "Kwarantanna działa: katalog poza webrootem, zapis, zmiana nazwy i usunięcie pliku testowego zakończone powodzeniem.", checks };
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch (err) {
    // ONLY "not there" means absent. Any other error (EACCES, EIO, ...) is
    // unknown and must not be mistaken for "the file does not exist".
    if (errno(err) === "ENOENT") return false;
    throw err;
  }
}

function sha256File(p: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(p);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

/** Signals "the filesystem changed under us (another run got there first) — re-evaluate". */
class RaceError extends Error {}

const TRANSIENT_CODES = new Set(["EBUSY", "EAGAIN", "EMFILE", "ENFILE", "EIO", "ETIMEDOUT", "EINTR", "ENOMEM"]);
function isTransient(err: unknown): boolean {
  return err instanceof RaceError || TRANSIENT_CODES.has(errno(err));
}

/**
 * Moves src to dest WITHOUT ever overwriting an existing dest: a hard link
 * (fails with EEXIST if dest exists) followed by unlinking src; if links are
 * not possible (other filesystem/unsupported), an exclusive copy (COPYFILE_EXCL)
 * followed by unlinking src. Either way the public copy is removed only after a
 * complete private copy exists.
 */
async function moveNoClobber(src: string, dest: string): Promise<void> {
  try {
    await link(src, dest);
  } catch (err) {
    const code = errno(err);
    if (code === "EEXIST" || code === "ENOENT") throw new RaceError(code);
    if (!["EXDEV", "EPERM", "ENOSYS", "ENOTSUP", "EOPNOTSUPP", "EMLINK"].includes(code)) throw err;
    try {
      await copyFile(src, dest, fsConstants.COPYFILE_EXCL);
    } catch (copyErr) {
      const c = errno(copyErr);
      if (c === "EEXIST" || c === "ENOENT") throw new RaceError(c);
      throw copyErr;
    }
  }
  try {
    await unlink(src);
  } catch (err) {
    if (errno(err) !== "ENOENT") throw err;
  }
}

/** True if any OTHER live content (media of a non-taken-down article, an ad creative, an avatar) uses this URL. */
async function isSharedWithLiveContent(mediaId: string, url: string): Promise<boolean> {
  const [otherMedia, ad, avatar] = await Promise.all([
    prisma.media.count({ where: { url, id: { not: mediaId }, article: { status: { not: "TAKEN_DOWN" } } } }),
    prisma.adPurchase.count({ where: { mediaUrl: url } }),
    prisma.user.count({ where: { avatarUrl: url } }),
  ]);
  return otherMedia + ad + avatar > 0;
}

// ---------------------------------------------------------------------------
// Per-media reconciliation (used by the takedown itself AND by the sweeper)
// ---------------------------------------------------------------------------

export type MediaState =
  | "HEALTHY" // source absent, quarantine copy present, flag set
  | "MOVED" // source was public, moved to quarantine now
  | "REQUARANTINED" // flag was set but a public copy had reappeared and no quarantine copy existed — moved (sole copy preserved)
  | "FLAG_HEALED" // source absent, quarantine copy present, flag was missing — flag set
  | "PUBLIC_COPY_REMOVED" // public copy reappeared next to an IDENTICAL quarantine copy — public copy removed
  | "CONTENT_MISMATCH" // public and quarantine copies differ — NOTHING deleted
  | "MISSING" // absent everywhere, never flagged (nothing public remains)
  | "LOST" // flag set but the quarantine copy is gone and there is no public copy (evidence lost)
  | "SHARED" // the public file is also used by other live content — left alone
  | "INVALID" // Media.url is not a plain local upload — no file operation
  | "FAILED"; // filesystem error after bounded retries

type MediaRow = { id: string; articleId: string; url: string; quarantinedAt: Date | null };

async function setFlag(mediaId: string): Promise<void> {
  await prisma.media.updateMany({ where: { id: mediaId, quarantinedAt: null }, data: { quarantinedAt: new Date() } });
}

async function evaluateOnce(m: MediaRow, src: string, dest: string, dir: string): Promise<MediaState> {
  try {
    const srcExists = await pathExists(src);
    const destExists = await pathExists(dest);

    if (!srcExists && !destExists) return m.quarantinedAt ? "LOST" : "MISSING";
    if (!srcExists && destExists) {
      if (m.quarantinedAt) return "HEALTHY";
      await setFlag(m.id);
      return "FLAG_HEALED";
    }

    // A public copy exists. Never touch it if other live content uses the same file.
    if (await isSharedWithLiveContent(m.id, m.url)) return "SHARED";

    if (!destExists) {
      await mkdir(dir, { recursive: true, mode: 0o700 });
      await moveNoClobber(src, dest);
      if (!m.quarantinedAt) await setFlag(m.id);
      return m.quarantinedAt ? "REQUARANTINED" : "MOVED";
    }

    // Both exist: never assume they are the same file.
    const [publicHash, privateHash] = await Promise.all([sha256File(src), sha256File(dest)]);
    if (publicHash !== privateHash) return "CONTENT_MISMATCH";
    try {
      await unlink(src);
    } catch (err) {
      if (errno(err) !== "ENOENT") throw err;
    }
    if (!m.quarantinedAt) await setFlag(m.id);
    return "PUBLIC_COPY_REMOVED";
  } catch (err) {
    // A file vanishing mid-check means another run is working on it: re-evaluate.
    if (errno(err) === "ENOENT" && !(err instanceof RaceError)) throw new RaceError("ENOENT");
    throw err;
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One media row, evaluated from the CURRENT filesystem state on every attempt
 * (so it is idempotent and safe if two runs overlap). Only transient errors are
 * retried, at most QUARANTINE_RETRY_ATTEMPTS times in total with a short bounded
 * delay; permanent errors are not retried.
 */
async function reconcileMedia(m: MediaRow, dir: string): Promise<{ state: MediaState; attempts: number }> {
  const name = path.basename(m.url);
  const src = path.resolve(uploadsDir(), name);
  const dest = path.resolve(dir, name);
  // Belt and braces on top of the URL pattern: both resolved paths must sit directly in their directory.
  if (path.dirname(src) !== uploadsDir() || path.dirname(dest) !== dir) return { state: "INVALID", attempts: 0 };

  for (let attempt = 1; attempt <= QUARANTINE_RETRY_ATTEMPTS; attempt++) {
    try {
      return { state: await evaluateOnce(m, src, dest, dir), attempts: attempt };
    } catch (err) {
      const last = attempt === QUARANTINE_RETRY_ATTEMPTS;
      if (!isTransient(err) || last) {
        console.error("[quarantine] media failed", m.id, errno(err), `attempt ${attempt}`);
        return { state: "FAILED", attempts: attempt };
      }
      if (!(err instanceof RaceError)) await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 400);
    }
  }
  return { state: "FAILED", attempts: QUARANTINE_RETRY_ATTEMPTS };
}

export type QuarantineResult = {
  checked: number;
  healthy: number;
  moved: number; // MOVED + REQUARANTINED
  flagHealed: number;
  publicCopiesRemoved: number;
  mismatch: number;
  missing: number;
  lost: number;
  shared: number;
  invalid: number;
  failed: number;
  /** Extra attempts spent on transient errors (0 = everything worked first time). */
  retried: number;
  /** Set when the quarantine directory itself is unusable: NO file operation was attempted. */
  configError: QuarantineConfigError | null;
  /** Non-healthy media only (bounded), for the admin — never shown publicly. */
  items: { mediaId: string; articleId: string; state: MediaState }[];
  hasMore: boolean;
  nextCursor: string | null;
};

function emptyResult(): QuarantineResult {
  return { checked: 0, healthy: 0, moved: 0, flagHealed: 0, publicCopiesRemoved: 0, mismatch: 0, missing: 0, lost: 0, shared: 0, invalid: 0, failed: 0, retried: 0, configError: null, items: [], hasMore: false, nextCursor: null };
}

async function reconcileRows(rows: MediaRow[]): Promise<QuarantineResult> {
  const result = emptyResult();
  let dir: string | null = null; // resolved lazily: an article without local files needs no quarantine at all

  for (const m of rows) {
    result.checked++;
    if (!UPLOAD_URL_PATTERN.test(m.url)) {
      result.invalid++;
      result.items.push({ mediaId: m.id, articleId: m.articleId, state: "INVALID" });
      continue;
    }
    if (dir === null && !result.configError) {
      const cfg = await prepareQuarantine();
      if (cfg.ok) dir = cfg.dir;
      else result.configError = cfg.error;
    }
    if (dir === null) continue; // config error: not a single file operation is attempted

    const { state, attempts } = await reconcileMedia(m, dir);
    result.retried += Math.max(0, attempts - 1);
    switch (state) {
      case "HEALTHY": result.healthy++; break;
      case "MOVED": case "REQUARANTINED": result.moved++; break;
      case "FLAG_HEALED": result.flagHealed++; break;
      case "PUBLIC_COPY_REMOVED": result.publicCopiesRemoved++; break;
      case "CONTENT_MISMATCH": result.mismatch++; break;
      case "MISSING": result.missing++; break;
      case "LOST": result.lost++; break;
      case "SHARED": result.shared++; break;
      case "INVALID": result.invalid++; break;
      case "FAILED": result.failed++; break;
    }
    if (state !== "HEALTHY" && result.items.length < 100) result.items.push({ mediaId: m.id, articleId: m.articleId, state });
  }
  return result;
}

/**
 * Quarantines every local file of ONE article (used right after a takedown and
 * by the per-article retry). Deliberately NOT called inside a DB transaction —
 * see the takedown action.
 */
export async function quarantineArticleMedia(articleId: string): Promise<QuarantineResult> {
  const rows = await prisma.media.findMany({
    where: { articleId },
    select: { id: true, articleId: true, url: true, quarantinedAt: true },
    orderBy: { id: "asc" },
  });
  return reconcileRows(rows);
}

/**
 * Bounded, idempotent sweeper. The source of truth is the DB: only media of
 * Article.status = TAKEN_DOWN are considered (never avatars, ads or live
 * articles), at most `limit` per call, in id order with a cursor so repeated
 * calls cover everything. The filesystem is checked for EVERY row, including
 * ones already flagged as quarantined.
 */
export async function reconcileTakenDownMedia(opts: { limit?: number; afterId?: string | null } = {}): Promise<QuarantineResult> {
  const limit = Math.min(Math.max(opts.limit ?? QUARANTINE_BATCH_SIZE, 1), QUARANTINE_BATCH_SIZE);
  const rows = await prisma.media.findMany({
    where: { article: { status: "TAKEN_DOWN" }, ...(opts.afterId ? { id: { gt: opts.afterId } } : {}) },
    select: { id: true, articleId: true, url: true, quarantinedAt: true },
    orderBy: { id: "asc" },
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const batch = rows.slice(0, limit);
  const result = await reconcileRows(batch);
  result.hasMore = hasMore;
  result.nextCursor = hasMore ? batch[batch.length - 1].id : null;
  return result;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export function quarantineSeverity(r: QuarantineResult): QuarantineSeverity {
  if (r.configError || r.failed > 0 || r.mismatch > 0) return "CRITICAL";
  if (r.lost > 0) return "ERROR";
  if (r.shared > 0 || r.missing > 0 || r.invalid > 0) return "WARNING";
  return "OK";
}

/** One-line, admin-only summary. Contains counts and error codes, never filesystem paths. */
export function describeQuarantine(r: QuarantineResult | null): string {
  if (!r) return "Nie udało się uruchomić kwarantanny mediów — ponów operację.";
  if (r.configError) {
    return `KRYTYCZNE: konfiguracja kwarantanny nieprawidłowa (${r.configError}) — pliki NIE zostały przeniesione i mogą być nadal publiczne. Artykuł jest ukryty. Popraw QUARANTINE_DIR i uruchom „Sprawdź i napraw kwarantannę”.`;
  }
  const parts: string[] = [];
  if (r.moved > 0) parts.push(`przeniesiono do kwarantanny: ${r.moved}`);
  if (r.healthy + r.flagHealed > 0) parts.push(`już w kwarantannie: ${r.healthy + r.flagHealed}`);
  if (r.publicCopiesRemoved > 0) parts.push(`usunięto przywróconą kopię publiczną (identyczna z kwarantanną): ${r.publicCopiesRemoved}`);
  if (r.missing > 0) parts.push(`brak pliku na dysku: ${r.missing}`);
  if (r.invalid > 0) parts.push(`poza katalogiem uploads (nie ruszano): ${r.invalid}`);
  if (r.shared > 0) parts.push(`współdzielone z inną aktywną treścią (NIE przeniesiono): ${r.shared}`);
  if (r.lost > 0) parts.push(`BRAK kopii w kwarantannie mimo oznaczenia (utracony dowód): ${r.lost}`);
  if (r.mismatch > 0) parts.push(`KRYTYCZNE — kopia publiczna różni się od kopii w kwarantannie, NIC nie usunięto: ${r.mismatch}`);
  if (r.failed > 0) parts.push(`BŁĄD przenoszenia: ${r.failed} — plik może być nadal publicznie dostępny, ponów operację`);
  if (r.retried > 0) parts.push(`ponowienia po błędach przejściowych: ${r.retried}`);
  return parts.length > 0 ? `Media: ${parts.join("; ")}.` : "Brak plików multimedialnych do sprawdzenia.";
}

// ---------------------------------------------------------------------------
// Admin overview (read-mostly: no file is ever moved or deleted here)
// ---------------------------------------------------------------------------

export type QuarantineOverview = {
  severity: QuarantineSeverity;
  health: QuarantineHealth;
  takenDownMedia: number;
  unquarantined: number;
  scanned: number;
  /** TAKEN_DOWN media whose file is (still/again) present in public/uploads and NOT shared — may be publicly reachable. */
  publicCopies: number;
  /** Such files that are shared with other live content (left alone on purpose). */
  sharedPublicCopies: number;
  /** Flagged as quarantined, but the quarantine copy is gone and no public copy exists. */
  lostCopies: number;
  alerts: string[];
};

const RANK: Record<QuarantineSeverity, number> = { OK: 0, WARNING: 1, ERROR: 2, CRITICAL: 3 };
const worst = (a: QuarantineSeverity, b: QuarantineSeverity): QuarantineSeverity => (RANK[a] >= RANK[b] ? a : b);

export async function getQuarantineOverview(): Promise<QuarantineOverview> {
  const health = await checkQuarantineHealth();
  // The directory is only trusted for the "is the quarantine copy still there?" check when its CONFIGURATION is valid.
  const configInvalid = ["NOT_ABSOLUTE", "INSIDE_PUBLIC", "CONTAINS_PUBLIC", "REALPATH_UNCERTAIN"].includes(health.code);
  const cfg = resolveQuarantineDir();
  const quarantineDir = cfg.ok && !configInvalid ? cfg.dir : null;

  const [takenDownMedia, unquarantined, rows] = await Promise.all([
    prisma.media.count({ where: { article: { status: "TAKEN_DOWN" } } }),
    prisma.media.count({ where: { article: { status: "TAKEN_DOWN" }, quarantinedAt: null } }),
    prisma.media.findMany({
      where: { article: { status: "TAKEN_DOWN" } },
      select: { id: true, url: true, quarantinedAt: true },
      orderBy: [{ article: { takedownAt: "desc" } }, { id: "asc" }],
      take: QUARANTINE_BATCH_SIZE,
    }),
  ]);

  let publicCopies = 0;
  let sharedPublicCopies = 0;
  let lostCopies = 0;
  for (const m of rows) {
    if (!UPLOAD_URL_PATTERN.test(m.url)) continue;
    const name = path.basename(m.url);
    try {
      if (await pathExists(path.resolve(uploadsDir(), name))) {
        if (await isSharedWithLiveContent(m.id, m.url)) sharedPublicCopies++;
        else publicCopies++;
      } else if (m.quarantinedAt && quarantineDir && !(await pathExists(path.resolve(quarantineDir, name)))) {
        lostCopies++;
      }
    } catch {
      publicCopies++; // cannot tell => treat as possibly public
    }
  }

  const alerts: string[] = [];
  let severity: QuarantineSeverity = health.status === "ERROR" ? "ERROR" : health.status === "WARNING" ? "WARNING" : "OK";
  if (publicCopies > 0) {
    severity = worst(severity, "CRITICAL");
    alerts.push(`UWAGA: ${publicCopies} plik(ów) multimedialnych zdjętych artykułów może nadal znajdować się w public/uploads (publicznie dostępne). Uruchom „Sprawdź i napraw kwarantannę”.`);
  }
  if (health.status === "ERROR") alerts.push(`Kwarantanna mediów nie działa (${health.code}${health.detail ? `, ${health.detail}` : ""}): ${health.message}`);
  if (lostCopies > 0) {
    severity = worst(severity, "ERROR");
    alerts.push(`${lostCopies} plik(ów) oznaczonych jako przeniesione nie ma kopii w kwarantannie (utracony dowód).`);
  }
  if (sharedPublicCopies > 0) {
    severity = worst(severity, "WARNING");
    alerts.push(`${sharedPublicCopies} plik(ów) zdjętych artykułów jest współdzielone z inną aktywną treścią i pozostaje publiczne (celowo).`);
  }
  if (takenDownMedia > rows.length) {
    alerts.push(`Sprawdzono ${rows.length} najnowszych z ${takenDownMedia} mediów zdjętych artykułów; „Sprawdź i napraw kwarantannę” obejmuje wszystkie (partiami po ${QUARANTINE_BATCH_SIZE}).`);
  }
  return { severity, health, takenDownMedia, unquarantined, scanned: rows.length, publicCopies, sharedPublicCopies, lostCopies, alerts };
}
