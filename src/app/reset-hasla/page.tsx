import ResetPasswordForm from "./ResetPasswordForm";

// No searchParams here on purpose: the token now travels in the URL
// fragment (#token=...), which browsers never send to the server — so the
// server side of this page can never see it, and never needs to. See
// ResetPasswordForm.tsx for how the client reads it back out.
export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Ustaw nowe hasło</h1>
      <ResetPasswordForm />
    </div>
  );
}
