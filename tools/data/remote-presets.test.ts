import { expect, test } from "vitest";
import { defaultOptions } from "./convert";
import { presetsFromApi, readRemotePresets } from "./remote-presets";

test("a paid preset list falls back when the api is down", async () => {
  expect(presetsFromApi({ presets: [{ name: "Europe", options: defaultOptions }] })).toEqual([
    { name: "Europe", options: defaultOptions },
  ]);
  expect(presetsFromApi({ presets: [{ name: "", options: defaultOptions }] })).toBeNull();
  const result = await readRemotePresets(async () => {
    throw new Error("offline");
  });
  expect(result).toEqual({ ok: false, fallback: true });
});
