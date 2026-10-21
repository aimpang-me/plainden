import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { checkoutIntent } from "../../db/schema";
import type { AppDatabase } from "../db/client";
import { CheckoutError } from "./errors";
import { record, text } from "./json";

const waitForMs = 10_000;
const pollMs = 250;

export type AcquiredCheckout =
  | { kind: "owner"; id: string }
  | { kind: "reuse"; transactionId: string }
  | { kind: "switch"; intentId: string; transactionId: string; priceLookupKey: string };

export async function acquireCheckout(db: AppDatabase, userId: string, priceLookupKey: string): Promise<AcquiredCheckout> {
  const deadline = Date.now() + waitForMs;
  for (;;) {
    const claimed = await claimOnce(db, userId, priceLookupKey);
    if (claimed.kind !== "wait") return claimed;
    if (Date.now() >= deadline) throw new CheckoutError("upstream", "Checkout is already in progress");
    await delay(pollMs);
  }
}

export async function takeOverCheckout(
  db: AppDatabase,
  oldId: string,
  transactionId: string,
  priceLookupKey: string,
): Promise<string | null> {
  const id = randomUUID();
  const taken = await db.execute(sql`
    UPDATE "checkout_intents"
    SET
      "id" = ${id},
      "priceLookupKey" = ${priceLookupKey},
      "transactionId" = NULL,
      "createdAt" = now(),
      "expiresAt" = now() + interval '60 seconds'
    WHERE "id" = ${oldId} AND "transactionId" = ${transactionId}
    RETURNING "id"
  `);
  return text(record(taken.rows[0]), "id") === id ? id : null;
}

export async function bindCheckoutIntent(db: AppDatabase, id: string, transactionId: string): Promise<boolean> {
  const updated = await db.execute(sql`
    UPDATE "checkout_intents"
    SET "transactionId" = ${transactionId}, "expiresAt" = now() + interval '30 minutes'
    WHERE "id" = ${id} AND "transactionId" IS NULL
    RETURNING "id"
  `);
  return text(record(updated.rows[0]), "id") === id;
}

export async function releaseCheckoutIntent(db: AppDatabase, id: string): Promise<void> {
  await db.execute(sql`
    DELETE FROM "checkout_intents"
    WHERE "id" = ${id} AND "transactionId" IS NULL
  `);
}

export async function restoreCheckoutIntent(
  db: AppDatabase,
  newId: string,
  old: { id: string; priceLookupKey: string; transactionId: string },
): Promise<boolean> {
  const restored = await db.execute(sql`
    UPDATE "checkout_intents"
    SET
      "id" = ${old.id},
      "priceLookupKey" = ${old.priceLookupKey},
      "transactionId" = ${old.transactionId},
      "expiresAt" = now() + interval '30 minutes'
    WHERE "id" = ${newId} AND "transactionId" IS NULL
    RETURNING "id"
  `);
  return text(record(restored.rows[0]), "id") === old.id;
}

type ClaimOnce = AcquiredCheckout | { kind: "wait" };

async function claimOnce(db: AppDatabase, userId: string, priceLookupKey: string): Promise<ClaimOnce> {
  const id = randomUUID();
  const claimed = await db.execute(sql`
    INSERT INTO "checkout_intents" ("id", "userId", "priceLookupKey", "transactionId", "createdAt", "expiresAt")
    VALUES (${id}, ${userId}, ${priceLookupKey}, NULL, now(), now() + interval '60 seconds')
    ON CONFLICT ("userId") DO UPDATE
    SET
      "id" = excluded."id",
      "priceLookupKey" = excluded."priceLookupKey",
      "transactionId" = NULL,
      "createdAt" = now(),
      "expiresAt" = now() + interval '60 seconds'
    WHERE "checkout_intents"."expiresAt" <= now()
    RETURNING "id", "priceLookupKey", "transactionId"
  `);
  const returned = record(claimed.rows[0]);
  if (text(returned, "id") === id) return { kind: "owner", id };
  const [existing] = await db.select().from(checkoutIntent).where(eq(checkoutIntent.userId, userId)).limit(1);
  if (!existing) return { kind: "wait" };
  if (existing.priceLookupKey !== priceLookupKey) {
    if (!existing.transactionId) throw new CheckoutError("open-checkout", "Finish or cancel your open checkout first.");
    return {
      kind: "switch",
      intentId: existing.id,
      transactionId: existing.transactionId,
      priceLookupKey: existing.priceLookupKey,
    };
  }
  if (existing.transactionId) return { kind: "reuse", transactionId: existing.transactionId };
  return { kind: "wait" };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
