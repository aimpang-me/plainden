import { LimitKind } from "../../lib/contract/limits";
import type { LimitDecision } from "../../lib/contract/types";
import { decideLimit } from "../../lib/entitlements/decide-limit";
import { config } from "./config";

export type DayStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const dayKey = "plainden-pdf-day";

type StoredDay = { day: string; count: number };

export function dayStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function parseStoredDay(raw: string, today: string): StoredDay {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { day: today, count: 0 };
  }
  if (typeof parsed !== "object" || parsed === null) return { day: today, count: 0 };
  if (!("day" in parsed) || !("count" in parsed)) return { day: today, count: 0 };
  const day = parsed.day;
  const count = parsed.count;
  if (typeof day !== "string" || typeof count !== "number") return { day: today, count: 0 };
  if (day !== today || !Number.isInteger(count) || count < 0) return { day: today, count: 0 };
  return { day, count };
}

export function operationsUsed(store: DayStore, now: Date): number {
  const raw = store.getItem(dayKey);
  if (raw === null) return 0;
  return parseStoredDay(raw, dayStamp(now)).count;
}

export function recordOperation(store: DayStore, now: Date): number {
  const today = dayStamp(now);
  const raw = store.getItem(dayKey);
  const current = raw === null ? { day: today, count: 0 } : parseStoredDay(raw, today);
  const next = current.count + 1;
  store.setItem(dayKey, JSON.stringify({ day: today, count: next }));
  return next;
}

export function memoryStore(): DayStore {
  const data = new Map<string, string>();
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

export function gatePdf(plan: "free" | "paid", totalBytes: number, nextCount: number): LimitDecision {
  const size = decideLimit({
    plan,
    limits: config.limits,
    kind: LimitKind.fileSize,
    amount: totalBytes,
  });
  if (!size.ok) return size;
  return decideLimit({
    plan,
    limits: config.limits,
    kind: LimitKind.perDay,
    amount: nextCount,
  });
}

const notes: Record<string, string> = {
  "4mb": "Photo compression aims for up to 4 MB. It does not promise a 4 MB file.",
  two: "Add at least two PDF files. The merge keeps the order you added.",
  "1": "The range starts at page 1. Leave it blank to split every page.",
  photos: "Add one or more JPG files. Each image becomes a page.",
  scans: "Only JPEG photos inside the PDF are recompressed.",
};

export function pageNote(slug: string, preset: string | undefined): string | null {
  if (slug === "compress-pdf-to-4mb" || preset === "4mb") return notes["4mb"] ?? null;
  if (!preset) return null;
  return notes[preset] ?? null;
}
