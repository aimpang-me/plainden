import { expect, test } from "vitest";
import { getDb } from "./client";

test("production refuses to open a database when DATABASE_URL is missing", () => {
  const env = process.env as Record<string, string | undefined>;
  const previousEnv = env.NODE_ENV;
  const previousPhase = env.NEXT_PHASE;
  const previousUrl = env.DATABASE_URL;
  const previousDir = env.PGLITE_DATA_DIR;
  env.NODE_ENV = "production";
  delete env.NEXT_PHASE;
  delete env.DATABASE_URL;
  env.PGLITE_DATA_DIR = "/tmp/plainden-should-not-open";
  expect(() => getDb()).toThrow("DATABASE_URL is required in production");
  if (previousEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = previousEnv;
  if (previousPhase === undefined) delete env.NEXT_PHASE;
  else env.NEXT_PHASE = previousPhase;
  if (previousUrl === undefined) delete env.DATABASE_URL;
  else env.DATABASE_URL = previousUrl;
  if (previousDir === undefined) delete env.PGLITE_DATA_DIR;
  else env.PGLITE_DATA_DIR = previousDir;
});
