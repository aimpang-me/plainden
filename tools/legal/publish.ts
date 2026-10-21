import { createHmac } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { policyDoc } from "@/db/schema";
import { LimitKind } from "@/lib/contract/limits";
import { getDb } from "@/lib/db/client";
import { checkLimit } from "@/lib/entitlements";
import { getEntitlement } from "@/lib/entitlements/get-entitlement";
import { limitsFor } from "@/lib/entitlements/limits-for";
import { visitorLimitCopy } from "@/lib/entitlements/visitor-copy";
import { isProductionRuntime } from "@/lib/runtime";
import { hostedDocument } from "./catalog";
import { isPolicyPublicId } from "./public-id";

export type PublishResult =
  | { ok: true; publicId: string; path: string }
  | { ok: false; error: "invalid"; message: string }
  | { ok: false; error: "limit"; message: string };

const devPolicySecret = "plainden-dev-policy-id-secret";

function policyIdSecret(): string {
  const secret = process.env.POLICY_ID_SECRET?.trim() ?? "";
  if (secret.length >= 16) return secret;
  if (isProductionRuntime()) throw new Error("POLICY_ID_SECRET is required in production");
  return devPolicySecret;
}

function policyPublicId(userId: string, kind: string): string {
  return createHmac("sha256", policyIdSecret()).update(`${userId}:${kind}`).digest("hex").slice(0, 32);
}

function policyPath(publicId: string): string {
  return `/p/${publicId}`;
}

function insertedId(result: unknown): string | null {
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)
      ? result.rows
      : [];
  const first = rows[0];
  if (!first || typeof first !== "object" || !("id" in first)) return null;
  return typeof first.id === "string" ? first.id : null;
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  if ("cause" in error) return isUniqueViolation(error.cause);
  return false;
}

export async function publish(userId: string, raw: unknown): Promise<PublishResult> {
  const hosted = hostedDocument(raw);
  if (!hosted.ok) return { ok: false, error: "invalid", message: hosted.message };
  const publicId = policyPublicId(userId, hosted.kind);
  const db = await getDb();
  const owned = await db.select().from(policyDoc).where(eq(policyDoc.userId, userId));
  const existing = owned.find((row) => row.id === publicId);
  const amount = existing ? owned.length : owned.length + 1;
  const decision = await checkLimit({ userId }, "legal", LimitKind.savedItems, amount);
  if (!decision.ok) return { ok: false, error: "limit", message: visitorLimitCopy("policy", decision) };
  const path = policyPath(publicId);
  if (existing && existing.body === hosted.text) return { ok: true, publicId, path };
  const now = new Date();
  const next = { body: hosted.text, kind: hosted.kind, publishedAt: now, updatedAt: now };
  if (existing) {
    await db.update(policyDoc).set(next).where(eq(policyDoc.id, publicId));
    return { ok: true, publicId, path };
  }
  const entitlement = await getEntitlement({ userId }, "legal");
  const limits = limitsFor("legal");
  const cap = (entitlement.plan === "paid" ? limits?.paid : limits?.free)?.savedItems;
  try {
    if (typeof cap === "number") {
      const inserted = await db.execute(sql`
        WITH room AS (
          SELECT count(*)::int AS total FROM "policy_docs" WHERE "userId" = ${userId}
        )
        INSERT INTO "policy_docs" ("id", "userId", "kind", "publicId", "body", "publishedAt", "createdAt", "updatedAt")
        SELECT ${publicId}, ${userId}, ${hosted.kind}, ${publicId}, ${hosted.text}, ${now}, ${now}, ${now}
        FROM room
        WHERE room.total < ${cap}
        RETURNING "id"
      `);
      if (!insertedId(inserted)) {
        return { ok: false, error: "limit", message: visitorLimitCopy("policy", { ok: false, plan: entitlement.plan, kind: LimitKind.savedItems, limit: cap, reason: "" }) };
      }
    } else {
      await db.insert(policyDoc).values({
        id: publicId,
        userId,
        kind: hosted.kind,
        publicId,
        body: hosted.text,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const rows = await db.select().from(policyDoc).where(eq(policyDoc.publicId, publicId));
    const row = rows[0];
    if (!row || row.userId !== userId) throw error;
    if (row.body !== hosted.text) {
      await db.update(policyDoc).set(next).where(eq(policyDoc.publicId, publicId));
    }
  }
  return { ok: true, publicId, path };
}

export async function readPublished(publicId: string): Promise<{ text: string } | null> {
  if (!isPolicyPublicId(publicId)) return null;
  const db = await getDb();
  const rows = await db.select().from(policyDoc).where(eq(policyDoc.publicId, publicId));
  const row = rows[0];
  if (!row?.publishedAt) return null;
  return { text: row.body };
}

export async function readOwned(userId: string, kind: string): Promise<{ publicId: string; path: string } | null> {
  const publicId = policyPublicId(userId, kind);
  const db = await getDb();
  const rows = await db.select().from(policyDoc).where(eq(policyDoc.id, publicId));
  const row = rows[0];
  if (!row || row.userId !== userId || !row.publishedAt) return null;
  return { publicId, path: policyPath(publicId) };
}

export function toPolicyResponse(result: PublishResult): Response {
  if (result.ok) return Response.json(result);
  switch (result.error) {
    case "invalid":
      return Response.json(result, { status: 400 });
    case "limit":
      return Response.json(result, { status: 403 });
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
