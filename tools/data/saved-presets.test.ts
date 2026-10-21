import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { subscription, user } from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { defaultOptions } from "./convert";
import { deleteSavedPreset, listSavedPresets, saveSavedPreset } from "./saved-presets";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function freshDb() {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-presets-"));
  dirs.push(dir);
  process.env.PGLITE_DATA_DIR = dir;
  return getDb();
}

test("a free account cannot save a preset and a paid account can replace one", async () => {
  const db = await freshDb();
  const now = new Date("2026-10-20T00:00:00.000Z");
  await db.insert(user).values({
    id: "user_data",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  expect(await saveSavedPreset("user_data", { name: "Europe", options: defaultOptions })).toEqual({
    ok: false,
    error: "limit",
    message: "Saved presets are on the paid plan.",
  });
  await db.insert(subscription).values({
    id: "sub_data",
    userId: "user_data",
    entitlementKey: "data",
    status: "active",
    priceLookupKey: "plainden_data_month",
    createdAt: now,
    updatedAt: now,
  });
  const saved = await saveSavedPreset("user_data", { name: " Europe ", options: { ...defaultOptions, delimiter: ";" } });
  expect(saved.ok).toBe(true);
  if (!saved.ok) return;
  const replaced = await saveSavedPreset("user_data", { name: "Europe", options: defaultOptions });
  expect(replaced).toEqual({ ok: true, id: saved.id });
  expect(await listSavedPresets("user_data")).toEqual([{ name: "Europe", options: defaultOptions }]);
  expect(await deleteSavedPreset("user_data", { name: "Europe" })).toEqual({ ok: true, id: "Europe" });
  expect(await listSavedPresets("user_data")).toEqual([]);
});
