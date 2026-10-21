import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { usage } from "../../db/schema";
import { LimitKind } from "../contract/limits";
import type { LimitDecision, Subject } from "../contract/types";
import { getDb } from "../db/client";
import { decideLimit } from "./decide-limit";
import { getEntitlement } from "./get-entitlement";
import { limitsFor } from "./limits-for";
import { usagePeriod } from "./period";
import { parseSubject } from "./subject";

export async function checkLimit(
  subject: Subject,
  entitlementKey: string,
  kind: LimitKind,
  amount: number,
): Promise<LimitDecision> {
  const limits = limitsFor(entitlementKey);
  if (!limits) {
    return { ok: false, plan: "free", kind: "unknown", limit: 0, reason: `unknown entitlement ${entitlementKey}` };
  }
  const entitlement = await getEntitlement(subject, entitlementKey);
  if (kind === LimitKind.savedItems) {
    return decideLimit({ plan: entitlement.plan, limits, kind, amount });
  }
  const period = usagePeriod(kind, new Date());
  const table = entitlement.plan === "paid" ? limits.paid : limits.free;
  const cap = table[kind];
  if (!period || cap === undefined) return decideLimit({ plan: entitlement.plan, limits, kind, amount });
  const stored = await usageCount(subject, entitlementKey, kind, period);
  const decision = decideLimit({ plan: entitlement.plan, limits, kind, amount: stored + amount });
  if (decision.ok) await addUsage(subject, entitlementKey, kind, period, amount);
  return decision;
}

async function usageCount(
  subject: Subject,
  entitlementKey: string,
  kind: LimitKind,
  period: string,
): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ count: usage.count })
    .from(usage)
    .where(usageWhere(subject, entitlementKey, kind, period));
  return rows.reduce((sum, row) => sum + row.count, 0);
}

async function addUsage(
  subject: Subject,
  entitlementKey: string,
  kind: LimitKind,
  period: string,
  amount: number,
): Promise<void> {
  const db = await getDb();
  const where = usageWhere(subject, entitlementKey, kind, period);
  const rows = await db.select({ id: usage.id, count: usage.count }).from(usage).where(where);
  const now = new Date();
  const existing = rows[0];
  if (existing) {
    await db.update(usage).set({ count: existing.count + amount, updatedAt: now }).where(eq(usage.id, existing.id));
    return;
  }
  const parsed = parseSubject(subject);
  await db.insert(usage).values({
    id: randomUUID(),
    userId: parsed.kind === "user" ? parsed.userId : null,
    deviceId: parsed.kind === "device" ? parsed.deviceId : null,
    entitlementKey,
    kind,
    period,
    count: amount,
    updatedAt: now,
  });
}

function usageWhere(subject: Subject, entitlementKey: string, kind: LimitKind, period: string) {
  const parsed = parseSubject(subject);
  const subjectMatch =
    parsed.kind === "user"
      ? and(eq(usage.userId, parsed.userId), isNull(usage.deviceId))
      : and(isNull(usage.userId), eq(usage.deviceId, parsed.deviceId));
  return and(subjectMatch, eq(usage.entitlementKey, entitlementKey), eq(usage.kind, kind), eq(usage.period, period));
}
