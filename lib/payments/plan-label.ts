import { eq } from "drizzle-orm";
import { subscription } from "../../db/schema";
import { getDb } from "../db/client";
import { accountPlanCopy } from "./account-plan";

export async function planLabelFor(userId: string): Promise<"Free plan" | "Paid plan"> {
  const db = await getDb();
  const rows = await db
    .select({
      entitlementKey: subscription.entitlementKey,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAt: subscription.cancelAt,
    })
    .from(subscription)
    .where(eq(subscription.userId, userId));
  return accountPlanCopy(rows, new Date()).paid ? "Paid plan" : "Free plan";
}
