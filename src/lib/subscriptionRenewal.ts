/**
 * What an `invoice.paid` webhook may change on our Subscription row.
 *
 * Stripe redelivers webhooks (timeouts, retries, manual resends), so this must
 * be safe to apply any number of times:
 * - the monthly quota (articlesUsedInPeriod) resets only when the billing
 *   period actually moves forward — a redelivered invoice for the current
 *   period must not hand out a fresh 20-article quota (and fresh commissions);
 * - the row is marked ACTIVE only while Stripe itself reports the subscription
 *   as active — a late redelivery must not resurrect a canceled subscription.
 */
export function renewalUpdate(
  current: { currentPeriodEnd: Date },
  stripePeriodEndSeconds: number,
  stripeStatus: string
): { status?: "ACTIVE"; currentPeriodEnd?: Date; articlesUsedInPeriod?: 0 } {
  const periodEnd = new Date(stripePeriodEndSeconds * 1000);
  const newPeriod = periodEnd.getTime() > current.currentPeriodEnd.getTime();
  const active = stripeStatus === "active" || stripeStatus === "trialing";
  return {
    ...(active ? { status: "ACTIVE" as const } : {}),
    ...(newPeriod ? { currentPeriodEnd: periodEnd, articlesUsedInPeriod: 0 as const } : {}),
  };
}
