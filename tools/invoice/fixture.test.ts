import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { draftFromIssued, parseIssued, view } from "./document";

test("the sample invoice fixture reloads to CA$210.00", () => {
  const raw = readFileSync(path.join(import.meta.dirname, "fixtures", "sample-invoice.json"), "utf8");
  const parsed = parseIssued(JSON.parse(raw));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(view(draftFromIssued(parsed.issued), "free").total).toBe("CA$210.00");
  expect(view(draftFromIssued(parsed.issued), "free").footer).toBe("made with plainden");
});
