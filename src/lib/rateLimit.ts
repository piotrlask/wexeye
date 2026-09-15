import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Basic brute-force / mass-registration throttling backed by the existing
 * MySQL database (the `AuthAttempt` table) — this app has no other shared
 * state (no Redis/cache), and an in-memory counter would reset on every
 * restart and wouldn't be shared across multiple app processes, which would
 * make it a purely cosmetic protection. One row per attempt, counted within
 * a rolling time window; old rows are pruned opportunistically so the table
 * doesn't grow without bound.
 *
 * Login is throttled two ways at once:
 *   - per IP: catches one source hammering many/any accounts.
 *   - per IP+email combined: catches one source targeting one account.
 * There is deliberately NO per-email-only limit — that would let anyone who
 * knows a user's email address lock them out of their own account by
 * repeatedly failing login for it from elsewhere. Keying on IP+email means
 * the real owner, logging in from their own IP, is never affected by an
 * attacker hammering their email from a different one.
 *
 * Registration is throttled per IP only: unlike login, a wrong/duplicate
 * email during registration can't be used to lock out an existing account
 * (the existing "e-mail already exists" check is unaffected by this), so the
 * only real threat here is one source creating many accounts.
 *
 * Password reset requests are throttled per IP AND per email ALONE (not
 * IP+email combined like login) — unlike a login attempt, a reset request
 * costs the target an email, so the real threat is someone email-bombing one
 * victim's inbox from many different IPs, which only a pure per-email limit
 * catches. This can't be used to lock the real owner out of anything: a
 * reset request never blocks login itself, only further reset emails.
 */

const LOGIN_IP_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_IP_LIMIT = 20;

const LOGIN_IP_EMAIL_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_IP_EMAIL_LIMIT = 5;

const REGISTER_IP_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_IP_LIMIT = 5;

const PASSWORD_RESET_IP_WINDOW_MS = 60 * 60 * 1000;
const PASSWORD_RESET_IP_LIMIT = 10;

const PASSWORD_RESET_EMAIL_WINDOW_MS = 60 * 60 * 1000;
const PASSWORD_RESET_EMAIL_LIMIT = 3;

/** Longest of the windows actually in use, for opportunistic pruning. */
const MAX_WINDOW_MS = Math.max(
  LOGIN_IP_WINDOW_MS,
  LOGIN_IP_EMAIL_WINDOW_MS,
  REGISTER_IP_WINDOW_MS,
  PASSWORD_RESET_IP_WINDOW_MS,
  PASSWORD_RESET_EMAIL_WINDOW_MS
);

/**
 * Best-effort client IP from the reverse proxy's `X-Forwarded-For` header.
 * This app already trusts its reverse proxy for host info (see `trustHost`
 * in src/auth.ts, required because AttHost serves it behind Apache/
 * Passenger) — same trust boundary applies here. Falls back to a constant
 * so rate limiting still groups requests together (fail toward "shared
 * bucket", not toward "unlimited") if the header is ever missing.
 */
function ipFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/** Client IP for callers with access to Next.js's request-scoped `headers()` (Server Actions, Route Handlers). */
export async function getClientIp(): Promise<string> {
  return ipFromHeaders(await headers());
}

/**
 * Client IP for callers holding the raw `Request` object directly — namely
 * NextAuth's `Credentials.authorize()`, which Auth.js always passes the
 * original request as its second argument (see src/auth.ts). Using it there
 * instead of `getClientIp()` sidesteps any doubt about whether Next.js's
 * request-scoped `headers()` is reliably readable from inside Auth.js core's
 * own request handling — the `request` argument is guaranteed to be the
 * genuine inbound request regardless of which path (the login form's Server
 * Action, or a direct POST to /api/auth/callback/credentials) reached it.
 */
export function getClientIpFromRequest(request: Request): string {
  return ipFromHeaders(request.headers);
}

async function prune(kind: "LOGIN" | "REGISTER" | "PASSWORD_RESET") {
  await prisma.authAttempt.deleteMany({
    where: { kind, createdAt: { lt: new Date(Date.now() - MAX_WINDOW_MS) } },
  });
}

/** Returns true when the caller is still under both login limits. */
export async function checkLoginRateLimit(ip: string, email: string): Promise<boolean> {
  const now = Date.now();
  const [ipCount, ipEmailCount] = await Promise.all([
    prisma.authAttempt.count({
      where: { kind: "LOGIN", ip, createdAt: { gt: new Date(now - LOGIN_IP_WINDOW_MS) } },
    }),
    prisma.authAttempt.count({
      where: { kind: "LOGIN", ip, email, createdAt: { gt: new Date(now - LOGIN_IP_EMAIL_WINDOW_MS) } },
    }),
  ]);
  return ipCount < LOGIN_IP_LIMIT && ipEmailCount < LOGIN_IP_EMAIL_LIMIT;
}

/** Records one failed login attempt. Call only after authentication actually fails. */
export async function recordFailedLogin(ip: string, email: string): Promise<void> {
  await prisma.authAttempt.create({ data: { kind: "LOGIN", ip, email } });
  await prune("LOGIN");
}

/** Returns true when the caller is still under the registration limit. */
export async function checkRegisterRateLimit(ip: string): Promise<boolean> {
  const count = await prisma.authAttempt.count({
    where: { kind: "REGISTER", ip, createdAt: { gt: new Date(Date.now() - REGISTER_IP_WINDOW_MS) } },
  });
  return count < REGISTER_IP_LIMIT;
}

/** Records one registration attempt (successful or not — see actions.ts for why). */
export async function recordRegisterAttempt(ip: string): Promise<void> {
  await prisma.authAttempt.create({ data: { kind: "REGISTER", ip } });
  await prune("REGISTER");
}

/** Returns true when the caller is still under both password-reset-request limits. */
export async function checkPasswordResetRateLimit(ip: string, email: string): Promise<boolean> {
  const now = Date.now();
  const [ipCount, emailCount] = await Promise.all([
    prisma.authAttempt.count({
      where: { kind: "PASSWORD_RESET", ip, createdAt: { gt: new Date(now - PASSWORD_RESET_IP_WINDOW_MS) } },
    }),
    prisma.authAttempt.count({
      where: { kind: "PASSWORD_RESET", email, createdAt: { gt: new Date(now - PASSWORD_RESET_EMAIL_WINDOW_MS) } },
    }),
  ]);
  return ipCount < PASSWORD_RESET_IP_LIMIT && emailCount < PASSWORD_RESET_EMAIL_LIMIT;
}

/** Records one password-reset request attempt — regardless of whether the account exists, so the limit itself never leaks account existence (see nie-pamietam-hasla/actions.ts). */
export async function recordPasswordResetAttempt(ip: string, email: string): Promise<void> {
  await prisma.authAttempt.create({ data: { kind: "PASSWORD_RESET", ip, email } });
  await prune("PASSWORD_RESET");
}
