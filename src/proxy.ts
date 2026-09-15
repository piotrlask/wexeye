import { auth } from "@/auth";
import { NextResponse } from "next/server";

// F-08 (ETAP 7.16): CSP with a per-request nonce. Next.js App Router injects
// its own inline hydration <script> tags on every page, so a script-src that
// actually restricts anything needs a nonce — this is the framework's own
// documented mechanism: generate one per request, forward it to Next.js via
// the standard `x-nonce` request header AND put it in the outgoing
// Content-Security-Policy response header (Next.js reads the nonce back out
// of that header and applies it to the scripts it renders). No per-component
// wiring needed for Next's own scripts.
function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    // style-src has no inline usage left in this app (see EyeIcon.tsx /
    // globals.css — moved off `style={{}}` specifically to avoid needing
    // 'unsafe-inline' here); Tailwind's compiled stylesheet is same-origin.
    "style-src 'self'",
    // blob: — avatar upload preview (ProfileForm.tsx, URL.createObjectURL).
    // OpenStreetMap tiles — the map (WorldMap.tsx).
    "img-src 'self' blob: https://*.tile.openstreetmap.org",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

// Renamed from middleware.ts (ETAP 11.3): Next.js 16 deprecated the
// `middleware` file convention in favor of `proxy`, which — critically for
// this stage — defaults to the Node.js runtime instead of Edge. auth()'s
// `jwt` callback now does a Prisma lookup (passwordChangedAt, see
// src/auth.ts) on every session read, and Prisma cannot run on the Edge
// runtime at all. Pure rename + runtime change, zero logic touched — same
// migration Next.js's own `middleware-to-proxy` codemod performs, and the
// same warning this project's build output has shown since ETAP 7.16.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/panel") && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/panel/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/panel", req.url));
  }

  if (pathname.startsWith("/panel/dodaj") && role !== "EDITOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/panel", req.url));
  }

  const nonce = crypto.randomUUID();
  const csp = buildCspHeader(nonce);

  // Forwarded as a request header so Server Components can read it via
  // headers() if ever needed, and — critically — so Next.js's own script
  // injection sees the same nonce declared in the response CSP below.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  // Broadened from /panel/:path* so CSP applies site-wide (the panel
  // authorization checks above are unchanged and still only ever fire for
  // /panel paths — broadening the matcher only changes which requests run
  // this function, not what the function decides for a given path).
  // Excludes API routes (they don't render HTML/scripts) and Next's own
  // static/image assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
