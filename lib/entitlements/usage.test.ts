import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, expect, test } from "vitest";
import { subscription, usage, user } from "../../db/schema";
import { LimitKind } from "../contract/limits";
import { getDb } from "../db/client";
import { checkLimit } from "./check-limit";
import { usagePeriod } from "./period";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("a free monthly counter blocks at 3 and a later period starts at zero", async () => {
  const db = await freshDb();
  const period = monthPeriod();
  const subject = { deviceId: "dev_invoice" } as const;
  expect(await checkLimit(subject, "invoice", LimitKind.perMonth, 1)).toEqual({ ok: true });
  expect(await checkLimit(subject, "invoice", LimitKind.perMonth, 1)).toEqual({ ok: true });
  expect(await checkLimit(subject, "invoice", LimitKind.perMonth, 1)).toEqual({ ok: true });
  expect(await checkLimit(subject, "invoice", LimitKind.perMonth, 1)).toEqual({
    ok: false,
    limit: 3,
    reason: "free perMonth allows 3",
  });
  const blocked = await db.select({ count: usage.count, period: usage.period }).from(usage).where(eq(usage.deviceId, "dev_invoice"));
  expect(blocked).toEqual([{ count: 3, period }]);

  await db.insert(usage).values({
    id: "usage_old",
    deviceId: "dev_reset",
    entitlementKey: "invoice",
    kind: LimitKind.perMonth,
    period: "1999-01",
    count: 99,
    updatedAt: new Date("1999-01-01T00:00:00.000Z"),
  });
  expect(await checkLimit({ deviceId: "dev_reset" }, "invoice", LimitKind.perMonth, 1)).toEqual({ ok: true });
  const reset = await db
    .select({ count: usage.count, period: usage.period })
    .from(usage)
    .where(eq(usage.deviceId, "dev_reset"));
  expect(reset.sort((left, right) => left.period.localeCompare(right.period))).toEqual([
    { count: 99, period: "1999-01" },
    { count: 1, period },
  ]);
});

test("a paid counter passes where the free counter is already full", async () => {
  const db = await freshDb();
  const now = new Date("2026-10-20T00:00:00.000Z");
  const period = monthPeriod();
  await db.insert(user).values({
    id: "user_paid",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(subscription).values({
    id: "sub_paid",
    userId: "user_paid",
    entitlementKey: "scaffold",
    status: "active",
    priceLookupKey: "plainden_scaffold_month",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(usage).values({
    id: "usage_paid",
    userId: "user_paid",
    entitlementKey: "scaffold",
    kind: LimitKind.perMonth,
    period,
    count: 3,
    updatedAt: now,
  });
  await db.insert(usage).values({
    id: "usage_free",
    deviceId: "dev_scaffold",
    entitlementKey: "scaffold",
    kind: LimitKind.perMonth,
    period,
    count: 3,
    updatedAt: now,
  });

  expect(await checkLimit({ userId: "user_paid" }, "scaffold", LimitKind.perMonth, 1)).toEqual({ ok: true });
  expect(await checkLimit({ deviceId: "dev_scaffold" }, "scaffold", LimitKind.perMonth, 1)).toEqual({
    ok: false,
    limit: 3,
    reason: "free perMonth allows 3",
  });
  const paid = await db.select({ count: usage.count }).from(usage).where(eq(usage.id, "usage_paid"));
  const free = await db.select({ count: usage.count }).from(usage).where(eq(usage.id, "usage_free"));
  expect(paid).toEqual([{ count: 4 }]);
  expect(free).toEqual([{ count: 3 }]);
});

function monthPeriod(): string {
  const period = usagePeriod(LimitKind.perMonth, new Date());
  if (!period) throw new Error("perMonth has a period");
  return period;
}

async function freshDb() {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-"));
  dirs.push(dir);
  process.env.PGLITE_DATA_DIR = dir;
  return getDb();
}
