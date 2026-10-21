import { expect, test } from "vitest";
import { trustedOriginsFor } from "./server";

test("production trusts only the configured auth origin", () => {
  const previousEnv = process.env.NODE_ENV;
  const previousPhase = process.env.NEXT_PHASE;
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "production";
  delete env.NEXT_PHASE;
  expect(trustedOriginsFor("https://plainden.com")).toEqual(["https://plainden.com"]);
  env.NODE_ENV = "test";
  env.PORT = "3100";
  expect(trustedOriginsFor("http://127.0.0.1:3100")).toEqual([
    "http://127.0.0.1:3100",
    "http://localhost:3100",
  ]);
  if (previousEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = previousEnv;
  if (previousPhase === undefined) delete env.NEXT_PHASE;
  else env.NEXT_PHASE = previousPhase;
});
