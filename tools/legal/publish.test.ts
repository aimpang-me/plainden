import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, expect, test } from "vitest";
import { policyDoc, subscription, user } from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { publish, readOwned, readPublished, toPolicyResponse, type PublishResult } from "./publish";

const dirs: string[] = [];
const now = new Date("2026-10-20T12:00:00.000Z");

const answers = {
  businessName: "Northwind Apps",
  contactEmail: "privacy@northwind.example",
  website: "https://northwind.example",
  jurisdiction: "US",
  dataCollected: "account email and crash logs",
  purpose: "to run the app and fix crashes",
  retention: "18 months after the account closes",
};

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function database(): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-legal-"));
  dirs.push(dir);
  process.env.PGLITE_DATA_DIR = dir;
  await getDb();
}

async function seedUser(userId: string, paid: boolean) {
  const db = await getDb();
  await db.insert(user).values({
    id: userId,
    name: "Ada",
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  if (!paid) return;
  await db.insert(subscription).values({
    id: `sub_${userId}`,
    userId,
    entitlementKey: "legal",
    status: "active",
    priceLookupKey: "plainden_legal_month",
    createdAt: now,
    updatedAt: now,
  });
}

function unsaltedPublicId(userId: string, kind: string): string {
  return createHash("sha256").update(`plainden-policy:v1:${userId}:${kind}`).digest("hex").slice(0, 32);
}

function publishedId(result: PublishResult): string {
  if (!result.ok) throw new Error(`expected a published policy, got ${result.error}`);
  return result.publicId;
}

test("response status follows the publish result", async () => {
  const publicId = "a".repeat(32);
  const ok = toPolicyResponse({ ok: true, publicId, path: `/p/${publicId}` });
  expect(ok.status).toBe(200);
  expect(await ok.json()).toEqual({ ok: true, publicId, path: `/p/${publicId}` });
  const invalid = toPolicyResponse({ ok: false, error: "invalid", message: "Unknown kind." });
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ ok: false, error: "invalid", message: "Unknown kind." });
  const limit = toPolicyResponse({ ok: false, error: "limit", message: "Hosting a policy is part of the paid plan." });
  expect(limit.status).toBe(403);
  expect(await limit.json()).toEqual({ ok: false, error: "limit", message: "Hosting a policy is part of the paid plan." });
});

test("a value that is not 32 lowercase hex is not a hosted policy", async () => {
  expect(await readPublished("not-a-policy")).toBeNull();
  expect(await readPublished("A".repeat(32))).toBeNull();
  expect(await readPublished(`${"ab".repeat(15)}GG`)).toBeNull();
});

test("a free user cannot publish a policy", async () => {
  await database();
  await seedUser("user_free", false);
  const result = await publish("user_free", { kind: "privacy", answers });
  expect(result).toEqual({ ok: false, error: "limit", message: "Hosting a policy is part of the paid plan." });
  const db = await getDb();
  expect(await db.select().from(policyDoc)).toEqual([]);
});

test("a paid user keeps one public id through republish, edits, and cancellation", async () => {
  await database();
  await seedUser("user_paid", true);
  const invalid = await publish("user_paid", { kind: "nope" });
  expect(invalid).toEqual({ ok: false, error: "invalid", message: "Unknown kind." });
  const saved = await publish("user_paid", { kind: "privacy", answers });
  const publicId = publishedId(saved);
  expect(publicId).toMatch(/^[0-9a-f]{32}$/);
  expect(publicId).not.toBe(unsaltedPublicId("user_paid", "privacy"));
  expect(saved).toEqual({ ok: true, publicId, path: `/p/${publicId}` });
  const db = await getDb();
  const inserted = await db.select().from(policyDoc);
  expect(inserted).toHaveLength(1);
  expect(inserted[0]?.id).toBe(publicId);
  expect(inserted[0]?.publicId).toBe(publicId);
  expect(inserted[0]?.kind).toBe("privacy");
  expect(inserted[0]?.body.includes("Northwind Apps")).toBe(true);
  expect(inserted[0]?.publishedAt).toBeInstanceOf(Date);
  const hosted = await readPublished(publicId);
  expect(hosted).toEqual({ text: inserted[0]?.body });
  expect(await readOwned("user_paid", "privacy")).toEqual({ publicId, path: `/p/${publicId}` });
  expect(await readOwned("user_paid", "terms")).toBeNull();
  expect(await readPublished("c".repeat(32))).toBeNull();

  const again = await publish("user_paid", { kind: "privacy", answers });
  expect(again).toEqual({ ok: true, publicId, path: `/p/${publicId}` });
  const afterSame = await db.select().from(policyDoc);
  expect(afterSame).toHaveLength(1);
  expect(afterSame[0]?.updatedAt.getTime()).toBe(inserted[0]?.updatedAt.getTime());
  expect(afterSame[0]?.body).toBe(inserted[0]?.body);

  await new Promise((resolve) => setTimeout(resolve, 30));
  const edited = await publish("user_paid", { kind: "privacy", answers: { ...answers, businessName: "Ada Studio" } });
  expect(edited).toEqual({ ok: true, publicId, path: `/p/${publicId}` });
  const afterEdit = await db.select().from(policyDoc);
  expect(afterEdit).toHaveLength(1);
  expect(afterEdit[0]?.id).toBe(publicId);
  expect(afterEdit[0]?.body.includes("Ada Studio")).toBe(true);
  expect(afterEdit[0]?.body.includes("Northwind Apps")).toBe(false);
  expect(afterEdit[0]?.kind).toBe("privacy");
  expect(afterEdit[0]?.updatedAt.getTime()).toBeGreaterThan(inserted[0]?.updatedAt.getTime() ?? 0);
  expect(afterEdit[0]?.publishedAt?.getTime()).toBe(afterEdit[0]?.updatedAt.getTime());
  const editedText = afterEdit[0]?.body ?? "";
  expect(await readPublished(publicId)).toEqual({ text: editedText });

  await db.update(subscription).set({ status: "canceled", updatedAt: now }).where(eq(subscription.userId, "user_paid"));
  expect(await readPublished(publicId)).toEqual({ text: editedText });
  const refused = await publish("user_paid", {
    kind: "privacy",
    answers: { ...answers, businessName: "Replacement Co" },
  });
  expect(refused).toEqual({ ok: false, error: "limit", message: "Hosting a policy is part of the paid plan." });
  const afterCancel = await db.select().from(policyDoc);
  expect(afterCancel).toHaveLength(1);
  expect(afterCancel[0]?.body).toBe(editedText);
  expect(afterCancel[0]?.updatedAt.getTime()).toBe(afterEdit[0]?.updatedAt.getTime());
  expect(await readPublished(publicId)).toEqual({ text: editedText });
});

test("two publishes of a new policy keep the same public id", async () => {
  await database();
  await seedUser("user_race", true);
  const raw = {
    kind: "cookie",
    answers: {
      businessName: "Cedar Shop",
      contactEmail: "shop@cedar.example",
      website: "https://cedar.example",
      jurisdiction: "US",
      cookieName: "cart_id",
      purpose: "to keep the shopping cart",
      duration: "14 days",
    },
  };
  const [first, second] = await Promise.all([publish("user_race", raw), publish("user_race", raw)]);
  const publicId = publishedId(first);
  expect(publicId).toMatch(/^[0-9a-f]{32}$/);
  expect(publicId).not.toBe(unsaltedPublicId("user_race", "cookie"));
  expect(first).toEqual({ ok: true, publicId, path: `/p/${publicId}` });
  expect(second).toEqual({ ok: true, publicId, path: `/p/${publicId}` });
  const db = await getDb();
  const rows = await db.select().from(policyDoc);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.id).toBe(publicId);
  expect(rows[0]?.publicId).toBe(publicId);
});
