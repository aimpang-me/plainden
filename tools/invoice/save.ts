import { desc, eq, sql } from "drizzle-orm";
import { savedInvoice } from "@/db/schema";
import { LimitKind } from "@/lib/contract/limits";
import { getDb } from "@/lib/db/client";
import { checkLimit } from "@/lib/entitlements/check-limit";
import { getEntitlement } from "@/lib/entitlements/get-entitlement";
import { limitsFor } from "@/lib/entitlements/limits-for";
import { visitorLimitCopy } from "@/lib/entitlements/visitor-copy";
import { parseIssued, titleOf, toWire, type Issued } from "./document";
import type { ToolId } from "./month-count";

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: "invalid"; message: string }
  | { ok: false; error: "limit"; message: string }
  | { ok: false; error: "not-found"; message: string };

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function canonical(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isRecord(value)) return value;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) sorted[key] = sortValue(value[key]);
  return sorted;
}

export async function saveDocument(userId: string, input: unknown): Promise<SaveResult> {
  if (!isRecord(input) || typeof input.id !== "string" || !idPattern.test(input.id)) {
    return { ok: false, error: "invalid", message: "Send an id and a document." };
  }
  const parsed = parseIssued(input.document);
  if (!parsed.ok) return { ok: false, error: "invalid", message: parsed.issues[0]?.message ?? "Invalid document." };
  const db = await getDb();
  const existing = await db.select().from(savedInvoice).where(eq(savedInvoice.id, input.id));
  const row = existing[0];
  if (row && row.userId !== userId) return { ok: false, error: "not-found", message: "Document not found." };
  const owned = await db.select({ id: savedInvoice.id }).from(savedInvoice).where(eq(savedInvoice.userId, userId));
  const amount = owned.some((item) => item.id === input.id) ? owned.length : owned.length + 1;
  const decision = await checkLimit({ userId }, "invoice", LimitKind.savedItems, amount);
  if (!decision.ok) return { ok: false, error: "limit", message: visitorLimitCopy(parsed.issued.kind, decision) };
  const body = toWire(parsed.issued);
  if (row && canonical(row.body) === canonical(body)) return { ok: true, id: row.id };
  const now = new Date();
  if (row) {
    await db.update(savedInvoice).set({ title: titleOf(parsed.issued), body, updatedAt: now }).where(eq(savedInvoice.id, row.id));
    return { ok: true, id: row.id };
  }
  const entitlement = await getEntitlement({ userId }, "invoice");
  const limits = limitsFor("invoice");
  const cap = (entitlement.plan === "paid" ? limits?.paid : limits?.free)?.savedItems;
  if (typeof cap !== "number") {
    await db.insert(savedInvoice).values({
      id: input.id,
      userId,
      title: titleOf(parsed.issued),
      body,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, id: input.id };
  }
  const inserted = await db.execute(sql`
    WITH room AS (
      SELECT count(*)::int AS total FROM "saved_invoices" WHERE "userId" = ${userId}
    )
    INSERT INTO "saved_invoices" ("id", "userId", "title", "body", "createdAt", "updatedAt")
    SELECT ${input.id}, ${userId}, ${titleOf(parsed.issued)}, ${JSON.stringify(body)}::jsonb, ${now}, ${now}
    FROM room
    WHERE room.total < ${cap}
    RETURNING "id"
  `);
  if (!insertedId(inserted)) {
    return {
      ok: false,
      error: "limit",
      message: visitorLimitCopy(parsed.issued.kind, {
        plan: entitlement.plan,
        kind: LimitKind.savedItems,
        limit: cap,
      }),
    };
  }
  return { ok: true, id: input.id };
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

export async function listDocuments(userId: string, kind: ToolId): Promise<readonly Issued[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(savedInvoice)
    .where(eq(savedInvoice.userId, userId))
    .orderBy(desc(savedInvoice.updatedAt));
  const documents: Issued[] = [];
  for (const row of rows) {
    const parsed = parseIssued(row.body);
    if (parsed.ok && parsed.issued.kind === kind) documents.push(parsed.issued);
  }
  return documents;
}

export async function readDocument(userId: string, id: string): Promise<Issued | null> {
  const db = await getDb();
  const rows = await db.select().from(savedInvoice).where(eq(savedInvoice.id, id));
  const row = rows[0];
  if (!row || row.userId !== userId) return null;
  const parsed = parseIssued(row.body);
  return parsed.ok ? parsed.issued : null;
}

export async function deleteDocument(userId: string, id: string): Promise<{ ok: true }> {
  const db = await getDb();
  const rows = await db.select().from(savedInvoice).where(eq(savedInvoice.id, id));
  const row = rows[0];
  if (row?.userId === userId) await db.delete(savedInvoice).where(eq(savedInvoice.id, id));
  return { ok: true };
}

export function toResponse(result: SaveResult): Response {
  if (result.ok) return Response.json(result);
  const status = result.error === "not-found" ? 404 : result.error === "limit" ? 403 : 400;
  return Response.json(result, { status });
}
