import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { expect, test } from "vitest";
import { applySchema } from "../lib/db/apply";

const migrationDir = path.join(process.cwd(), "db/migrations");

test("every migration journal entry has a drizzle snapshot", () => {
  const journal = JSON.parse(readFileSync(path.join(migrationDir, "meta/_journal.json"), "utf8")) as {
    entries: { idx: number; tag: string }[];
  };
  expect(journal.entries.map((entry) => existsSync(path.join(migrationDir, "meta", `${String(entry.idx).padStart(4, "0")}_snapshot.json`)))).toEqual(
    journal.entries.map(() => true),
  );
});

test("the generated migration applies on PGlite and stores a data preset", async () => {
  const files = readdirSync(migrationDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  expect(files).toEqual([
    "0000_initial.sql",
    "0001_paddle_provider.sql",
    "0002_cancel_at.sql",
    "0003_checkout_intents.sql",
    "0004_checkout_intent_user.sql",
  ]);
  const client = new PGlite();
  try {
    await applySqlFiles(client, files.slice(0, 4));
    const now = "2026-10-20T00:00:00.000Z";
    await client.query(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, $4, $5, $6)`,
      ["user_1", "Ada", "ada@example.com", true, now, now],
    );
    await client.query(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, $4, $5, $6)`,
      ["user_2", "Bea", "bea@example.com", true, now, now],
    );
    await client.query(
      `insert into "checkout_intents" ("id", "userId", "priceLookupKey", "transactionId", "createdAt", "expiresAt") values
        ('intent_plain', 'user_1', 'plainden_pdf_year', null, $1, '2026-10-21T00:00:00.000Z'),
        ('intent_open', 'user_1', 'plainden_pdf_month', 'txn_keep', $1, '2026-10-20T00:00:00.000Z'),
        ('intent_early', 'user_2', 'plainden_pdf_month', null, $1, '2026-10-20T00:00:00.000Z'),
        ('intent_late', 'user_2', 'plainden_pdf_year', null, $1, '2026-10-22T00:00:00.000Z')`,
      [now],
    );
    await applySqlFiles(client, files.slice(4));
    const tables = await client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const names = tables.rows.map((row) => row.table_name);
    expect(names).toContain("data_presets");
    expect(names).toContain("policy_docs");
    expect(names).toContain("processed_events");
    expect(names).toContain("checkout_intents");
    const columns = await client.query<{ column_name: string; data_type: string }>(
      `select column_name, data_type from information_schema.columns where table_name = 'subscriptions'`,
    );
    const subscriptionColumns = new Map(columns.rows.map((row) => [row.column_name, row.data_type]));
    expect(subscriptionColumns.get("providerEventAt")).toBe("timestamp with time zone");
    expect(subscriptionColumns.get("cancelAt")).toBe("timestamp with time zone");
    expect(subscriptionColumns.has("stripeEventCreated")).toBe(false);
    await client.query(
      `insert into "data_presets" ("id", "userId", "name", "options", "createdAt", "updatedAt") values ($1, $2, $3, $4::jsonb, $5, $6)`,
      ["preset_1", "user_1", "Europe", JSON.stringify({ delimiter: ",", jsonShape: "objects", sheet: "first" }), now, now],
    );
    const stored = await client.query<{ name: string }>(`select "name" from "data_presets"`);
    expect(stored.rows).toEqual([{ name: "Europe" }]);
    const intents = await client.query<{ id: string; transactionId: string | null }>(
      `select "id", "transactionId" from "checkout_intents" order by "id"`,
    );
    expect(intents.rows).toEqual([
      { id: "intent_late", transactionId: null },
      { id: "intent_open", transactionId: "txn_keep" },
    ]);
    await expect(
      client.query(
        `insert into "checkout_intents" ("id", "userId", "priceLookupKey", "createdAt", "expiresAt") values ($1, $2, $3, $4, $5)`,
        ["intent_2", "user_1", "plainden_pdf_month", now, now],
      ),
    ).rejects.toThrow("duplicate key");
    await expect(
      client.query(
        `insert into "checkout_intents" ("id", "userId", "priceLookupKey", "createdAt", "expiresAt") values ($1, $2, $3, $4, $5)`,
        ["intent_year", "user_1", "plainden_pdf_year", now, now],
      ),
    ).rejects.toThrow("duplicate key");
  } finally {
    await client.close();
  }
});

test("connect-time schema keeps one checkout per user when older rows share a user", async () => {
  const files = readdirSync(migrationDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const client = new PGlite();
  try {
    await applySqlFiles(client, files.slice(0, 4));
    const now = "2026-10-20T00:00:00.000Z";
    await client.query(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, $4, $5, $6)`,
      ["user_1", "Ada", "ada@example.com", true, now, now],
    );
    await client.query(
      `insert into "checkout_intents" ("id", "userId", "priceLookupKey", "transactionId", "createdAt", "expiresAt") values
        ('intent_plain', 'user_1', 'plainden_pdf_year', null, $1, '2026-10-21T00:00:00.000Z'),
        ('intent_open', 'user_1', 'plainden_pdf_month', 'txn_keep', $1, '2026-10-20T00:00:00.000Z')`,
      [now],
    );
    const db = drizzle(client);
    await Promise.all([applySchema(db), applySchema(db)]);
    const intents = await client.query<{ id: string; transactionId: string | null }>(
      `select "id", "transactionId" from "checkout_intents"`,
    );
    expect(intents.rows).toEqual([{ id: "intent_open", transactionId: "txn_keep" }]);
    await expect(
      client.query(
        `insert into "checkout_intents" ("id", "userId", "priceLookupKey", "createdAt", "expiresAt") values ($1, $2, $3, $4, $5)`,
        ["intent_again", "user_1", "plainden_pdf_year", now, now],
      ),
    ).rejects.toThrow("duplicate key");
    await applySchema(db);
  } finally {
    await client.close();
  }
});

async function applySqlFiles(client: PGlite, files: string[]) {
  for (const file of files) {
    const sqlText = readFileSync(path.join(migrationDir, file), "utf8");
    const statements = sqlText
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);
    for (const statement of statements) {
      await client.exec(statement);
    }
  }
}
