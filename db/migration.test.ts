import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "vitest";

const migrationDir = path.join(process.cwd(), "db/migrations");

test("the generated migration applies on PGlite and stores a data preset", async () => {
  const files = readdirSync(migrationDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  expect(files).toEqual(["0000_initial.sql", "0001_paddle_provider.sql"]);
  const client = new PGlite();
  try {
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
    const tables = await client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const names = tables.rows.map((row) => row.table_name);
    expect(names).toContain("data_presets");
    expect(names).toContain("policy_docs");
    expect(names).toContain("processed_events");
    const columns = await client.query<{ column_name: string; data_type: string }>(
      `select column_name, data_type from information_schema.columns where table_name = 'subscriptions'`,
    );
    const subscriptionColumns = new Map(columns.rows.map((row) => [row.column_name, row.data_type]));
    expect(subscriptionColumns.get("providerEventAt")).toBe("timestamp with time zone");
    expect(subscriptionColumns.has("stripeEventCreated")).toBe(false);
    const now = "2026-10-20T00:00:00.000Z";
    await client.query(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, $4, $5, $6)`,
      ["user_1", "Ada", "ada@example.com", true, now, now],
    );
    await client.query(
      `insert into "data_presets" ("id", "userId", "name", "options", "createdAt", "updatedAt") values ($1, $2, $3, $4::jsonb, $5, $6)`,
      ["preset_1", "user_1", "Europe", JSON.stringify({ delimiter: ",", jsonShape: "objects", sheet: "first" }), now, now],
    );
    const stored = await client.query<{ name: string }>(`select "name" from "data_presets"`);
    expect(stored.rows).toEqual([{ name: "Europe" }]);
  } finally {
    await client.close();
  }
});
