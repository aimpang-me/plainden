export type MonthStore = {
  get(key: string): string | null;
  set(key: string, value: string): void;
};

export type ToolId = "invoice" | "receipt";

function monthKey(toolId: ToolId, now: Date): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `plainden.pdf.${toolId}.${now.getUTCFullYear()}-${month}`;
}

function readKey(store: MonthStore, key: string): number {
  const raw = store.get(key);
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return 0;
  return value;
}

export function readMonthCount(store: MonthStore, now: Date): number {
  return readKey(store, monthKey("invoice", now)) + readKey(store, monthKey("receipt", now));
}

export function addMonthCount(store: MonthStore, toolId: ToolId, now: Date): number {
  const key = monthKey(toolId, now);
  store.set(key, String(readKey(store, key) + 1));
  return readMonthCount(store, now);
}

export const localMonthStore: MonthStore = {
  get(key) {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  set(key, value) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
};
