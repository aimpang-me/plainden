import { subscriptionGrantsAccess } from "./access";

export type AccountPlanRow = {
  entitlementKey: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
};

export type AccountPlanCopy = {
  plan: "Free" | "One tool" | "All tools";
  ends: string | null;
};

export function accountPlanCopy(rows: readonly AccountPlanRow[], now: Date): AccountPlanCopy {
  const paid = rows.filter((row) => subscriptionGrantsAccess(row.status, row.currentPeriodEnd, now));
  const plan = paid.some((row) => row.entitlementKey === "all") ? "All tools" : paid.length > 0 ? "One tool" : "Free";
  return { plan, ends: null };
}
