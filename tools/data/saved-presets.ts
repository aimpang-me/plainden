import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getEntitlement } from "@/lib/entitlements/get-entitlement";
import { acceptedPreset, type SavedPreset } from "./presets";
import { dataPreset } from "./schema";

const presetCap = 20;
const paidReason = "Saved presets are on the paid plan.";
const capReason = "You can save 20 presets.";

export type SavedPresetResult =
  | { ok: true; id: string }
  | { ok: false; error: "invalid" | "limit"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function listSavedPresets(userId: string): Promise<readonly SavedPreset[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(dataPreset)
    .where(eq(dataPreset.userId, userId))
    .orderBy(desc(dataPreset.updatedAt));
  const presets: SavedPreset[] = [];
  for (const row of rows) {
    if (typeof row.name !== "string") continue;
    const accepted = acceptedPreset(row.name, row.options);
    if (accepted.ok) presets.push({ name: accepted.name, options: accepted.options });
  }
  return presets;
}

export async function saveSavedPreset(userId: string, input: unknown): Promise<SavedPresetResult> {
  if (!isRecord(input) || typeof input.name !== "string") {
    return { ok: false, error: "invalid", message: "Name the preset." };
  }
  const accepted = acceptedPreset(input.name, input.options);
  if (!accepted.ok) return { ok: false, error: "invalid", message: accepted.reason };
  const entitlement = await getEntitlement({ userId }, "data");
  if (entitlement.plan !== "paid") return { ok: false, error: "limit", message: paidReason };
  const db = await getDb();
  const owned = await db.select().from(dataPreset).where(eq(dataPreset.userId, userId));
  const existing = owned.find((row) => row.name === accepted.name);
  if (!existing && owned.length >= presetCap) return { ok: false, error: "limit", message: capReason };
  const now = new Date();
  if (existing) {
    await db
      .update(dataPreset)
      .set({ options: accepted.options, updatedAt: now })
      .where(eq(dataPreset.id, existing.id));
    return { ok: true, id: existing.id };
  }
  const id = crypto.randomUUID();
  await db.insert(dataPreset).values({
    id,
    userId,
    name: accepted.name,
    options: accepted.options,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, id };
}

export function toPresetResponse(result: SavedPresetResult): Response {
  if (result.ok) return Response.json(result);
  const status = result.error === "limit" ? 403 : 400;
  return Response.json(result, { status });
}
