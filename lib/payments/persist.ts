import { eq } from "drizzle-orm";
import { subscription } from "../../db/schema";
import { getDb } from "../db/client";
import type { SubscriptionApply } from "./subscription";

export async function persistSubscription(apply: Exclude<SubscriptionApply, { kind: "ignore" }>): Promise<void> {
  const db = await getDb();
  const existing = await db
    .select({ id: subscription.id })
    .from(subscription)
    .where(eq(subscription.stripeSubscriptionId, apply.stripeSubscriptionId));
  const row = existing[0];
  if (apply.kind === "insert-only" && row) return;
  const now = new Date();
  const values: {
    status: string;
    priceLookupKey: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string;
    updatedAt: Date;
    currentPeriodEnd?: Date;
  } = {
    status: apply.status,
    priceLookupKey: apply.priceLookupKey,
    stripeCustomerId: apply.stripeCustomerId,
    stripeSubscriptionId: apply.stripeSubscriptionId,
    updatedAt: now,
  };
  if (apply.currentPeriodEnd) values.currentPeriodEnd = apply.currentPeriodEnd;
  if (row) {
    await db.update(subscription).set(values).where(eq(subscription.id, row.id));
    return;
  }
  await db.insert(subscription).values({
    id: apply.stripeSubscriptionId,
    userId: apply.userId,
    entitlementKey: apply.entitlementKey,
    createdAt: now,
    ...values,
  });
}
