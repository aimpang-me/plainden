const graceMs = 3 * 24 * 60 * 60 * 1000;

const openStatuses = new Set(["active", "trialing", "past_due", "paused"]);

export function subscriptionGrantsAccess(status: string, currentPeriodEnd: Date | null, now: Date): boolean {
  if (status === "active" || status === "trialing") return true;
  if (status !== "past_due" || !currentPeriodEnd) return false;
  return now.getTime() <= currentPeriodEnd.getTime() + graceMs;
}

export function isOpenSubscription(status: string): boolean {
  return openStatuses.has(status);
}
