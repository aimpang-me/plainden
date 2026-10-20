import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { schema } from "../../db/schema";
import { applySchema } from "./apply";

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

const cache = new Map<string, Promise<AppDatabase>>();

export async function openDatabase(dataDir: string): Promise<AppDatabase> {
  const client = dataDir === "memory" ? new PGlite() : new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await applySchema(db);
  return db;
}

export function getDb(): Promise<AppDatabase> {
  const dataDir = process.env.PGLITE_DATA_DIR ?? ".data/pglite";
  const existing = cache.get(dataDir);
  if (existing) return existing;
  const opening = openDatabase(dataDir);
  cache.set(dataDir, opening);
  return opening;
}
