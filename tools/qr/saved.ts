import { and, count, desc, eq, sql } from "drizzle-orm";
import { qrCode } from "@/db/schema";
import { LimitKind } from "@/lib/contract/limits";
import { getDb } from "@/lib/db/client";
import { checkLimit } from "@/lib/entitlements";
import { config } from "./config";
import {
  parseCodeId,
  parseTargetUrl,
  type Actor,
  type CodeId,
  type Command,
  type HandleResult,
  type HttpUrl,
  type LogoDataUrl,
  type SavedCode,
  type ScanResult,
} from "./contract";

function shortPath(id: CodeId): string {
  return `/q/${id}`;
}

function toCode(row: {
  id: string;
  targetUrl: string;
  scanCount: number;
  logoDataUrl: string | null;
  createdAt: Date;
}): SavedCode {
  const id = row.id as CodeId;
  return {
    id,
    shortPath: shortPath(id),
    targetUrl: row.targetUrl as HttpUrl,
    scanCount: row.scanCount,
    logo: row.logoDataUrl as LogoDataUrl | null,
    createdAt: row.createdAt.toISOString(),
  };
}

function isForeignKeyError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("foreign key");
}

async function observedCount(userId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db.select({ total: count() }).from(qrCode).where(eq(qrCode.userId, userId));
  return Number(row?.total ?? 0);
}

export async function handle(actor: Actor, command: Command): Promise<HandleResult> {
  if (!actor) return { ok: false, code: "signed-out", reason: "Sign in to publish a dynamic code." };
  switch (command.type) {
    case "list":
      return list(actor.id);
    case "publish":
      return publish(actor.id, command.targetUrl, command.logo);
    case "replace":
      return replace(actor.id, command.id, command.targetUrl, command.logo);
    case "remove":
      return remove(actor.id, command.id);
    default: {
      const unreachable: never = command;
      return unreachable;
    }
  }
}

async function list(userId: string): Promise<HandleResult> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(qrCode)
    .where(eq(qrCode.userId, userId))
    .orderBy(desc(qrCode.createdAt));
  return { ok: true, type: "list", codes: rows.map(toCode) };
}

async function publish(userId: string, targetUrl: HttpUrl, logo: LogoDataUrl | null): Promise<HandleResult> {
  const observed = await observedCount(userId);
  const decision = await checkLimit({ userId }, config.entitlementKey, LimitKind.savedItems, observed + 1);
  if (!decision.ok) return { ok: false, code: "over-cap", reason: decision.reason };
  const db = await getDb();
  const id = crypto.randomUUID();
  try {
    await db.insert(qrCode).values({
      id,
      userId,
      targetUrl,
      logoDataUrl: logo,
      createdAt: new Date(),
    });
  } catch (error) {
    if (isForeignKeyError(error)) return { ok: false, code: "invalid", reason: "unknown user" };
    throw error;
  }
  const [row] = await db.select().from(qrCode).where(eq(qrCode.id, id));
  if (!row) return { ok: false, code: "invalid", reason: "unknown user" };
  return { ok: true, type: "publish", code: toCode(row) };
}

async function replace(
  userId: string,
  id: CodeId,
  targetUrl: HttpUrl,
  logo: LogoDataUrl | null,
): Promise<HandleResult> {
  const observed = await observedCount(userId);
  const decision = await checkLimit({ userId }, config.entitlementKey, LimitKind.savedItems, observed);
  if (!decision.ok) return { ok: false, code: "over-cap", reason: decision.reason };
  const db = await getDb();
  const updated = await db
    .update(qrCode)
    .set({ targetUrl, logoDataUrl: logo })
    .where(and(eq(qrCode.id, id), eq(qrCode.userId, userId)))
    .returning();
  const row = updated[0];
  if (!row) return { ok: false, code: "missing", reason: "That code is not yours." };
  return { ok: true, type: "replace", code: toCode(row) };
}

async function remove(userId: string, id: CodeId): Promise<HandleResult> {
  const db = await getDb();
  await db.delete(qrCode).where(and(eq(qrCode.id, id), eq(qrCode.userId, userId)));
  return { ok: true, type: "remove" };
}

export async function recordScan(id: string): Promise<ScanResult> {
  const parsed = parseCodeId(id);
  if (!parsed.ok) return { ok: false };
  const db = await getDb();
  const existing = await db.select({ targetUrl: qrCode.targetUrl }).from(qrCode).where(eq(qrCode.id, parsed.id));
  const current = existing[0];
  if (!current) return { ok: false };
  const target = parseTargetUrl(current.targetUrl);
  if (!target.ok) return { ok: false };
  const updated = await db
    .update(qrCode)
    .set({ scanCount: sql`${qrCode.scanCount} + 1` })
    .where(eq(qrCode.id, parsed.id))
    .returning();
  const row = updated[0];
  if (!row) return { ok: false };
  return { ok: true, targetUrl: target.url, scanCount: row.scanCount };
}
