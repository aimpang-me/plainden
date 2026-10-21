import { sql } from "drizzle-orm";
import { getDb } from "../db/client";
import type { ScheduledCancel, SubscriptionApply } from "./subscription";

export type PersistOutcome = "applied" | "duplicate" | "unchanged" | "deferred";

export async function persistSubscription(apply: Exclude<SubscriptionApply, { kind: "ignore" }>): Promise<PersistOutcome> {
  const db = await getDb();
  const now = new Date();
  const statusOnly = apply.userId === null || apply.entitlementKey === null || apply.priceLookupKey === null;
  const cancel = cancelColumn(apply.scheduledCancel);
  const result = await db.execute(sql`
    WITH seen AS (
      SELECT 1 FROM "processed_events" WHERE "id" = ${apply.eventId}
    ),
    known AS (
      SELECT 1 FROM "subscriptions" WHERE "providerSubscriptionId" = ${apply.providerSubscriptionId}
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
        "cancelAt" = CASE WHEN ${cancel.keep} THEN "cancelAt" ELSE ${cancel.cancelAt} END,
        "updatedAt" = ${now}
      WHERE "providerSubscriptionId" = ${apply.providerSubscriptionId}
        AND ("providerEventAt" IS NULL OR "providerEventAt" <= ${apply.eventAt})
        AND (${apply.kind} = 'replace' OR "status" IN ('incomplete', 'unpaid'))
        AND NOT EXISTS (SELECT 1 FROM seen)
      RETURNING "id"
    ),
    inserted AS (
      INSERT INTO "subscriptions" (
        "id", "userId", "entitlementKey", "status", "priceLookupKey",
        "providerCustomerId", "providerSubscriptionId", "providerEventAt",
        "currentPeriodEnd", "cancelAt", "createdAt", "updatedAt"
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
        ${cancel.cancelAt},
        ${now},
        ${now}
      WHERE ${statusOnly} = false
        AND NOT EXISTS (SELECT 1 FROM seen)
        AND NOT EXISTS (SELECT 1 FROM known)
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id"
    ),
    claim AS (
      INSERT INTO "processed_events" ("id", "occurredAt")
      SELECT ${apply.eventId}, ${apply.eventAt}
      WHERE EXISTS (SELECT 1 FROM updated) OR EXISTS (SELECT 1 FROM inserted)
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id"
    ),
    account AS (
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
      RETURNING account."id"
    )
    SELECT
      EXISTS (SELECT 1 FROM claim) AS "applied",
      EXISTS (SELECT 1 FROM seen) AS "duplicate",
      EXISTS (SELECT 1 FROM known) AS "known"
  `);
  return outcome(result.rows[0]);
}

function outcome(row: unknown): PersistOutcome {
  const flags = (row ?? {}) as { applied?: unknown; duplicate?: unknown; known?: unknown };
  if (flags.applied === true) return "applied";
  if (flags.duplicate === true) return "duplicate";
  if (flags.known === true) return "unchanged";
  return "deferred";
}

function cancelColumn(scheduled: ScheduledCancel): { keep: boolean; cancelAt: Date | null } {
  switch (scheduled.kind) {
    case "unchanged":
      return { keep: true, cancelAt: null };
    case "clear":
      return { keep: false, cancelAt: null };
    case "cancel":
      return { keep: false, cancelAt: scheduled.effectiveAt };
    default: {
      const unreachable: never = scheduled;
      throw new Error(`unknown scheduled cancel ${unreachable}`);
    }
  }
}
