import { expect, test } from "vitest";
import { addMonthCount, readMonthCount, type MonthStore } from "./month-count";

function memoryStore(): MonthStore {
  const values = new Map<string, string>();
  return {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => {
      values.set(key, value);
    },
  };
}

test("invoice and receipt downloads share one monthly cap", () => {
  const store = memoryStore();
  const now = new Date("2026-10-20T00:00:00.000Z");
  expect(readMonthCount(store, now)).toBe(0);
  expect(addMonthCount(store, "invoice", now)).toBe(1);
  expect(addMonthCount(store, "receipt", now)).toBe(2);
  expect(addMonthCount(store, "invoice", now)).toBe(3);
  const nextMonth = new Date("2026-11-01T00:00:00.000Z");
  expect(readMonthCount(store, nextMonth)).toBe(0);
});
