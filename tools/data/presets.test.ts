import { expect, test } from "vitest";
import { defaultOptions, type Options } from "./convert";
import { deletePreset, listPresets, memoryStore, presetStorageKey, savePreset } from "./presets";

const europe: Options = { delimiter: ";", jsonShape: "objects", sheet: "first" };

test("a named preset round trips through the store", () => {
  const store = memoryStore();
  expect(listPresets(store)).toEqual([]);
  const saved = savePreset(store, " Europe ", europe);
  expect(saved).toEqual({
    ok: true,
    presets: [{ name: "Europe", options: europe }],
  });
  expect(listPresets(store)).toEqual([{ name: "Europe", options: europe }]);
  const replaced = savePreset(store, "Europe", { ...europe, delimiter: "\t" });
  expect(replaced).toEqual({
    ok: true,
    presets: [{ name: "Europe", options: { ...europe, delimiter: "\t" } }],
  });
  expect(deletePreset(store, "Europe")).toEqual([]);
  expect(listPresets(store)).toEqual([]);
});

test("bad names, a full list, and corrupt storage stay closed", () => {
  const store = memoryStore();
  expect(savePreset(store, "   ", defaultOptions)).toEqual({ ok: false, reason: "Name the preset." });
  expect(savePreset(store, "euro/export", defaultOptions)).toEqual({
    ok: false,
    reason: "Use letters, numbers, spaces, or hyphens.",
  });
  for (let index = 0; index < 20; index += 1) {
    const saved = savePreset(store, `Preset ${index}`, defaultOptions);
    expect(saved.ok).toBe(true);
  }
  expect(savePreset(store, "One more", defaultOptions)).toEqual({
    ok: false,
    reason: "You can save 20 presets on this device.",
  });
  store.setItem(presetStorageKey, "{");
  expect(listPresets(store)).toEqual([]);
  store.setItem(presetStorageKey, JSON.stringify([{ name: "Europe", options: { delimiter: "|" } }]));
  expect(listPresets(store)).toEqual([]);
});
