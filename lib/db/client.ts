import { mkdir } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { schema } from "../../db/schema";
import { isProductionRuntime } from "../runtime";
import { applySchema } from "./apply";

export type AppDatabase = PgliteDatabase<typeof schema> | NeonHttpDatabase<typeof schema>;

type DbCache = Map<string, Promise<AppDatabase>>;

const processCaches = globalThis as typeof globalThis & {
  __plaindenPglite?: DbCache;
  __plaindenNeon?: DbCache;
};

function pgliteCache(): DbCache {
  processCaches.__plaindenPglite ??= new Map();
  return processCaches.__plaindenPglite;
}

function neonCache(): DbCache {
  processCaches.__plaindenNeon ??= new Map();
  return processCaches.__plaindenNeon;
}

export async function openDatabase(dataDir: string): Promise<AppDatabase> {
  if (dataDir !== "memory") await mkdir(dataDir, { recursive: true });
  const client = dataDir === "memory" ? new PGlite() : new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  await applySchema(db);
  return db;
}

export async function openNeon(databaseUrl: string): Promise<AppDatabase> {
  const db = drizzleNeon(neon(databaseUrl), { schema });
  await applySchema(db);
  return db;
}

export function getDb(): Promise<AppDatabase> {
  if (isProductionRuntime()) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required in production");
    return cached(neonCache(), databaseUrl, () => openNeon(databaseUrl));
  }
  const dataDir = process.env.PGLITE_DATA_DIR;
  if (dataDir) return cached(pgliteCache(), dataDir, () => openDatabase(dataDir));
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) return cached(neonCache(), databaseUrl, () => openNeon(databaseUrl));
  return cached(pgliteCache(), ".data/pglite", () => openDatabase(".data/pglite"));
}

function cached(
  cache: Map<string, Promise<AppDatabase>>,
  key: string,
  open: () => Promise<AppDatabase>,
): Promise<AppDatabase> {
  const existing = cache.get(key);
  if (existing) return existing;
  const opening = open().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, opening);
  return opening;
}
