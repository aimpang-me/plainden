import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { checkoutIntent } from "../../db/schema";
import type { AppDatabase } from "../db/client";
import { CheckoutError } from "./errors";
import { record, text } from "./json";

const waitForMs = 10_000;
const pollMs = 250;

export type AcquiredCheckout = { ownerId: string } | { transactionId: string };

export async function acquireCheckout(db: AppDatabase, userId: string, priceLookupKey: string): Promise<AcquiredCheckout> {
  const deadline = Date.now() + waitForMs;
  for (;;) {
    const claimed = await claimOnce(db, userId, priceLookupKey);
    if (claimed.kind === "owner") return { ownerId: claimed.id };
    if (claimed.kind === "reuse") return { transactionId: claimed.transactionId };
    if (Date.now() >= deadline) throw new CheckoutError("upstream", "Checkout is already in progress");
    await delay(pollMs);
  }
}

export async function bindCheckoutIntent(db: AppDatabase, id: string, transactionId: string): Promise<void> {
  await db.execute(sql`
    UPDATE "checkout_intents"
    SET "transactionId" = ${transactionId}, "expiresAt" = now() + interval '30 minutes'
    WHERE "id" = ${id}
  `);
}

export async function releaseCheckoutIntent(db: AppDatabase, id: string): Promise<void> {
  await db.execute(sql`
    DELETE FROM "checkout_intents"
    WHERE "id" = ${id} AND "transactionId" IS NULL
  `);
}

type ClaimOnce = { kind: "owner"; id: string } | { kind: "reuse"; transactionId: string } | { kind: "wait" };

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
    throw new CheckoutError("open-checkout", "Finish or cancel your open checkout first.");
  }
  if (existing.transactionId) return { kind: "reuse", transactionId: existing.transactionId };
  return { kind: "wait" };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
