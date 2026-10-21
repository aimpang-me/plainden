import { is, sql, SQL } from "drizzle-orm";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { tables } from "../../db/schema";
import { dataPreset } from "../../tools/data/schema";

const dialect = new PgDialect();

function quote(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function defaultSql(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (is(value, SQL)) return dialect.sqlToQuery(value).sql;
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return undefined;
}

export function createTableSql(table: PgTable): string {
  const config = getTableConfig(table);
  const columns = config.columns.map((column) => {
    const parts = [quote(column.name), column.getSQLType()];
    if (column.primary) parts.push("PRIMARY KEY");
    if (column.notNull && !column.primary) parts.push("NOT NULL");
    if (column.isUnique) parts.push("UNIQUE");
    const fallback = defaultSql(column.default);
    if (fallback) parts.push(`DEFAULT ${fallback}`);
    return parts.join(" ");
  });
  const foreignKeys = config.foreignKeys.map((key) => {
    const reference = key.reference();
    const columnsSql = reference.columns.map((column) => quote(column.name)).join(", ");
    const target = getTableConfig(reference.foreignTable);
    const targetColumns = reference.foreignColumns.map((column) => quote(column.name)).join(", ");
    const onDelete = key.onDelete ? ` ON DELETE ${key.onDelete}` : "";
    return `CONSTRAINT ${quote(key.getName())} FOREIGN KEY (${columnsSql}) REFERENCES ${quote(target.name)} (${targetColumns})${onDelete}`;
  });
  const uniques = config.uniqueConstraints.map((constraint) => {
    const columnsSql = constraint.columns.map((column) => quote(column.name)).join(", ");
    const name = constraint.name ?? `${config.name}_${constraint.columns.map((column) => column.name).join("_")}_unique`;
    return `CONSTRAINT ${quote(name)} UNIQUE (${columnsSql})`;
  });
  const checks = config.checks.map((item) => {
    const expression = dialect.sqlToQuery(item.value).sql;
    return `CONSTRAINT ${quote(item.name)} CHECK (${expression})`;
  });
  const body = [...columns, ...foreignKeys, ...uniques, ...checks].join(", ");
  return `CREATE TABLE IF NOT EXISTS ${quote(config.name)} (${body})`;
}

export async function applySchema(db: { execute: (query: SQL) => Promise<unknown> }): Promise<void> {
  for (const table of [...tables, dataPreset]) {
    await db.execute(sql.raw(createTableSql(table)));
  }
  await db.execute(sql.raw(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "providerCustomerId" text`));
  await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS "user_providerCustomerId_unique" ON "user" ("providerCustomerId")`));
  await db.execute(sql.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'stripeCustomerId'
      ) THEN
        ALTER TABLE "subscriptions" RENAME COLUMN "stripeCustomerId" TO "providerCustomerId";
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'stripeSubscriptionId'
      ) THEN
        ALTER TABLE "subscriptions" RENAME COLUMN "stripeSubscriptionId" TO "providerSubscriptionId";
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'stripeEventCreated'
      ) THEN
        ALTER TABLE "subscriptions" RENAME COLUMN "stripeEventCreated" TO "providerEventAt";
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'providerEventAt' AND data_type = 'integer'
      ) THEN
        ALTER TABLE "subscriptions"
          ALTER COLUMN "providerEventAt" TYPE timestamp with time zone
          USING to_timestamp("providerEventAt");
      END IF;
    END $$;
  `));
}
