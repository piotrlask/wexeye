import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RejestracjaForm from "./RejestracjaForm";

// ETAP 13.3C.4F.1 (A3): same UX-only redirect as /login — see its page.tsx
// for why this is safe to base on auth() despite not being a security check.
export default async function RejestracjaPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/panel");
  }
  return <RejestracjaForm />;
}
