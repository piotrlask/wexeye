import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginForm from "./LoginForm";

// ETAP 13.3C.4F.1 (A3): a UX redirect only — an already-logged-in visitor
// gets no benefit from the login form, so send them to /panel instead.
// auth() re-runs the jwt callback's DB checks on every call (see
// src/auth.ts), so this is never based on a stale/cached role — not that it
// would matter here either way, since this decides nothing security-sensitive.
export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/panel");
  }
  return <LoginForm />;
}
