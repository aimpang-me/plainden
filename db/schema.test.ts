import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { getDb } from "../lib/db/client";
import { account, policyDoc, qrCode, savedInvoice, session, usage, user, verification } from "./schema";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("PGlite stores an invoice, a qr code, a policy, and an auth row", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-schema-"));
  dirs.push(dir);
  process.env.PGLITE_DATA_DIR = dir;
  const db = await getDb();
  const now = new Date("2026-10-20T00:00:00.000Z");
  await db.insert(user).values({
    id: "user_1",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(session).values({
    id: "session_1",
    expiresAt: now,
    token: "token_1",
    createdAt: now,
    updatedAt: now,
    userId: "user_1",
  });
  await db.insert(account).values({
    id: "account_1",
    accountId: "ada@example.com",
    providerId: "email",
    userId: "user_1",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(verification).values({
    id: "verification_1",
    identifier: "ada@example.com",
    value: "123456",
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(savedInvoice).values({
    id: "invoice_1",
    userId: "user_1",
    title: "April",
    body: { total: 1200 },
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(qrCode).values({
    id: "qr_1",
    userId: "user_1",
    targetUrl: "https://plainden.com",
    createdAt: now,
  });
  await db.insert(policyDoc).values({
    id: "policy_1",
    userId: "user_1",
    kind: "privacy",
    publicId: "pub_1",
    body: "Not legal advice.",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(usage).values({
    id: "usage_1",
    userId: "user_1",
    entitlementKey: "pdf",
    kind: "perDay",
    period: "2026-10-20",
    updatedAt: now,
  });

  expect(await db.select().from(savedInvoice)).toEqual([
    {
      id: "invoice_1",
      userId: "user_1",
      title: "April",
      body: { total: 1200 },
      createdAt: now,
      updatedAt: now,
    },
  ]);
  expect(await db.select({ scanCount: qrCode.scanCount, targetUrl: qrCode.targetUrl }).from(qrCode)).toEqual([
    { scanCount: 0, targetUrl: "https://plainden.com" },
  ]);
  expect(await db.select({ publicId: policyDoc.publicId, body: policyDoc.body }).from(policyDoc)).toEqual([
    { publicId: "pub_1", body: "Not legal advice." },
  ]);
  expect(await db.select({ count: usage.count, deviceId: usage.deviceId }).from(usage)).toEqual([
    { count: 0, deviceId: null },
  ]);
  expect(await db.select({ token: session.token }).from(session)).toEqual([{ token: "token_1" }]);
  expect(await db.select({ providerId: account.providerId }).from(account)).toEqual([{ providerId: "email" }]);
  expect(await db.select({ value: verification.value }).from(verification)).toEqual([{ value: "123456" }]);

  let caught: unknown;
  try {
    await db.insert(usage).values({
      id: "usage_bad",
      userId: "user_1",
      deviceId: "dev_1",
      entitlementKey: "pdf",
      kind: "perDay",
      period: "2026-10-20",
      count: 1,
      updatedAt: now,
    });
  } catch (error) {
    caught = error;
  }
  const cause = caught instanceof Error ? caught.cause : undefined;
  expect(cause instanceof Error ? cause.message : "").toContain("usage_one_subject");
});
