import { subscriptionGrantsAccess } from "./access";
import { plannedTools } from "../catalog/planned";
import { titleForSlug } from "../pages/slug-title";

export type AccountPlanRow = {
  entitlementKey: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
};

export type AccountPlanCopy = {
  plan: string;
  ends: string | null;
};

export function accountPlanCopy(rows: readonly AccountPlanRow[], now: Date): AccountPlanCopy {
  const paid = rows.filter((row) => subscriptionGrantsAccess(row.status, row.currentPeriodEnd, now));
  const plan = paid.some((row) => row.entitlementKey === "all")
    ? "All tools"
    : paid.length > 0
      ? proToolName(paid[0]?.entitlementKey ?? "")
      : "Free";
  const cancelAt = paid
    .map((row) => row.cancelAt)
    .filter((date): date is Date => date !== null && date.getTime() > now.getTime())
    .sort((left, right) => left.getTime() - right.getTime())[0];
  return { plan, ends: cancelAt ? proEndsOn(cancelAt) : null };
}

function proToolName(entitlementKey: string): string {
  const tool = plannedTools.find((item) => item.entitlementKey === entitlementKey);
  const slug = tool?.slugs[0];
  const title = slug ? titleForSlug(slug) ?? tool?.title : tool?.title;
  if (!title) return "Pro";
  return `Pro: ${title}`;
}

function proEndsOn(cancelAt: Date): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(cancelAt);
  return `Pro ends ${formatted}`;
}
