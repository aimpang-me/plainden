import type { Options } from "./convert";

export type SavedPreset = {
  name: string;
  options: Options;
};

export type PresetStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type PresetSave =
  | { ok: true; presets: readonly SavedPreset[] }
  | { ok: false; reason: string };

export const presetStorageKey = "plainden-data-presets";

const presetCap = 20;
const namePattern = /^[A-Za-z0-9][A-Za-z0-9 -]{0,39}$/;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribePresets(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function presetSnapshot(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(presetStorageKey) ?? "";
}

export function presetsFromSnapshot(raw: string): readonly SavedPreset[] {
  return parseList(raw);
}

export function memoryStore(): PresetStore {
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

export function listPresets(store: PresetStore): readonly SavedPreset[] {
  return read(store);
}

export function savePreset(store: PresetStore, name: string, options: Options): PresetSave {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, reason: "Name the preset." };
  if (!namePattern.test(trimmed)) {
    return { ok: false, reason: "Use letters, numbers, spaces, or hyphens." };
  }
  const current = read(store);
  const next = current.filter((preset) => preset.name !== trimmed);
  if (next.length >= presetCap) return { ok: false, reason: "You can save 20 presets on this device." };
  const presets = [...next, { name: trimmed, options: { ...options } }];
  store.setItem(presetStorageKey, JSON.stringify(presets));
  emit();
  return { ok: true, presets };
}

export function deletePreset(store: PresetStore, name: string): readonly SavedPreset[] {
  const presets = read(store).filter((preset) => preset.name !== name);
  store.setItem(presetStorageKey, JSON.stringify(presets));
  emit();
  return presets;
}

function read(store: PresetStore): SavedPreset[] {
  const raw = store.getItem(presetStorageKey);
  return parseList(raw ?? "");
}

function parseList(raw: string): SavedPreset[] {
  if (raw.length === 0) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const presets: SavedPreset[] = [];
  for (const item of parsed) {
    const preset = parsePreset(item);
    if (preset) presets.push(preset);
  }
  return presets;
}

function parsePreset(value: unknown): SavedPreset | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("name" in value) || !("options" in value)) return null;
  if (typeof value.name !== "string" || !namePattern.test(value.name)) return null;
  const options = parseOptions(value.options);
  if (!options) return null;
  return { name: value.name, options };
}

function parseOptions(value: unknown): Options | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("delimiter" in value) || !("jsonShape" in value) || !("sheet" in value)) return null;
  const delimiter = value.delimiter;
  const jsonShape = value.jsonShape;
  const sheet = value.sheet;
  if (delimiter !== "," && delimiter !== ";" && delimiter !== "\t") return null;
  if (jsonShape !== "objects" && jsonShape !== "rows") return null;
  if (sheet !== "first" && sheet !== "all") return null;
  return { delimiter, jsonShape, sheet };
}
