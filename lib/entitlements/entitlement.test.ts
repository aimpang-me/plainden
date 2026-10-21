import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, expect, test } from "vitest";
import { subscription, user } from "../../db/schema";
import { LimitKind } from "../contract/limits";
import { getDb } from "../db/client";
import { checkLimit } from "./check-limit";
import { getEntitlement } from "./get-entitlement";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("a free device cannot send a pdf larger than 25 MB", async () => {
  const over = await checkLimit({ deviceId: "dev_1" }, "pdf", LimitKind.fileSize, 26_214_401);
  expect(over).toEqual({ ok: false, plan: "free", kind: "fileSize", limit: 26_214_400, reason: "free fileSize allows 26214400" });
  expect(await checkLimit({ deviceId: "dev_1" }, "pdf", LimitKind.fileSize, 1)).toEqual({ ok: true });
});

test("an unknown entitlement is blocked", async () => {
  expect(await checkLimit({ deviceId: "dev_1" }, "missing", LimitKind.perDay, 1)).toEqual({
    ok: false,
    plan: "free",
    kind: "unknown",
    limit: 0,
    reason: "unknown entitlement missing",
  });
});

test("an active subscription and the all-tools plan pass, a canceled plan stays free", async () => {
  const db = await freshDb();
  const now = new Date("2026-10-20T00:00:00.000Z");
  await db.insert(user).values([
    { id: "user_pdf", name: "Ada", email: "ada@example.com", emailVerified: true, createdAt: now, updatedAt: now },
    { id: "user_all", name: "Bea", email: "bea@example.com", emailVerified: true, createdAt: now, updatedAt: now },
    { id: "user_old", name: "Cam", email: "cam@example.com", emailVerified: false, createdAt: now, updatedAt: now },
  ]);
  await db.insert(subscription).values([
    {
      id: "sub_pdf",
      userId: "user_pdf",
      entitlementKey: "pdf",
      status: "active",
      priceLookupKey: "plainden_pdf_month",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "sub_all",
      userId: "user_all",
      entitlementKey: "all",
      status: "trialing",
      priceLookupKey: "plainden_all_month",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "sub_old",
      userId: "user_old",
      entitlementKey: "pdf",
      status: "canceled",
      priceLookupKey: "plainden_pdf_month",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  expect(await getEntitlement({ userId: "user_pdf" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "paid" });
  expect(await checkLimit({ userId: "user_pdf" }, "pdf", LimitKind.fileSize, 30_000_000)).toEqual({ ok: true });
  expect(await checkLimit({ userId: "user_pdf" }, "pdf", LimitKind.fileSize, 209_715_201)).toEqual({
    ok: false,
    plan: "paid",
    kind: "fileSize",
    limit: 209_715_200,
    reason: "paid fileSize allows 209715200",
  });
  expect(await getEntitlement({ userId: "user_all" }, "image")).toEqual({ entitlementKey: "image", plan: "paid" });
  expect(await getEntitlement({ userId: "user_old" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "free" });
  expect(await getEntitlement({ deviceId: "dev_9" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "free" });
  const stored = await db.select({ status: subscription.status }).from(subscription).where(eq(subscription.id, "sub_pdf"));
  expect(stored).toEqual([{ status: "active" }]);
});

async function freshDb() {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-"));
  dirs.push(dir);
  process.env.PGLITE_DATA_DIR = dir;
  return getDb();
}
