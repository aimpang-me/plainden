import { desc, eq } from "drizzle-orm";
import { savedInvoice } from "@/db/schema";
import { LimitKind } from "@/lib/contract/limits";
import { getDb } from "@/lib/db/client";
import { checkLimit } from "@/lib/entitlements/check-limit";
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
  if (!decision.ok) return { ok: false, error: "limit", message: decision.reason };
  const body = toWire(parsed.issued);
  if (row && canonical(row.body) === canonical(body)) return { ok: true, id: row.id };
  const now = new Date();
  if (row) {
    await db.update(savedInvoice).set({ title: titleOf(parsed.issued), body, updatedAt: now }).where(eq(savedInvoice.id, row.id));
    return { ok: true, id: row.id };
  }
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
