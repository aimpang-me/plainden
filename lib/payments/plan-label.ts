import { eq } from "drizzle-orm";
import { subscription } from "../../db/schema";
import { getDb } from "../db/client";
import { subscriptionGrantsAccess } from "./access";

export async function planLabelFor(userId: string): Promise<"Free plan" | "Paid plan"> {
  const db = await getDb();
  const rows = await db
    .select({ status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd })
    .from(subscription)
    .where(eq(subscription.userId, userId));
  const now = new Date();
  const paid = rows.some((row) => subscriptionGrantsAccess(row.status, row.currentPeriodEnd, now));
  return paid ? "Paid plan" : "Free plan";
}
