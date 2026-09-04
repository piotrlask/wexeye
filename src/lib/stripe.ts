import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

// A placeholder key lets the app boot and the UI render in dev without a real
// Stripe account; actual checkout/webhook calls will fail until real test
// keys are set in .env (see .env.example).
export const stripe = new Stripe(key && key.length > 0 ? key : "sk_test_placeholder", {
  apiVersion: "2026-07-29.dahlia",
});

export const STRIPE_CONFIGURED = Boolean(key && key.startsWith("sk_"));
