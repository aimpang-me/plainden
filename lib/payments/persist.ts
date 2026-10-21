import { sql } from "drizzle-orm";
import { getDb } from "../db/client";
import type { SubscriptionApply } from "./subscription";

export async function persistSubscription(apply: Exclude<SubscriptionApply, { kind: "ignore" }>): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const statusOnly = apply.userId === null || apply.entitlementKey === null || apply.priceLookupKey === null;
  await db.execute(sql`
    WITH claim AS (
      INSERT INTO "processed_events" ("id", "occurredAt")
      VALUES (${apply.eventId}, ${apply.eventAt})
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id"
    ),
    updated AS (
      UPDATE "subscriptions" SET
        "status" = ${apply.status},
        "entitlementKey" = CASE WHEN ${statusOnly} THEN "entitlementKey" ELSE CAST(${apply.entitlementKey} AS text) END,
        "priceLookupKey" = CASE WHEN ${statusOnly} THEN "priceLookupKey" ELSE CAST(${apply.priceLookupKey} AS text) END,
        "providerCustomerId" = COALESCE(${apply.providerCustomerId}, "providerCustomerId"),
        "providerSubscriptionId" = ${apply.providerSubscriptionId},
        "providerEventAt" = ${apply.eventAt},
        "currentPeriodEnd" = COALESCE(${apply.currentPeriodEnd}, "currentPeriodEnd"),
        "updatedAt" = ${now}
      WHERE "providerSubscriptionId" = ${apply.providerSubscriptionId}
        AND ("providerEventAt" IS NULL OR "providerEventAt" <= ${apply.eventAt})
        AND (${apply.kind} = 'replace' OR "status" IN ('incomplete', 'unpaid'))
        AND EXISTS (SELECT 1 FROM claim)
      RETURNING "id"
    ),
    inserted AS (
      INSERT INTO "subscriptions" (
        "id", "userId", "entitlementKey", "status", "priceLookupKey",
        "providerCustomerId", "providerSubscriptionId", "providerEventAt",
        "currentPeriodEnd", "createdAt", "updatedAt"
      )
      SELECT
        ${apply.providerSubscriptionId},
        CAST(${apply.userId} AS text),
        CAST(${apply.entitlementKey} AS text),
        ${apply.status},
        CAST(${apply.priceLookupKey} AS text),
        ${apply.providerCustomerId},
        ${apply.providerSubscriptionId},
        ${apply.eventAt},
        ${apply.currentPeriodEnd},
        ${now},
        ${now}
      WHERE ${statusOnly} = false
        AND EXISTS (SELECT 1 FROM claim)
        AND NOT EXISTS (SELECT 1 FROM updated)
        AND NOT EXISTS (
          SELECT 1 FROM "subscriptions" existing
          WHERE existing."providerSubscriptionId" = ${apply.providerSubscriptionId}
        )
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id"
    )
    UPDATE "user" AS account SET "providerCustomerId" = CAST(${apply.providerCustomerId} AS text)
    WHERE CAST(${apply.providerCustomerId} AS text) IS NOT NULL
      AND account."providerCustomerId" IS NULL
      AND EXISTS (SELECT 1 FROM claim)
      AND NOT EXISTS (
        SELECT 1 FROM "user" AS taken
        WHERE taken."providerCustomerId" = CAST(${apply.providerCustomerId} AS text)
      )
      AND (
        (CAST(${apply.userId} AS text) IS NOT NULL AND account."id" = CAST(${apply.userId} AS text))
        OR account."id" IN (
          SELECT "userId" FROM "subscriptions" WHERE "providerSubscriptionId" = ${apply.providerSubscriptionId}
        )
      )
  `);
}
