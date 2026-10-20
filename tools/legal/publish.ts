import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { policyDoc } from "@/db/schema";
import { LimitKind } from "@/lib/contract/limits";
import { getDb } from "@/lib/db/client";
import { checkLimit } from "@/lib/entitlements";
import { hostedDocument } from "./catalog";

export type PublishResult =
  | { ok: true; publicId: string; path: string }
  | { ok: false; error: "invalid"; message: string }
  | { ok: false; error: "limit"; message: string };

const publicIdPattern = /^[0-9a-f]{32}$/;

function policyPublicId(userId: string, kind: string): string {
  return createHash("sha256").update(`plainden-policy:v1:${userId}:${kind}`).digest("hex").slice(0, 32);
}

function policyPath(publicId: string): string {
  return `/p/${publicId}`;
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
  if (!decision.ok) return { ok: false, error: "limit", message: decision.reason };
  const path = policyPath(publicId);
  if (existing && existing.body === hosted.text) return { ok: true, publicId, path };
  const now = new Date();
  const next = { body: hosted.text, kind: hosted.kind, publishedAt: now, updatedAt: now };
  if (existing) {
    await db.update(policyDoc).set(next).where(eq(policyDoc.id, publicId));
    return { ok: true, publicId, path };
  }
  try {
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
  if (!publicIdPattern.test(publicId)) return null;
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
