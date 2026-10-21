import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { checkoutIntent } from "../../db/schema";
import type { AppDatabase } from "../db/client";
import { CheckoutError } from "./errors";

const openForMs = 30 * 60 * 1000;
const waitForMs = 10_000;
const pollMs = 20;

export type CheckoutClaim =
  | { kind: "owner"; id: string }
  | { kind: "reuse"; transactionId: string }
  | { kind: "wait" };

type IntentRow = {
  id: string;
  transactionId: string | null;
  expiresAt: Date;
};

export async function claimCheckoutIntent(
  db: AppDatabase,
  userId: string,
  priceLookupKey: string,
  now = new Date(),
): Promise<CheckoutClaim> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const claim = await insertIntent(db, userId, priceLookupKey, attempt === 0 ? now : new Date());
    if (claim.kind !== "retry") return claim;
  }
  throw new CheckoutError("upstream", "Checkout is already in progress");
}

export async function bindCheckoutIntent(
  db: AppDatabase,
  id: string,
  transactionId: string,
  now = new Date(),
): Promise<void> {
  const expiresAt = new Date(now.getTime() + openForMs);
  await db.update(checkoutIntent).set({ transactionId, expiresAt }).where(eq(checkoutIntent.id, id));
}

async function insertIntent(
  db: AppDatabase,
  userId: string,
  priceLookupKey: string,
  now: Date,
): Promise<CheckoutClaim | { kind: "retry" }> {
  const id = randomUUID();
  const expiresAt = new Date(now.getTime() + openForMs);
  const claimed = await db.execute(sql`
    INSERT INTO "checkout_intents" ("id", "userId", "priceLookupKey", "transactionId", "createdAt", "expiresAt")
    VALUES (${id}, ${userId}, ${priceLookupKey}, NULL, ${now}, ${expiresAt})
    ON CONFLICT ("userId", "priceLookupKey") DO UPDATE
    SET
      "id" = excluded."id",
      "transactionId" = NULL,
      "createdAt" = excluded."createdAt",
      "expiresAt" = excluded."expiresAt"
    WHERE "checkout_intents"."expiresAt" <= ${now}
    RETURNING "id", "transactionId"
  `);
  const row = claimedRow(claimed.rows[0]);
  if (row?.id === id) return { kind: "owner", id };
  if (row?.transactionId) return { kind: "reuse", transactionId: row.transactionId };
  const existing = await readIntent(db, userId, priceLookupKey);
  if (!existing || existing.expiresAt.getTime() <= now.getTime()) {
    await db.execute(sql`
      DELETE FROM "checkout_intents"
      WHERE "userId" = ${userId} AND "priceLookupKey" = ${priceLookupKey} AND "expiresAt" <= ${now}
    `);
    return { kind: "retry" };
  }
  if (existing.transactionId) return { kind: "reuse", transactionId: existing.transactionId };
  return { kind: "wait" };
}

export async function releaseCheckoutIntent(db: AppDatabase, id: string): Promise<void> {
  await db.execute(sql`
    DELETE FROM "checkout_intents"
    WHERE "id" = ${id} AND "transactionId" IS NULL
  `);
}

export async function waitForCheckoutTransaction(
  db: AppDatabase,
  userId: string,
  priceLookupKey: string,
): Promise<{ kind: "reuse"; transactionId: string } | { kind: "released" }> {
  const deadline = Date.now() + waitForMs;
  while (Date.now() <= deadline) {
    const existing = await readIntent(db, userId, priceLookupKey);
    if (existing?.transactionId) return { kind: "reuse", transactionId: existing.transactionId };
    if (!existing) return { kind: "released" };
    await delay(pollMs);
  }
  throw new CheckoutError("upstream", "Checkout is already in progress");
}

async function readIntent(db: AppDatabase, userId: string, priceLookupKey: string): Promise<IntentRow | null> {
  const result = await db.execute(sql`
    SELECT "id", "transactionId", "expiresAt"
    FROM "checkout_intents"
    WHERE "userId" = ${userId} AND "priceLookupKey" = ${priceLookupKey}
  `);
  return intentRow(result.rows[0]);
}

function claimedRow(value: unknown): { id: string; transactionId: string | null } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { id?: unknown; transactionId?: unknown };
  if (typeof row.id !== "string") return null;
  return { id: row.id, transactionId: textOrNull(row.transactionId) };
}

function intentRow(value: unknown): IntentRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { id?: unknown; transactionId?: unknown; expiresAt?: unknown };
  if (typeof row.id !== "string") return null;
  const expiresAt = row.expiresAt instanceof Date ? row.expiresAt : new Date(String(row.expiresAt));
  if (Number.isNaN(expiresAt.getTime())) return null;
  return { id: row.id, transactionId: textOrNull(row.transactionId), expiresAt };
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
