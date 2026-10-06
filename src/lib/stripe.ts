import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

// A placeholder key lets the app boot and the UI render in dev without a real
// Stripe account; actual checkout/webhook calls will fail until real test
// keys are set in .env (see .env.example).
export const stripe = new Stripe(key && key.length > 0 ? key : "sk_test_placeholder", {
  apiVersion: "2026-07-29.dahlia",
});

export const STRIPE_CONFIGURED = Boolean(key && key.startsWith("sk_"));

// Payments are offered to users ONLY when both the API key and the webhook
// signing secret are configured: without the webhook secret Stripe would take
// the money but the purchase/subscription would never be fulfilled here.
export function paymentsEnabled(secretKey: string | undefined, webhookSecret: string | undefined): boolean {
  return Boolean(
    secretKey && /^sk_(live|test)_/.test(secretKey) && secretKey !== "sk_test_placeholder" && webhookSecret?.startsWith("whsec_")
  );
}
export const PAYMENTS_ENABLED = paymentsEnabled(key, process.env.STRIPE_WEBHOOK_SECRET);

export const PAYMENTS_DISABLED_MESSAGE = "Płatności będą dostępne wkrótce.";
