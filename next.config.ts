import type { NextConfig } from "next";

// F-08: baseline HTTP security headers. Deliberately NOT included here:
//   - Content-Security-Policy — needs a per-request nonce (Next.js App
//     Router injects its own inline hydration <script> tags on every page),
//     which only middleware can generate and attach per-request. See
//     src/middleware.ts (ETAP 7.16) for the actual CSP.
//   - Strict-Transport-Security — this repo has no record of the production
//     HTTPS/reverse-proxy config (AttHost Apache/Passenger, configured
//     outside this repo), so whether HTTP is fully disabled there can't be
//     confirmed here. Forcing HSTS blind risks locking out a domain that
//     still serves plain HTTP. Deferred until that's verified out-of-band.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No page in this app is meant to be framed by another site.
  { key: "X-Frame-Options", value: "DENY" },
  // Deny browser APIs this app doesn't use; geolocation is used (Near You /
  // add-content location tagging) so it stays allowed for our own origin.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
