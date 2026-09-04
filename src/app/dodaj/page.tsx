import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * The global "+ POST" button always points here. It never renders anything
 * itself — it just routes the visitor to the right next step depending on
 * their account state, per spec: guests/readers get prompted to log in or
 * join as an editor; editors/admins go straight to the post form.
 */
export default async function DodajGatePage() {
  const session = await auth();
  const role = session?.user?.role;

  if (!session) {
    redirect("/login?next=/panel/dodaj");
  }
  if (role === "EDITOR" || role === "ADMIN") {
    redirect("/panel/dodaj");
  }
  redirect("/panel?joinEditor=1");
}
