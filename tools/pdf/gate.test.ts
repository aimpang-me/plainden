import { expect, test } from "vitest";
import { gatePdf, memoryStore, operationsUsed, pageNote, recordOperation } from "./gate";

const mb = 1024 * 1024;

test("free and paid pdf limits", () => {
  expect(gatePdf("free", 25 * mb, 1)).toEqual({ ok: true });
  expect(gatePdf("free", 25 * mb + 1, 1)).toEqual({
    ok: false,
    plan: "free",
    kind: "fileSize",
    limit: 25 * mb,
    reason: "free fileSize allows 26214400",
  });
  expect(gatePdf("free", 1024, 5)).toEqual({ ok: true });
  expect(gatePdf("free", 1024, 6)).toEqual({
    ok: false,
    plan: "free",
    kind: "perDay",
    limit: 5,
    reason: "free perDay allows 5",
  });
  expect(gatePdf("paid", 200 * mb, 40)).toEqual({ ok: true });
  expect(gatePdf("paid", 200 * mb + 1, 1)).toEqual({
    ok: false,
    plan: "paid",
    kind: "fileSize",
    limit: 200 * mb,
    reason: "paid fileSize allows 209715200",
  });
});

test("day counter resets on the next UTC day", () => {
  const store = memoryStore();
  const monday = new Date("2026-10-19T23:00:00.000Z");
  const tuesday = new Date("2026-10-20T00:10:00.000Z");
  expect(recordOperation(store, monday)).toBe(1);
  expect(recordOperation(store, monday)).toBe(2);
  expect(operationsUsed(store, monday)).toBe(2);
  expect(operationsUsed(store, tuesday)).toBe(0);
  expect(recordOperation(store, tuesday)).toBe(1);
  store.setItem("plainden-pdf-day", "not json");
  expect(operationsUsed(store, tuesday)).toBe(0);
});

test("4mb page says up to and does not promise a file size", () => {
  const note = pageNote("compress-pdf-to-4mb", "4mb");
  expect(note).toBe("Photo compression aims for up to 4 MB. It does not promise a 4 MB file.");
  expect(pageNote("compress-pdf", undefined)).toBeNull();
  expect(pageNote("split-pdf-pages", "1")).toBe("The range starts at page 1. Leave it blank to split every page.");
});
