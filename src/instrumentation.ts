// Persistent server-side error log (P1-06). On the production host the
// Passenger/stderr logs are not readable from the account (CageFS), so server
// errors are appended as JSON lines to a private directory outside the web
// root: APP_LOG_DIR, or ~/wexeye-data/logs in production.
//
// Logged: time, Next's error digest, method, path WITHOUT query string, route
// info, error name and a truncated message with e-mail addresses and URL
// credentials redacted. Never request bodies, headers, cookies or stacks.

type RequestInfo = { path: string; method: string };
type ErrorContext = { routerKind: string; routePath: string; routeType: string };

const MAX_FILE_BYTES = 5 * 1024 * 1024;
// Retention promised in the privacy policy (P0-08): error logs are kept 30 days.
const RETENTION_DAYS = 30;

export function redactLogText(text: string): string {
  return text
    .replace(/[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s/@]+@/g, (m) => m.replace(/\/\/[^\s/@]+@/, "//[UKRYTO]@"))
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .slice(0, 500);
}

export async function onRequestError(error: unknown, request: RequestInfo, context: ErrorContext): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { appendFile, mkdir, readdir, stat, unlink } = await import("node:fs/promises");
    const { homedir } = await import("node:os");
    const { join } = await import("node:path");
    const dir =
      process.env.APP_LOG_DIR?.trim() ||
      (process.env.NODE_ENV === "production" ? join(homedir(), "wexeye-data", "logs") : join(process.cwd(), ".logs"));
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const now = new Date();
    const file = join(dir, `app-errors-${now.toISOString().slice(0, 10)}.log`);
    const size = await stat(file).then((s) => s.size).catch(() => 0);
    if (size > MAX_FILE_BYTES) return;
    if (size === 0) {
      // First entry of the day: drop daily files older than the retention period.
      const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
      for (const name of await readdir(dir).catch(() => [] as string[])) {
        const m = /^app-errors-(\d{4}-\d{2}-\d{2})\.log$/.exec(name);
        if (m && m[1] < cutoff) await unlink(join(dir, name)).catch(() => undefined);
      }
    }
    const err = error instanceof Error ? error : new Error(String(error));
    const line = {
      ts: now.toISOString(),
      digest: (err as Error & { digest?: string }).digest ?? null,
      method: request.method,
      path: (request.path ?? "").split("?")[0].slice(0, 300),
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      name: err.name,
      message: redactLogText(err.message ?? ""),
    };
    await appendFile(file, `${JSON.stringify(line)}\n`, { encoding: "utf8", mode: 0o600 });
  } catch {
    // Logging must never break request handling.
  }
}
