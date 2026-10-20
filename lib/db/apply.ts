import { is, sql, SQL } from "drizzle-orm";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { tables } from "../../db/schema";

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
  for (const table of tables) {
    await db.execute(sql.raw(createTableSql(table)));
  }
  await db.execute(sql.raw(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripeEventCreated" integer`));
}
