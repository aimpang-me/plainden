import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, expect, test } from "vitest";
import { qrCode, subscription, user } from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { GET } from "@/app/q/[id]/route";
import { parseCommand } from "./contract";
import { handle, recordScan } from "./saved";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function freshDb() {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-qr-"));
  dirs.push(dir);
  process.env.PGLITE_DATA_DIR = dir;
  return getDb();
}

const now = new Date("2026-10-20T00:00:00.000Z");

async function addUser(id: string, email: string, plan: "active" | "canceled" | "none") {
  const db = await getDb();
  await db.insert(user).values({
    id,
    name: id,
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  if (plan === "none") return;
  await db.insert(subscription).values({
    id: `sub_${id}`,
    userId: id,
    entitlementKey: "qr",
    status: plan,
    priceLookupKey: "plainden_qr_month",
    createdAt: now,
    updatedAt: now,
  });
}

function publishCommand(targetUrl: string) {
  const parsed = parseCommand({ type: "publish", targetUrl, logo: null });
  if (!parsed.ok || parsed.command.type !== "publish") throw new Error("expected a publish command");
  return parsed.command;
}

test("a signed-out publish is refused and does not insert a row", async () => {
  const db = await freshDb();
  const result = await handle(null, publishCommand("https://example.com/landed"));
  expect(result).toEqual({
    ok: false,
    code: "signed-out",
    reason: "Sign in to publish a dynamic code.",
  });
  expect(await db.select().from(qrCode)).toEqual([]);
});

test("a free user cannot publish and a paid user can", async () => {
  await freshDb();
  await addUser("user_free", "free@example.com", "none");
  await addUser("user_paid", "paid@example.com", "active");

  const blocked = await handle({ id: "user_free" }, publishCommand("https://example.com/free"));
  expect(blocked).toEqual({ ok: false, code: "over-cap", reason: "free savedItems allows 0" });

  const published = await handle({ id: "user_paid" }, publishCommand("https://example.com/landed"));
  expect(published.ok).toBe(true);
  if (!published.ok || published.type !== "publish") throw new Error("expected a published code");
  expect(published.code.targetUrl).toBe("https://example.com/landed");
  expect(published.code.scanCount).toBe(0);
  expect(published.code.shortPath).toBe(`/q/${published.code.id}`);
  expect(published.code.logo).toBe(null);
});

test("twenty publishes through the handler stay under the paid cap", async () => {
  await freshDb();
  await addUser("user_many", "many@example.com", "active");
  for (let index = 0; index < 20; index += 1) {
    const published = await handle({ id: "user_many" }, publishCommand(`https://example.com/${index}`));
    expect(published.ok, `publish ${index} ${JSON.stringify(published)}`).toBe(true);
  }
  const extra = await handle({ id: "user_many" }, publishCommand("https://example.com/extra"));
  expect(extra).toEqual({ ok: false, code: "over-cap", reason: "paid savedItems allows 20" });
});

test("the 21st code is refused and an edit at the cap still saves", async () => {
  const db = await freshDb();
  await addUser("user_full", "full@example.com", "active");
  for (let index = 0; index < 20; index += 1) {
    await db.insert(qrCode).values({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      userId: "user_full",
      targetUrl: `https://example.com/${index}`,
      createdAt: now,
    });
  }
  const blocked = await handle({ id: "user_full" }, publishCommand("https://example.com/extra"));
  expect(blocked).toEqual({ ok: false, code: "over-cap", reason: "paid savedItems allows 20" });

  const parsed = parseCommand({
    type: "replace",
    id: "00000000-0000-4000-8000-000000000000",
    targetUrl: "https://example.com/edited",
    logo: null,
  });
  if (!parsed.ok) throw new Error("expected a replace command");
  const edited = await handle({ id: "user_full" }, parsed.command);
  expect(edited.ok).toBe(true);
  if (!edited.ok || edited.type !== "replace") throw new Error("expected a replaced code");
  expect(edited.code.targetUrl).toBe("https://example.com/edited");
  expect(edited.code.scanCount).toBe(0);
});

test("a lapsed plan cannot edit and the redirect still counts scans", async () => {
  const db = await freshDb();
  await addUser("user_old", "old@example.com", "canceled");
  const id = "11111111-1111-4111-8111-111111111111";
  await db.insert(qrCode).values({
    id,
    userId: "user_old",
    targetUrl: "https://example.com/landed",
    createdAt: now,
  });

  const parsed = parseCommand({
    type: "replace",
    id,
    targetUrl: "https://example.com/changed",
    logo: null,
  });
  if (!parsed.ok) throw new Error("expected a replace command");
  expect(await handle({ id: "user_old" }, parsed.command)).toEqual({
    ok: false,
    code: "over-cap",
    reason: "free savedItems allows 0",
  });

  const first = await GET(new Request("http://127.0.0.1/q/" + id), { params: Promise.resolve({ id }) });
  expect(first.status).toBe(302);
  expect(first.headers.get("location")).toBe("https://example.com/landed");
  expect(first.headers.get("cache-control")).toBe("no-store");
  expect(first.headers.get("x-plainden-scans")).toBe("1");

  const second = await recordScan(id);
  expect(second).toEqual({ ok: true, targetUrl: "https://example.com/landed", scanCount: 2 });
  const stored = await db.select({ scanCount: qrCode.scanCount, targetUrl: qrCode.targetUrl }).from(qrCode).where(eq(qrCode.id, id));
  expect(stored).toEqual([{ scanCount: 2, targetUrl: "https://example.com/landed" }]);
});

test("a javascript target does not redirect and does not count a scan", async () => {
  const db = await freshDb();
  await addUser("user_bad", "bad@example.com", "active");
  const id = "22222222-2222-4222-8222-222222222222";
  await db.insert(qrCode).values({
    id,
    userId: "user_bad",
    targetUrl: "javascript:alert(1)",
    createdAt: now,
  });
  const response = await GET(new Request(`http://127.0.0.1/q/${id}`), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(404);
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("cache-control")).toBe("no-store");
  const stored = await db.select({ scanCount: qrCode.scanCount }).from(qrCode).where(eq(qrCode.id, id));
  expect(stored).toEqual([{ scanCount: 0 }]);
});

test("a missing code is a 404 and a second remove still succeeds", async () => {
  await freshDb();
  await addUser("user_paid", "paid2@example.com", "active");
  const missing = await GET(new Request("http://127.0.0.1/q/missing"), {
    params: Promise.resolve({ id: "nope" }),
  });
  expect(missing.status).toBe(404);
  expect(missing.headers.get("cache-control")).toBe("no-store");

  const published = await handle({ id: "user_paid" }, publishCommand("https://example.com/gone"));
  if (!published.ok || published.type !== "publish") throw new Error("expected a published code");
  const command = parseCommand({ type: "remove", id: published.code.id });
  if (!command.ok) throw new Error("expected a remove command");
  expect(await handle({ id: "user_paid" }, command.command)).toEqual({ ok: true, type: "remove" });
  expect(await handle({ id: "user_paid" }, command.command)).toEqual({ ok: true, type: "remove" });
  expect(await recordScan(published.code.id)).toEqual({ ok: false });
});
