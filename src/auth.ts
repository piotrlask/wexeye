import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getClientIpFromRequest, checkLoginRateLimit, recordFailedLogin } from "@/lib/rateLimit";

// Distinct `CredentialsSignin` subclass for the rate-limit rejection below —
// lets src/app/login/actions.ts tell "too many attempts" apart from "wrong
// password" (via err.code) without this module needing to know about the
// login form at all. Message text shown to the user still comes from
// loginAction, not from this error directly.
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // AttHost serves this app behind Apache/Passenger, which proxies to the
  // Node process without NextAuth being able to verify the forwarded host
  // itself — without this, every auth call fails with "UntrustedHost"
  // because Auth.js sees the request as arriving at localhost.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const emailKey = email.trim().toLowerCase();
        const ip = getClientIpFromRequest(request);

        // The actual, unbypassable enforcement point: authorize() is the one
        // code path every credentials sign-in goes through, whether it's
        // triggered by the login form's Server Action (src/app/login/
        // actions.ts) or a direct POST to /api/auth/callback/credentials —
        // src/app/login/actions.ts's own pre-check only exists to show a
        // friendlier message before paying for a signIn() round-trip; it is
        // not itself a security boundary. Checked before the DB lookup/
        // bcrypt.compare, same as before, so a rate-limited request never
        // pays for password verification or leaks account existence by
        // timing. A DB error here propagates (fails the sign-in) rather than
        // being swallowed, so a broken rate-limit check can't silently open
        // the door.
        if (!(await checkLoginRateLimit(ip, emailKey))) {
          throw new RateLimitedSignin();
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await recordFailedLogin(ip, emailKey);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await recordFailedLogin(ip, emailKey);
          return null;
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
});
