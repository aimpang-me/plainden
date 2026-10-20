import { and, eq, or } from "drizzle-orm";
import { subscription } from "../../db/schema";
import type { Entitlement, Subject } from "../contract/types";
import { getDb } from "../db/client";
import { parseSubject } from "./subject";

const entitledStatuses = new Set(["active", "trialing"]);

export async function getEntitlement(subject: Subject, entitlementKey: string): Promise<Entitlement> {
  const parsed = parseSubject(subject);
  switch (parsed.kind) {
    case "device":
      return { entitlementKey, plan: "free" };
    case "user":
      return entitlementForUser(parsed.userId, entitlementKey);
    default: {
      const unreachable: never = parsed;
      return unreachable;
    }
  }
}

async function entitlementForUser(userId: string, entitlementKey: string): Promise<Entitlement> {
  const db = await getDb();
  const rows = await db
    .select({ status: subscription.status })
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        or(eq(subscription.entitlementKey, entitlementKey), eq(subscription.entitlementKey, "all")),
      ),
    );
  const paid = rows.some((row) => entitledStatuses.has(row.status));
  return { entitlementKey, plan: paid ? "paid" : "free" };
}
