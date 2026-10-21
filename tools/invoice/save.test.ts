import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { savedInvoice, subscription, user } from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { draftFromIssued, issue, openInvoice, view } from "./document";
import { deleteDocument, listDocuments, readDocument, saveDocument } from "./save";

const dirs: string[] = [];
const now = new Date("2026-10-20T12:00:00.000Z");
const id = "11111111-1111-4111-8111-111111111111";

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function database(): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-invoice-"));
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
    entitlementKey: "invoice",
    status: "active",
    priceLookupKey: "plainden_invoice_month",
    createdAt: now,
    updatedAt: now,
  });
}

function document() {
  const issued = issue(
    openInvoice(
      {
        from: { name: "Northwind Studio" },
        to: { name: "Harbour Co" },
        number: "CA-1001",
        currency: "USD",
        taxPercent: "0",
        lines: [{ description: "Consulting", quantity: "2", unitPrice: "10.00" }],
      },
      now,
    ),
  );
  if (!issued.ok) throw new Error("sample invoice did not issue");
  return issued.issued;
}

test("a free user cannot save an invoice", async () => {
  await database();
  await seedUser("user_free", false);
  const result = await saveDocument("user_free", { id, document: document() });
  expect(result).toEqual({ ok: false, error: "limit", message: "Saving invoices is part of the paid plan." });
});

test("a paid user saves and reloads the same total", async () => {
  await database();
  await seedUser("user_paid", true);
  const body = document();
  const saved = await saveDocument("user_paid", { id, document: body });
  expect(saved).toEqual({ ok: true, id });
  const loaded = await readDocument("user_paid", id);
  expect(loaded?.number).toBe("CA-1001");
  if (!loaded) return;
  expect(view(draftFromIssued(loaded), "paid").total).toBe("$20.00");
  expect(await listDocuments("user_paid", "invoice")).toHaveLength(1);
  expect(await listDocuments("user_paid", "receipt")).toHaveLength(0);
  const db = await getDb();
  const before = await db.select().from(savedInvoice);
  const again = await saveDocument("user_paid", { id, document: body });
  expect(again).toEqual({ ok: true, id });
  const after = await db.select().from(savedInvoice);
  expect(after).toHaveLength(1);
  expect(after[0]?.updatedAt.getTime()).toBe(before[0]?.updatedAt.getTime());
  await deleteDocument("user_paid", id);
  expect(await readDocument("user_paid", id)).toBeNull();
});

test("a save for someone else's id is hidden", async () => {
  await database();
  await seedUser("user_paid", true);
  await seedUser("user_other", true);
  await saveDocument("user_paid", { id, document: document() });
  const result = await saveDocument("user_other", { id, document: document() });
  expect(result).toEqual({ ok: false, error: "not-found", message: "Document not found." });
  expect(await readDocument("user_other", id)).toBeNull();
});
