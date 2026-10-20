import { expect, test } from "vitest";
import { serverClientEnvHits, topLevelEnvLines } from "../../scripts/check-lazy-env";

test("a top level env read is reported and a read inside a function is not", () => {
  const source = [
    "const leaked = process.env.PORT",
    "export function getDb() {",
    "  return process.env.PGLITE_DATA_DIR",
    "}",
  ].join("\n");
  expect(topLevelEnvLines(source)).toEqual([1]);
});

test("server clients do not read env at import time", () => {
  expect(serverClientEnvHits()).toEqual([]);
});
